import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileForms from './ProfileForms';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!prefs) {
    prefs = { in_app: true, email: true, whatsapp: false, sms: false, push: false };
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Profile Settings</h1>
      <ProfileForms user={user} />
      
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500">Choose how you want to be alerted about your bookings.</p>
        </div>
        <div className="p-6">
          <ProfileForm initialPrefs={prefs} />
        </div>
      </div>
    </div>
  );
}
