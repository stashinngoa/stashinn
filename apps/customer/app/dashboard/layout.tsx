import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '../../components/NotificationBell';
import CustomerDashboardShell from '../../components/CustomerDashboardShell';

export default async function DashboardLayout({
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

  const headerRight = (
    <>
      <NotificationBell initialNotifications={notifications || []} />
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:block">{user.email}</span>
      <form action={logout}>
        <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-bold text-sm transition-colors shrink-0">
          Log Out
        </button>
      </form>
    </>
  );

  const sidebar = (
    <nav className="flex flex-col gap-2">
      <Link 
        href="/dashboard" 
        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm hover:text-orange-600 dark:hover:text-orange-400 text-gray-600 dark:text-gray-400 font-bold transition-all shrink-0"
      >
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        My Bookings
      </Link>
      
      <Link 
        href="/dashboard/profile" 
        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm hover:text-orange-600 dark:hover:text-orange-400 text-gray-600 dark:text-gray-400 font-bold transition-all shrink-0"
      >
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Profile Settings
      </Link>
    </nav>
  );

  return (
    <CustomerDashboardShell sidebar={sidebar} headerRight={headerRight}>
      {children}
    </CustomerDashboardShell>
  );
}
