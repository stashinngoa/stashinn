import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';

export default function Forbidden() {
  const forceLogout = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <img src="/StashInn_Light.png" alt="StashInn" className="h-20 w-auto mb-6 dark:hidden" />
      <img src="/StashInn_Dark.png" alt="StashInn" className="h-20 w-auto mb-6 hidden dark:block" />
      <h1 className="text-6xl font-bold mb-4 text-orange-600 dark:text-orange-500">403</h1>
      <h2 className="text-2xl font-semibold mb-6">Partner Access Only</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md text-center">
        You do not have permission to view this page. This portal is strictly for StashInn Partners.
      </p>
      <form action={forceLogout}>
        <button
          type="submit"
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          Sign Out & Return
        </button>
      </form>
    </div>
  );
}
