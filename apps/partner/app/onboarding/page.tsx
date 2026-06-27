import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if they already submitted
  const { data: existingPartner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existingPartner) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-inter">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Become a StashInn Partner</h2>
          <p className="mt-2 text-gray-600">Join our network and start earning by storing luggage securely.</p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <OnboardingForm defaultEmail={user.email || ''} userId={user.id} />
        </div>
      </div>
    </div>
  );
}
