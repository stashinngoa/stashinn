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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-inter relative transition-colors">
      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center space-x-2">
        <div className="flex items-center gap-2">
          <img src="/StashInn_Light_no_text.png" alt="StashInn" className="h-10 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="StashInn" className="h-10 w-auto hidden dark:block" />
          <span className="text-2xl font-black tracking-tighter shrink-0">
            <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
          </span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Become a StashInn Partner</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Join our network and start earning by storing luggage securely.</p>
        </div>
        
        <div className="bg-white dark:bg-gray-900 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-800 transition-colors">
          <OnboardingForm defaultEmail={user.email || ''} userId={user.id} />
        </div>
      </div>
    </div>
  );
}
