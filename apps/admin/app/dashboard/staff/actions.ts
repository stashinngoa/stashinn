'use server';

import { createClient, createAdminClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { INVITE_LINK_TTL_MS, isAdminRole, roleInfo, type AccountStatus, type AdminRole } from './roles';

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

/** Current user, and whether they may manage staff (superadmin only). */
async function getActor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isSuperadmin: false };
  const { data: me } = await supabase.from('users').select('role, admin_role').eq('id', user.id).single();
  return { supabase, user, isSuperadmin: me?.role === 'admin' && me?.admin_role === 'superadmin' };
}

async function countSuperadmins(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('admin_role', 'superadmin');
  return count ?? 0;
}

async function audit(supabase: Awaited<ReturnType<typeof createClient>>, actorId: string, action: string, entityId: string, oldValues: object | null, newValues: object) {
  await supabase.from('audit_logs').insert({
    user_id: actorId,
    action,
    entity_type: 'users',
    entity_id: entityId,
    old_values: oldValues,
    new_values: newValues,
  });
}

export async function getStaff() {
  const { supabase, user, isSuperadmin } = await getActor();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone, admin_role, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: true });

  // Account status lives on the auth account, which needs the service role key to read
  const statuses = new Map<string, { status: AccountStatus; linkSentAt: string | null }>();
  if (isSuperadmin && data?.length && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const accounts = await Promise.all(data.map(s => admin.auth.admin.getUserById(s.id)));
    accounts.forEach(({ data: acc }) => {
      if (acc?.user) statuses.set(acc.user.id, accountStatus(acc.user));
    });
  }

  return {
    staff: (data || []).map(s => ({
      ...s,
      status: statuses.get(s.id)?.status ?? ('active' as AccountStatus),
      link_sent_at: statuses.get(s.id)?.linkSentAt ?? null,
    })),
    error: error?.message,
    currentUserId: user?.id ?? null,
    canManage: isSuperadmin,
  };
}

/**
 * An invited account is pending until the person has set a password on /auth/accept-invite
 * (which sets user_metadata.onboarded). Opening the link alone counts as a sign-in, so
 * last_sign_in_at isn't enough on its own.
 */
type AuthAccount = { invited_at?: string; recovery_sent_at?: string; last_sign_in_at?: string; user_metadata?: Record<string, unknown> };

function isInvitePending(u: AuthAccount) {
  return !!u.invited_at && (!u.last_sign_in_at || !u.user_metadata?.onboarded);
}

/** Active once set up; otherwise pending until the latest invite / set-password link expires. */
function accountStatus(u: AuthAccount): { status: AccountStatus; linkSentAt: string | null } {
  if (!isInvitePending(u)) return { status: 'active', linkSentAt: null };
  const sent = [u.invited_at, u.recovery_sent_at].filter(Boolean).map(d => new Date(d!).getTime());
  const latest = sent.length ? Math.max(...sent) : 0;
  return {
    status: Date.now() - latest > INVITE_LINK_TTL_MS ? 'expired' : 'pending',
    linkSentAt: latest ? new Date(latest).toISOString() : null,
  };
}

/** Re-sends the set-up email to a staff member who hasn't finished accepting their invite. */
export async function resendInvite(userId: string): Promise<ActionResult> {
  const { supabase, user, isSuperadmin } = await getActor();
  if (!user || !isSuperadmin) return fail('Only superadmins can resend invites.');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return fail('Resending invites needs SUPABASE_SERVICE_ROLE_KEY on the server.');

  const admin = createAdminClient();
  const { data: acc, error: lookupError } = await admin.auth.admin.getUserById(userId);
  const target = acc?.user;
  if (lookupError || !target?.email) return fail('Staff member not found.');
  if (!isInvitePending(target)) return fail('They’ve already set up their account. They can use “Forgot password” on the sign-in page if needed.');

  const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002';
  const redirectTo = `${origin}/auth/accept-invite`;

  // Never opened the link: send a fresh invite. Opened it but didn't set a password: the
  // account is already confirmed, so Supabase only allows a password-setup (recovery) email.
  const { error } = target.last_sign_in_at
    ? await admin.auth.resetPasswordForEmail(target.email, { redirectTo })
    : await admin.auth.admin.inviteUserByEmail(target.email, { redirectTo });

  if (error) {
    return fail(/rate limit|too many/i.test(error.message)
      ? 'Supabase’s email limit was reached. Wait a while before sending another email.'
      : error.message);
  }

  await audit(supabase, user.id, 'staff.invite_resent', userId, null, { email: target.email });
  return { ok: true, message: `New invite sent to ${target.email}. The previous link no longer works.` };
}

/** Looks up an account by email so the Add dialog can show who it is before changing anything. */
export async function lookupAccount(email: string) {
  const { supabase, isSuperadmin } = await getActor();
  if (!isSuperadmin) return { found: false as const };
  const { data } = await supabase
    .from('users')
    .select('full_name, email, role, admin_role')
    .ilike('email', email.trim())
    .maybeSingle();
  return data ? { found: true as const, ...data } : { found: false as const };
}

/** Adds a staff member: changes an existing account's role to admin, or invites a new account. */
export async function addStaff(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const adminRole = formData.get('admin_role');
  if (!email) return fail('Enter an email address.');
  if (!isAdminRole(adminRole)) return fail('Choose a role.');

  const { supabase, user, isSuperadmin } = await getActor();
  if (!user || !isSuperadmin) return fail('Only superadmins can add staff.');

  const { data: existing } = await supabase.from('users').select('id, role, full_name').ilike('email', email).maybeSingle();

  if (existing) {
    if (existing.role === 'admin') return fail('This person is already on the staff list. Use “Change role” in the list instead.');
    const { data: updated, error } = await supabase
      .from('users')
      .update({ role: 'admin', admin_role: adminRole })
      .eq('id', existing.id)
      .select('id');
    if (error || !updated?.length) return fail(error?.message || 'Could not update this account.');
    await audit(supabase, user.id, 'staff.promoted', existing.id, { role: existing.role }, { role: 'admin', admin_role: adminRole });
    revalidatePath('/dashboard/staff');
    return { ok: true, message: `${existing.full_name || email} is now ${roleInfo(adminRole).label}. They’ll see the admin portal next time they sign in.` };
  }

  // New account: invite by email (needs the service role key)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return fail('Inviting new accounts needs SUPABASE_SERVICE_ROLE_KEY on the server.');
  const admin = createAdminClient();
  // The invite email links back to this admin app (not Supabase's default Site URL), where
  // the new staff member sets their password. The URL must be in Supabase's Redirect URLs list.
  const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002';
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/accept-invite`,
  });
  if (inviteError || !invited?.user) return fail(inviteError?.message || 'Could not send the invite.');

  // The sign-up trigger creates the profile row; give it a moment, then grant the role
  let granted = false;
  for (let i = 0; i < 5 && !granted; i++) {
    await new Promise(r => setTimeout(r, 300));
    const { data } = await admin.from('users').update({ role: 'admin', admin_role: adminRole }).eq('id', invited.user.id).select('id');
    granted = !!data?.length;
  }
  if (!granted) return fail('Invite sent, but the role could not be set yet. Refresh and use “Change role” once they appear.');

  await audit(supabase, user.id, 'staff.invited', invited.user.id, null, { role: 'admin', admin_role: adminRole });
  revalidatePath('/dashboard/staff');
  return { ok: true, message: `Invite sent to ${email} as ${roleInfo(adminRole).label}.` };
}

export async function changeStaffRole(userId: string, newRole: AdminRole): Promise<ActionResult> {
  if (!isAdminRole(newRole)) return fail('Choose a valid role.');
  const { supabase, user, isSuperadmin } = await getActor();
  if (!user || !isSuperadmin) return fail('Only superadmins can change roles.');
  if (userId === user.id) return fail('You can’t change your own role. Ask another superadmin.');

  const { data: target } = await supabase.from('users').select('admin_role, full_name, email').eq('id', userId).eq('role', 'admin').single();
  if (!target) return fail('Staff member not found.');
  if (target.admin_role === newRole) return { ok: true, message: 'No change.' };
  if (target.admin_role === 'superadmin' && (await countSuperadmins(supabase)) <= 1) {
    return fail('This is the last superadmin. Make someone else superadmin first.');
  }

  const { data: updated, error } = await supabase.from('users').update({ admin_role: newRole }).eq('id', userId).select('id');
  if (error || !updated?.length) return fail(error?.message || 'Could not change the role.');

  await audit(supabase, user.id, 'staff.role_updated', userId, { admin_role: target.admin_role }, { admin_role: newRole });
  revalidatePath('/dashboard/staff');
  return { ok: true, message: `${target.full_name || target.email} is now ${roleInfo(newRole).label}.` };
}

/**
 * Removes a staff member.
 * - Default: removes admin access but keeps the account (partners go back to the partner
 *   portal, everyone else becomes a customer). Their bookings and audit history stay intact.
 * - deleteAccount: permanently deletes the Supabase account. Only allowed when nothing else
 *   references it (typically an invite that was never accepted), since bookings, reviews,
 *   damage reports and audit logs must keep pointing at a real user.
 */
export async function removeStaff(userId: string, deleteAccount = false): Promise<ActionResult> {
  const { supabase, user, isSuperadmin } = await getActor();
  if (!user || !isSuperadmin) return fail('Only superadmins can remove staff.');
  if (userId === user.id) return fail('You can’t remove your own access. Ask another superadmin.');

  const { data: target } = await supabase.from('users').select('admin_role, full_name, email').eq('id', userId).eq('role', 'admin').single();
  if (!target) return fail('Staff member not found.');
  if (target.admin_role === 'superadmin' && (await countSuperadmins(supabase)) <= 1) {
    return fail('This is the last superadmin and can’t be removed.');
  }
  const name = target.full_name || target.email;

  if (deleteAccount) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return fail('Deleting accounts needs SUPABASE_SERVICE_ROLE_KEY on the server.');
    const blockers = await accountReferences(supabase, userId);
    if (blockers.length) {
      return fail(`${name}’s account can’t be deleted because it has ${blockers.join(', ')}. Remove their admin access instead; their history stays on record.`);
    }
    const { error } = await createAdminClient().auth.admin.deleteUser(userId);
    if (error) return fail(error.message);
    await audit(supabase, user.id, 'staff.deleted', userId, { email: target.email, admin_role: target.admin_role }, { deleted: true });
    revalidatePath('/dashboard/staff');
    return { ok: true, message: `${name}’s account was deleted.` };
  }

  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', userId).maybeSingle();
  const restoredRole = partner ? 'partner' : 'customer';

  const { data: updated, error } = await supabase
    .from('users')
    .update({ role: restoredRole, admin_role: null })
    .eq('id', userId)
    .select('id');
  if (error || !updated?.length) return fail(error?.message || 'Could not remove access.');

  await audit(supabase, user.id, 'staff.demoted', userId, { role: 'admin', admin_role: target.admin_role }, { role: restoredRole, admin_role: null });
  revalidatePath('/dashboard/staff');
  return { ok: true, message: `${name} no longer has admin access (now a ${restoredRole}).` };
}

/** Records that would block (or be destroyed by) deleting this user. */
async function accountReferences(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const checks: [string, PromiseLike<{ count: number | null }>][] = [
    ['a partner business', supabase.from('partners').select('*', { count: 'exact', head: true }).eq('user_id', userId)],
    ['bookings', supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', userId)],
    ['reviews', supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('customer_id', userId)],
    ['damage reports', supabase.from('damage_reports').select('*', { count: 'exact', head: true }).eq('customer_id', userId)],
    ['admin actions in the audit log', supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId)],
  ];
  const counts = await Promise.all(checks.map(([, q]) => q));
  return checks.filter((_, i) => (counts[i]!.count ?? 0) > 0).map(([label]) => label);
}
