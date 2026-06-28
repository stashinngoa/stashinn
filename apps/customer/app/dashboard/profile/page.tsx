import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileForms from './ProfileForms';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Profile Settings</h1>
      <ProfileForms user={user} />
    </div>
  );
}
