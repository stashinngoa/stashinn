import { cache } from 'react';
import { createClient } from '@stashinn/lib/supabase/server';
import { accessFor, effectiveRole, type AccessLevel, type AdminRole } from './permissions';

/** The signed-in admin and their effective role (cached per request). */
export const getAdminContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null as AdminRole | null };
  const { data: profile } = await supabase.from('users').select('role, admin_role').eq('id', user.id).single();
  return { user, role: profile?.role === 'admin' ? effectiveRole(profile.admin_role) : null };
});

/**
 * Throws unless the signed-in admin has at least `level` access to `path`.
 * Call at the top of server actions that change data.
 */
export async function requireAccess(path: string, level: AccessLevel = 'full') {
  const { role } = await getAdminContext();
  const access = role ? accessFor(role, path) : null;
  if (!access || (level === 'full' && access !== 'full')) {
    throw new Error(access === 'view' ? 'You have view-only access here and can’t make changes.' : 'You don’t have access to this area.');
  }
  return role!;
}
