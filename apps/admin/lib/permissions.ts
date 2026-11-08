// Which admin pages each staff role can open, and whether they can change things there.
// Used by the middleware (blocks direct URLs), the sidebar (hides tabs), the view-only banner
// and the server actions (lib/adminAccess.ts). Database RLS remains the final safeguard.

export type AdminRole = 'superadmin' | 'ops' | 'finance' | 'support';
export type AccessLevel = 'full' | 'view';

type Rule = { prefix: string; exact?: boolean; access: Partial<Record<AdminRole, AccessLevel>> };

const ALL_FULL: Rule['access'] = { superadmin: 'full', ops: 'full', finance: 'full', support: 'full' };

// Most specific prefix wins. Paths under /dashboard (and the listed APIs) not matched here
// are superadmin-only.
const RULES: Rule[] = [
  { prefix: '/dashboard', exact: true, access: ALL_FULL },
  { prefix: '/dashboard/notifications', access: ALL_FULL },
  { prefix: '/dashboard/bookings', access: ALL_FULL },
  { prefix: '/dashboard/partners', access: { superadmin: 'full', ops: 'full', finance: 'view' } },
  { prefix: '/dashboard/customers', access: { superadmin: 'full', support: 'full', ops: 'view' } },
  { prefix: '/dashboard/settlements', access: { superadmin: 'full', finance: 'full' } },
  { prefix: '/dashboard/disputes', access: { superadmin: 'full', support: 'full', finance: 'view' } },
  { prefix: '/dashboard/reviews', access: { superadmin: 'full', ops: 'full', support: 'full' } },
  { prefix: '/dashboard/scoring', access: { superadmin: 'full', ops: 'full' } },
  { prefix: '/dashboard/staff', access: { superadmin: 'full' } },
  { prefix: '/dashboard/config', access: { superadmin: 'full' } },
  { prefix: '/dashboard/audit', access: { superadmin: 'full' } },
  { prefix: '/print/partners', access: { superadmin: 'full', ops: 'full', finance: 'view' } },
  { prefix: '/api/export-analytics', access: { superadmin: 'full', finance: 'full' } },
  { prefix: '/api/export-customers', access: { superadmin: 'full', support: 'full', ops: 'view' } },
  { prefix: '/api/export-audit', access: { superadmin: 'full' } },
];

const RESTRICTED_AREAS = ['/dashboard', '/print', '/api/export-'];

const matches = (path: string, r: Rule) =>
  r.exact ? path === r.prefix : path === r.prefix || path.startsWith(`${r.prefix}/`) || (r.prefix.endsWith('-') && path.startsWith(r.prefix));

/** Admins created before granular roles have no admin_role; they were all superadmins. */
export const effectiveRole = (adminRole: string | null | undefined): AdminRole =>
  adminRole === 'ops' || adminRole === 'finance' || adminRole === 'support' ? adminRole : 'superadmin';

/** Access level for a path, or null when the role may not open it at all. */
export function accessFor(adminRole: string | null | undefined, path: string): AccessLevel | null {
  const role = effectiveRole(adminRole);
  const rule = RULES.filter(r => matches(path, r)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (rule) return rule.access[role] ?? null;
  if (RESTRICTED_AREAS.some(a => path.startsWith(a))) return role === 'superadmin' ? 'full' : null;
  return 'full'; // login, auth, session ping, etc.
}
