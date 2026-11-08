import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingForm from './OnboardingForm';
import { fillLegal, loadLegal } from '@stashinn/lib/services/legal';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/#login-section');
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

  const { docs, details, live } = await loadLegal(supabase);
  const legal = {
    terms: fillLegal(docs.partner_terms_and_conditions.text, { details, live }, docs.partner_terms_and_conditions.updatedAt),
    privacy: fillLegal(docs.partner_privacy_policy.text, { details, live }, docs.partner_privacy_policy.updatedAt),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-inter relative transition-colors">
      {/* Signed into the wrong account? Let them leave */}
      <form
        action={async () => {
          'use server';
          const supabase = await createClient();
          await supabase.auth.signOut();
          redirect('/');
        }}
        className="absolute top-6 right-6 sm:top-8 sm:right-8"
      >
        <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 mr-2">{user.email}</span>
        <button type="submit" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">Sign out</button>
      </form>

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
          <OnboardingForm 
            defaultEmail={user.email || ''} 
            defaultName={user.user_metadata?.full_name || ''}
            userId={user.id} 
            legal={legal}
          />
        </div>
      </div>
    </div>
  );
}
