import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileEditForm from './ProfileEditForm';

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Business Profile</h1>
        <p className="text-gray-500 mt-1">Manage your corporate details, taxation IDs, and contact info.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <ProfileEditForm initialData={partner} />
      </div>
    </div>
  );
}
