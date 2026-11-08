'use server';

import { requireAccess } from '../../../lib/adminAccess';
import { effectiveRole } from '../../../lib/permissions';
import { amenityKeyFromLabel, type AmenityScope } from '@stashinn/lib/services/amenities';
import { LEGAL_DETAILS_KEY, LEGAL_DOCS, LEGAL_FIELDS, type LegalDetails, type LegalDocKey } from '@stashinn/lib/services/legal';

import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { revalidatePath } from 'next/cache';

export type ConfigResult = { ok: true; message: string } | { ok: false; error: string };

/** Settings editable on the Configuration page, with their validation rules. */
const EDITABLE: Record<string, (v: string) => string | null> = {
  booking_min_hours: v => (Number.isInteger(+v) && +v >= 1 ? null : 'Minimum booking must be a whole number of hours, at least 1.'),
  booking_max_days: v => (Number.isInteger(+v) && +v >= 1 ? null : 'Maximum booking must be a whole number of days, at least 1.'),
  cancellation_window_hours: v => (Number.isInteger(+v) && +v >= 0 ? null : 'Free cancellation window must be 0 or more whole hours.'),
  support_email: v => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Support email must be a valid email address.'),
};

export async function updateSystemConfig(_prev: ConfigResult | null, formData: FormData): Promise<ConfigResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session has expired. Please sign in again.' };

  // Settings change platform behaviour, so only superadmins may edit them (the service client
  // below bypasses RLS, so this check is what enforces it)
  const { data: me } = await supabase.from('users').select('role, admin_role').eq('id', user.id).single();
  if (me?.role !== 'admin' || effectiveRole(me?.admin_role) !== 'superadmin') {
    return { ok: false, error: 'Only superadmins can change platform settings.' };
  }

  const values: Record<string, string> = {};
  for (const key of Object.keys(EDITABLE)) {
    const raw = formData.get(key);
    if (raw === null) continue;
    const value = String(raw).trim();
    const problem = EDITABLE[key]!(value);
    if (problem) return { ok: false, error: problem };
    values[key] = value;
  }
  if (values.booking_min_hours && values.booking_max_days && +values.booking_min_hours > +values.booking_max_days * 24) {
    return { ok: false, error: 'Minimum booking can’t be longer than the maximum booking.' };
  }

  const serviceRole = createServiceClient();
  const { data: oldRows } = await serviceRole.from('system_config').select('key, value').in('key', Object.keys(values));
  const old = Object.fromEntries((oldRows || []).map((r: any) => [r.key, r.value]));

  let changed = 0;
  for (const [key, value] of Object.entries(values)) {
    const parsed = key === 'support_email' ? value : Number(value);
    if (JSON.stringify(old[key]) === JSON.stringify(parsed)) continue;

    const { error } = await serviceRole.from('system_config').upsert({ key, value: parsed }, { onConflict: 'key' });
    if (error) return { ok: false, error: error.message };
    changed++;

    await serviceRole.from('audit_logs').insert({
      user_id: user.id,
      action: 'config.system_updated',
      entity_type: 'system_config',
      entity_id: key,
      old_values: { value: old[key] ?? null },
      new_values: { value: parsed },
    });
  }

  revalidatePath('/dashboard/config', 'layout');
  return { ok: true, message: changed ? `Saved ${changed} setting${changed === 1 ? '' : 's'}.` : 'No changes to save.' };
}

export async function updateEmailTemplate(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const subject = formData.get('subject') as string;
  const body_html = formData.get('body_html') as string;
  const is_active = formData.get('is_active') === 'true';

  // RLS only lets superadmins update templates; an empty result means it was blocked
  const { data: updated, error } = await supabase
    .from('email_templates')
    .update({ subject, body_html, is_active })
    .eq('id', id)
    .select('id');

  if (error || !updated?.length) {
    return { error: error?.message || 'Only superadmins can edit email templates.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'config.template_updated',
      entity_type: 'email_templates',
      entity_id: id,
      new_values: { subject, body_html, is_active }
    });
  }

  revalidatePath('/dashboard/config');
  return { success: true };
}

/**
 * Saves the documents and business details edited on /dashboard/config/legal (superadmin only).
 * Only the documents passed in are written, so their "last updated" dates stay accurate.
 */
export async function saveLegal(input: { docs: Partial<Record<LegalDocKey, string>>; details?: LegalDetails }): Promise<ConfigResult & { savedAt?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session has expired. Please sign in again.' };
  const { data: me } = await supabase.from('users').select('role, admin_role').eq('id', user.id).single();
  if (me?.role !== 'admin' || effectiveRole(me?.admin_role) !== 'superadmin') {
    return { ok: false, error: 'Only superadmins can change legal documents.' };
  }

  const savedAt = new Date().toISOString();
  const rows: { key: string; value: unknown; description: string; updated_by: string; updated_at: string }[] = [];
  for (const meta of LEGAL_DOCS) {
    const text = input.docs[meta.key];
    if (text === undefined) continue;
    if (!text.trim()) return { ok: false, error: `${meta.title} can't be empty.` };
    rows.push({ key: meta.key, value: text, description: meta.title, updated_by: user.id, updated_at: savedAt });
  }
  if (input.details) {
    const details = Object.fromEntries(LEGAL_FIELDS.map(f => [f.key, String(input.details?.[f.key] ?? '').trim()]));
    rows.push({ key: LEGAL_DETAILS_KEY, value: details, description: 'Business details used in the legal documents', updated_by: user.id, updated_at: savedAt });
  }
  if (!rows.length) return { ok: true, message: 'Nothing to save.', savedAt };

  const serviceRole = createServiceClient();
  const { error } = await serviceRole.from('system_config').upsert(rows, { onConflict: 'key' });
  if (error) return { ok: false, error: error.message };
  await serviceRole.from('audit_logs').insert({
    user_id: user.id,
    action: 'config.legal_updated',
    entity_type: 'system_config',
    entity_id: 'legal_documents',
    new_values: { keys: rows.map(r => r.key) },
  });

  revalidatePath('/dashboard/config/legal');
  return { ok: true, message: 'Saved.', savedAt };
}

/** Adds an amenity to the catalog; it then appears for partners, in customer filters and in scoring. */
export async function addAmenity(label: string, appliesTo: AmenityScope[]): Promise<{ error: string | null }> {
  await requireAccess('/dashboard/config'); // role check: see lib/permissions.ts
  const name = label.trim().replace(/\s+/g, ' ');
  const scopes = appliesTo.filter(s => s === 'luggage' || s === 'garage');
  // Search links list amenities separated by commas, so names can't contain one
  if (!/^[\w\s/&+().-]{2,40}$/.test(name)) return { error: 'Use 2 to 40 letters, numbers, spaces or / & + ( ) . -' };
  if (!scopes.length) return { error: 'Choose luggage, parking or both.' };
  const key = amenityKeyFromLabel(name);
  if (!key) return { error: 'The name needs at least one letter or number.' };

  const service = createServiceClient();
  const { data: existing } = await service.from('amenities').select('key, label');
  if ((existing || []).some((a: any) => a.key === key || a.label.toLowerCase() === name.toLowerCase())) {
    return { error: `"${name}" already exists. Reactivate it if it's inactive.` };
  }

  const { error } = await service.from('amenities').insert({ key, label: name, applies_to: scopes });
  if (error) return { error: error.message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({
    user_id: user?.id, action: 'admin.amenity_added', entity_type: 'amenities', entity_id: key, new_values: { label: name, applies_to: scopes },
  });
  revalidatePath('/dashboard/config');
  revalidatePath('/dashboard/scoring');
  return { error: null };
}

/** Hides an amenity from new selections, or brings it back. Locations keep what they have. */
export async function setAmenityActive(key: string, active: boolean): Promise<{ error: string | null }> {
  await requireAccess('/dashboard/config'); // role check: see lib/permissions.ts
  const { error } = await createServiceClient().from('amenities').update({ is_active: active }).eq('key', key);
  if (error) return { error: error.message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({
    user_id: user?.id, action: active ? 'admin.amenity_reactivated' : 'admin.amenity_deactivated', entity_type: 'amenities', entity_id: key,
  });
  revalidatePath('/dashboard/config');
  revalidatePath('/dashboard/scoring');
  return { error: null };
}
