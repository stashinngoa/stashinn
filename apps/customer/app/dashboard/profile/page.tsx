import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import ProfileForms from './ProfileForms';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: prefs }, { count: bookings }] = await Promise.all([
    supabase.from('users').select('full_name, phone, created_at').eq('id', user.id).maybeSingle(),
    supabase.from('notification_preferences').select('in_app, email, whatsapp, sms').eq('user_id', user.id).maybeSingle(),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('customer_id', user.id),
  ]);

  const name = profile?.full_name || user.user_metadata?.full_name || '';
  const since = new Date(profile?.created_at || user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Profile &amp; settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your details, how we contact you, and your password.</p>
      </div>

      <div className="flex items-center gap-4 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <span className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white text-xl font-black flex items-center justify-center">
          {(name || user.email || 'U').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-extrabold text-gray-900 dark:text-white truncate">{name || 'Add your name'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Member since {since} · {bookings || 0} booking{bookings === 1 ? '' : 's'}</p>
        </div>
      </div>

      {/* Two columns on wide screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <ProfileForms email={user.email || ''} fullName={name} phone={profile?.phone || user.user_metadata?.phone || ''} />

        <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Notifications</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">How we tell you about booking updates.</p>
          <ProfileForm initialPrefs={prefs || { in_app: true, email: true, whatsapp: false, sms: false }} />
        </section>
      </div>
    </div>
  );
}
