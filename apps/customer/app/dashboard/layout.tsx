import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import NotificationBell from '../../components/NotificationBell';
import CustomerDashboardShell from '../../components/CustomerDashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const logout = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  const [{ data: notifications }, { count: unread }, { data: profile }] = await Promise.all([
    supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
    supabase.from('users').select('full_name').eq('id', user.id).maybeSingle(),
  ]);

  return (
    <CustomerDashboardShell
      user={{ name: profile?.full_name || user.user_metadata?.full_name || '', email: user.email || '' }}
      bell={<NotificationBell initialNotifications={notifications || []} />}
      logout={logout}
      unread={unread || 0}
    >
      {children}
    </CustomerDashboardShell>
  );
}
