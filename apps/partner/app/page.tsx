import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import InlineLoginForm from './InlineLoginForm';
import { logger } from '@stashinn/lib/services/logger';

export default async function PartnerHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (partner) {
      redirect('/dashboard');
    } else {
      return <IncompleteOnboardingView />;
    }
  }

  const loginAction = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const supabaseClient = await createClient();
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      logger.warn('Auth Failure: Partner login failed', { email, error: error.message });
      return redirect(`/?error=${encodeURIComponent(error.message)}`);
    }
    return redirect('/dashboard');
  };

  return <MarketingLandingView loginAction={loginAction} />;
}

function IncompleteOnboardingView() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 transition-colors font-inter">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-10 text-center border border-gray-100 dark:border-gray-800">
        <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-orange-600 dark:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Welcome to StashInn</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">You are just a few steps away from turning your unused space into a new revenue stream. Complete your business profile to get started.</p>
        <Link 
          href="/onboarding" 
          className="block w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-200 dark:shadow-none"
        >
          Complete Registration
        </Link>
        <div className="mt-6">
          <form action={async () => {
            'use server';
            const supabase = await createClient();
            await supabase.auth.signOut();
            redirect('/');
          }}>
            <button type="submit" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium">Log out</button>
          </form>
        </div>
      </div>
    </main>
  );
}

function MarketingLandingView({ loginAction }: { loginAction: (formData: FormData) => Promise<void> }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors selection:bg-orange-200 dark:selection:bg-orange-900 font-inter">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black backdrop-blur-md dark:backdrop-blur-none border-b border-gray-50 dark:border-gray-900 transition-colors">
        <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 w-full">
          <div className="flex items-center gap-2">
            <img src="/StashInn_Light_no_text.png" alt="StashInn Logo" className="h-7 md:h-10 w-auto dark:hidden" />
            <img src="/StashInn_Dark_no_text.png" alt="StashInn Logo" className="h-7 md:h-10 w-auto hidden dark:block" />
            <span className="text-lg md:text-2xl font-black tracking-tighter shrink-0">
              <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
              <span className="ml-1.5 md:ml-2 text-xs md:text-sm text-gray-500 font-bold bg-gray-100 dark:bg-gray-900 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg">Partner</span>
            </span>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <ThemeToggle />
            <a href="#login-section" className="flex items-center gap-1.5 text-sm font-semibold bg-gray-900 dark:bg-gray-800 md:bg-transparent md:dark:bg-transparent text-white md:text-gray-600 md:dark:text-gray-400 px-4 py-2 md:px-0 md:py-0 rounded-full md:rounded-none hover:text-gray-300 md:hover:text-orange-600 md:dark:hover:text-orange-500 transition-colors shadow-sm md:shadow-none">
              <svg className="w-4 h-4 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Log In
            </a>
            <Link href="/register" className="hidden md:flex items-center gap-1.5 text-sm font-semibold bg-gray-900 dark:bg-orange-600 text-white px-5 py-2.5 rounded-full hover:bg-gray-800 dark:hover:bg-orange-700 transition-transform hover:scale-105 active:scale-95 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
              </svg>
              Become a Partner
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-20 md:pb-32">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex justify-center">
          <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-orange-300/40 dark:bg-orange-900/30 blur-[140px] rounded-full"></div>
          <div className="absolute top-1/3 w-[800px] h-[400px] bg-orange-400/10 dark:bg-orange-700/10 blur-[140px] rounded-full"></div>
          <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-orange-400/20 dark:bg-orange-800/20 blur-[140px] rounded-full"></div>
        </div>

        <div className="w-full px-4 md:px-8 flex flex-col lg:flex-row items-center gap-10 md:gap-16">
          {/* Text Content */}
          <div className="lg:w-1/2 z-10 w-full text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800/50 text-orange-700 dark:text-orange-400 text-xs md:text-sm font-semibold mb-6 shadow-sm mx-auto lg:mx-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
              </span>
              Now accepting partners across India
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-gray-900 dark:text-white tracking-tight leading-[1.1] mb-4 md:mb-6">
              Turn your empty <br className="hidden lg:block"/>
              space into <span className="block lg:inline text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500 mt-2 lg:mt-0">extra income.</span>
            </h1>
            <p className="text-base md:text-xl text-gray-500 dark:text-gray-400 mb-8 md:mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Join thousands of hotels, cafes, and local shops earning passive income by securely storing luggage for travelers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center lg:justify-start">
              <Link href="/register" className="inline-flex justify-center items-center px-6 py-3.5 md:px-8 md:py-4 bg-orange-600 text-white text-base md:text-lg font-semibold rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 dark:shadow-none hover:-translate-y-1">
                Start Earning Today
              </Link>
              <a href="#how-it-works" className="inline-flex justify-center items-center px-6 py-3.5 md:px-8 md:py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-base md:text-lg font-semibold rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                How it works
              </a>
            </div>
            <div className="mt-8 md:mt-10 flex items-center justify-center lg:justify-start gap-4 text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-950 flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-400 dark:text-gray-300">P</div>
                ))}
              </div>
              <span>Trusted by 500+ local businesses</span>
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex justify-center mt-12 lg:mt-0 px-4">
            <InlineLoginForm loginAction={loginAction} />
          </div>
        </div>
      </section>

      {/* How it Works & Benefits */}
      <section id="how-it-works" className="py-24 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-64 w-[600px] h-[600px] bg-orange-300/10 dark:bg-orange-900/10 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="w-full px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Zero Investment, Pure Profit.</h2>
            <p className="text-lg text-gray-500 dark:text-gray-400">StashInn handles the marketing, booking, and payments. You just provide the secure space and verify the luggage.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl font-black text-orange-600 dark:text-orange-500">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">List your space</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Register your business, set your operating hours, and define how many bags you can safely store.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow relative">
              <div className="hidden md:block absolute top-12 -left-4 w-8 h-[2px] bg-gray-200 dark:bg-gray-800"></div>
              <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl font-black text-orange-600 dark:text-orange-500">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Receive Luggage</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Customers book online. They drop off their bags at your location and verify using a secure OTP.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow relative">
               <div className="hidden md:block absolute top-12 -left-4 w-8 h-[2px] bg-gray-200 dark:bg-gray-800"></div>
              <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl font-black text-orange-600 dark:text-orange-500">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Get Paid Weekly</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Payments are processed automatically. Earnings are deposited directly to your bank account every week.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-gradient-to-br from-gray-900 to-black dark:from-gray-950 dark:to-black py-20 text-center border-t border-gray-800">
        <h2 className="text-3xl font-bold text-white mb-6">Ready to maximize your space?</h2>
        <Link href="/register" className="inline-flex px-8 py-4 bg-orange-600 text-white font-semibold rounded-full hover:bg-orange-700 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-orange-900/50">
          Join StashInn Partner Network
        </Link>
      </section>

      {/* Airbnb-style Footer */}
      <footer className="relative overflow-hidden bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-900 pt-16 pb-8 transition-colors">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-orange-300/10 dark:bg-orange-900/10 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="w-full px-6 md:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12 border-b border-gray-200 dark:border-gray-800 pb-12">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Partner Help Centre</a></li>
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Security guidelines</a></li>
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Insurance details</a></li>
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Contact Partner Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Hosting</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Hosting resources</a></li>
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Success stories</a></li>
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Community forum</a></li>
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Hosting responsibly</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">StashInn</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">About us</a></li>
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Careers</a></li>
                <li><a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Investors</a></li>
                <li><a href={process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3000"} className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Book luggage storage</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <span>© {new Date().getFullYear()} StashInn, Inc.</span>
              <span className="hidden md:inline">·</span>
              <div className="flex gap-4">
                <a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Privacy</a>
                <a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Terms</a>
                <a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Sitemap</a>
                <a href="#" className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">Company details</a>
              </div>
            </div>
            <div className="flex items-center gap-4 font-medium text-gray-900 dark:text-gray-300">
              <button className="flex items-center gap-1 hover:underline hover:text-orange-600 dark:hover:text-orange-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                English (IN)
              </button>
              <button className="hover:underline hover:text-orange-600 dark:hover:text-orange-500">₹ INR</button>
              <div className="flex gap-3 ml-2">
                <a href="#" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
