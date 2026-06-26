import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';

export default function Forbidden() {
  const forceLogout = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-6xl font-bold mb-4 text-red-500">403</h1>
      <h2 className="text-2xl font-semibold mb-6">Restricted Area</h2>
      <p className="text-gray-400 mb-8 max-w-md text-center">
        This area is restricted to StashInn Administrators only. All unauthorized access attempts are logged.
      </p>
      <form action={forceLogout}>
        <button
          type="submit"
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Sign Out & Return
        </button>
      </form>
    </div>
  );
}
