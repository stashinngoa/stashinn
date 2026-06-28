import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="min-h-screen bg-gray-100 font-inter flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 sticky top-0 z-50 shrink-0">
        <Link href="/" className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 flex-1">
          StashInn
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600 hidden sm:block">{user.email}</span>
          <form action={logout}>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-sm transition-colors">
              Log Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white hover:shadow-sm hover:text-purple-600 text-gray-600 font-bold transition-all shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              My Bookings
            </Link>
            
            <Link 
              href="/dashboard/profile" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white hover:shadow-sm hover:text-purple-600 text-gray-600 font-bold transition-all shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Settings
            </Link>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
