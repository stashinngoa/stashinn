import { createClient } from '@stashinn/lib/supabase/server';
import NotificationList from './NotificationList';

export default async function CustomerNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Loaded once; filtering and search happen instantly in the browser
  const { data } = await supabase
    .from('notifications')
    .select('id, title, message, category, is_read, is_archived, action_url, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Updates about your bookings and account.</p>
      </div>
      <NotificationList initial={data || []} />
    </div>
  );
}
