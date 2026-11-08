import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import NotificationBell from '../../components/NotificationBell';
import DashboardShell from '../../components/DashboardShell';
import PartnerSidebar, { PartnerStatusPill } from '../../components/PartnerSidebar';
import InfoRequestBanner from './InfoRequestBanner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch partner details
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // If no partner record exists, force onboarding
  if (!partner) {
    redirect('/onboarding');
  }

  const logout = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
  };

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const sidebarContent = (
    <PartnerSidebar businessName={partner.business_name} email={user.email ?? ''} status={partner.status} logout={logout} />
  );

  // The business name stays in a header h2: the e2e onboarding test checks it to confirm who is signed in
  const headerContent = (
    <>
      <div className="min-w-0 flex items-center gap-2.5">
        <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white truncate">{partner.business_name}</h2>
        <span className="hidden sm:inline-flex"><PartnerStatusPill status={partner.status} /></span>
      </div>
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <NotificationBell initialNotifications={notifications || []} />
      </div>
    </>
  );

  return (
    <DashboardShell sidebar={sidebarContent} header={headerContent}>
      {partner.info_requested_at && (
        <InfoRequestBanner note={partner.info_request} items={partner.info_request_items} requestedAt={partner.info_requested_at} respondedAt={partner.info_responded_at} />
      )}
      {children}
    </DashboardShell>
  );
}
