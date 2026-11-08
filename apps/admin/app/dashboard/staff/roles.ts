// Admin role definitions shown in the staff UI. Permissions mirror the RLS policies in
// supabase/migrations/20260712132256_admin_roles.sql.

export type AdminRole = 'superadmin' | 'ops' | 'finance' | 'support';

export const ADMIN_ROLES: {
  value: AdminRole;
  label: string;
  summary: string;
  can: string[];
  badge: string;
  dot: string;
}[] = [
  {
    value: 'superadmin',
    label: 'Superadmin',
    summary: 'Full access, including staff and platform settings.',
    can: ['Everything other roles can do', 'Manage staff & roles', 'Platform configuration & templates'],
    badge: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60',
    dot: 'bg-orange-500',
  },
  {
    value: 'ops',
    label: 'Operations',
    summary: 'Runs partners and their locations.',
    can: ['Approve & manage partners', 'Manage locations & POCs'],
    badge: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
    dot: 'bg-sky-500',
  },
  {
    value: 'finance',
    label: 'Finance',
    summary: 'Handles money: payments, payouts and settlements.',
    can: ['View & update payments', 'Partner transactions & settlements', 'View damage claims'],
    badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  },
  {
    value: 'support',
    label: 'Support',
    summary: 'Helps customers and resolves disputes.',
    can: ['View bookings & customers', 'Resolve disputes & damage claims'],
    badge: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60',
    dot: 'bg-violet-500',
  },
];

export const roleInfo = (role: string | null | undefined) =>
  ADMIN_ROLES.find(r => r.value === role) ?? ADMIN_ROLES[0]!;

export const isAdminRole = (v: unknown): v is AdminRole => ADMIN_ROLES.some(r => r.value === v);

/**
 * How long Supabase invite / set-password links stay valid. Keep this in line with
 * Supabase Dashboard -> Authentication -> Email -> "Email OTP Expiration" (1 hour by default).
 */
export const INVITE_LINK_TTL_MS = 60 * 60 * 1000;

export type AccountStatus = 'active' | 'pending' | 'expired';

export const ACCOUNT_STATUS: Record<AccountStatus, { label: string; badge: string; dot: string }> = {
  active: { label: 'Active', badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
  pending: { label: 'Pending activation', badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-500' },
  expired: { label: 'Invite expired', badge: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50', dot: 'bg-red-500' },
};
