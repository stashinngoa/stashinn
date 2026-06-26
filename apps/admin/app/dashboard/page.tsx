import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const logout = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-red-500">Admin Control Panel</h1>
          <form action={logout}>
            <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 font-medium">
              Terminate Session
            </button>
          </form>
        </div>
        
        <div className="bg-red-900/20 p-6 rounded-lg text-red-200 border border-red-900/50">
          <h2 className="text-xl font-semibold mb-2">System Access Granted</h2>
          <p>Superuser privileges active for:</p>
          <code className="block mt-2 bg-gray-900 p-3 rounded font-mono text-sm border border-gray-700">
            {user.email}
          </code>
        </div>
      </div>
    </div>
  );
}
