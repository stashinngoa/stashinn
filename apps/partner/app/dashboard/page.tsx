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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6 border-t-4 border-purple-600">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold">Partner Dashboard - Vercel deployment check -1</h1>
          <form action={logout}>
            <button className="px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 font-medium">
              Log Out
            </button>
          </form>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg text-purple-900 border border-purple-100">
          <h2 className="text-xl font-semibold mb-2">Partner Portal Active</h2>
          <p>You are authenticated as an authorized partner:</p>
          <code className="block mt-2 bg-white p-3 rounded font-mono text-sm border">
            {user.email}
          </code>
        </div>
      </div>
    </div>
  );
}
