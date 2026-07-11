import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileEditForm from './ProfileEditForm';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!partner) redirect('/onboarding');

  let { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!prefs) {
    prefs = { in_app: true, email: true, whatsapp: false, sms: false, push: false };
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Business Profile</h1>
        <p className="text-gray-500 mt-1">Manage your corporate details, taxation IDs, and contact info.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <ProfileEditForm initialData={partner} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500">Choose how you want to be alerted about new bookings and payouts.</p>
        </div>
        <div className="p-6">
          <ProfileForm initialPrefs={prefs} />
        </div>
      </div>
    </div>
  );
}
