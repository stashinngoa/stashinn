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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900">
      <h1 className="text-6xl font-bold mb-4">403</h1>
      <h2 className="text-2xl font-semibold mb-6">Access Denied</h2>
      <p className="text-gray-600 mb-8 max-w-md text-center">
        You do not have permission to view this page. This portal is strictly for customers.
        If you are a partner or admin, please log in through the correct portal.
      </p>
      <form action={forceLogout}>
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Sign Out & Return
        </button>
      </form>
    </div>
  );
}
