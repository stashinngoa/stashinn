import { headers } from 'next/headers';
import { createServiceClient } from '@stashinn/lib/supabase/service';

/**
 * Records an admin console sign-in attempt (success or failure) in auth_audits (method 'password',
 * migration 20261110000007) and in audit_logs (Admin → Audit). Uses the service client: the person
 * isn't signed in yet when a sign-in fails, and neither table lets users insert. Never throws.
 */
export async function auditAdminLogin(email: string, success: boolean, userId: string | null, reason?: string) {
  try {
    const db = createServiceClient();
    const identifier = (email || '').trim().toLowerCase().slice(0, 254);
    let id = userId;
    if (!id && identifier) {
      const { data } = await db.from('users').select('id').eq('email', identifier).maybeSingle();
      id = data?.id ?? null;
    }
    const h = await headers();
    const ip = (h.get('x-forwarded-for') || '').split(',')[0]!.trim() || h.get('x-real-ip') || null;
    const userAgent = h.get('user-agent')?.slice(0, 300) || null;

    const [a, b] = await Promise.all([
      db.from('auth_audits').insert({ user_id: id, identifier, method: 'password', success }),
      db.from('audit_logs').insert({
        user_id: id,
        action: success ? 'admin.login' : 'admin.login_failed',
        entity_type: 'auth',
        entity_id: id,
        new_values: { identifier, ...(reason ? { reason } : {}) },
        ip_address: ip,
        user_agent: userAgent,
      }),
    ]);
    if (a.error) console.error('[ADMIN_LOGIN_AUDIT] auth_audits insert failed:', a.error.message);
    if (b.error) console.error('[ADMIN_LOGIN_AUDIT] audit_logs insert failed:', b.error.message);
  } catch (e) {
    console.error('[ADMIN_LOGIN_AUDIT] failed:', e);
  }
}
