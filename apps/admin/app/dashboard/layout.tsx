import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '../../components/NotificationBell';
import DashboardShell from '../../components/DashboardShell';
import SidebarNav from '../../components/SidebarNav';
import HeaderBreadcrumb from '../../components/HeaderBreadcrumb';
import SessionTimeout from '../../components/SessionTimeout';
import { MAX_SESSION_MS } from '../../lib/sessionPolicy';
import { getAdminContext } from '../../lib/adminAccess';
import { roleInfo } from './staff/roles';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const logout = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Least-privileged fallback if the profile can't be read (middleware has already checked access)
  const adminRole = (await getAdminContext()).role ?? 'support';
  const email = user.email ?? '';
  const initials = email.split(/[@._-]/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || 'A';

  const sidebarContent = (
    <div className="w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shrink-0 transition-colors duration-200">
      <div className="h-16 flex items-center px-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/StashInn_Light_no_text.png" alt="" className="h-9 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="" className="h-9 w-auto hidden dark:block" />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-tight">
              <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400 mt-0.5">Admin Console</span>
          </span>
        </Link>
      </div>

      <SidebarNav role={adminRole} />

      <div className="p-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-900">
          <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-orange-600 to-amber-500 text-white text-xs font-black flex items-center justify-center">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={email}>{email}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{roleInfo(adminRole).label}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const headerContent = (
    <>
      <HeaderBreadcrumb />
      <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
        <span className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          System online
        </span>
        <NotificationBell initialNotifications={notifications || []} />
      </div>
    </>
  );

  return (
    <DashboardShell sidebar={sidebarContent} header={headerContent} adminRole={adminRole}>
      <SessionTimeout sessionEndsAt={new Date(user.last_sign_in_at ?? Date.now()).getTime() + MAX_SESSION_MS} />
      {children}
    </DashboardShell>
  );
}
