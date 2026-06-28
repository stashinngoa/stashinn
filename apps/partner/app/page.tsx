import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function PartnerHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, check partner profile
  if (user) {
    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (partner) {
      // Active partner: Redirect to dashboard
      redirect('/dashboard');
    } else {
      // Logged in but incomplete onboarding
      return <IncompleteOnboardingView />;
    }
  }

  // Not logged in: Show Marketing Landing Page
  return <MarketingLandingView />;
}

function IncompleteOnboardingView() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-gray-100">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Welcome to StashInn</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">You are just a few steps away from turning your unused space into a new revenue stream. Complete your business profile to get started.</p>
        <Link 
          href="/onboarding" 
          className="block w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-200"
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
            <button type="submit" className="text-sm text-gray-400 hover:text-gray-600 font-medium">Log out</button>
          </form>
        </div>
      </div>
    </main>
  );
}

function MarketingLandingView() {
  return (
    <div className="min-h-screen bg-white selection:bg-purple-200">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-200">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">StashInn<span className="text-purple-600">.</span> Partner</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Log In</Link>
          <Link href="/login" className="text-sm font-semibold bg-gray-900 text-white px-5 py-2.5 rounded-full hover:bg-gray-800 transition-transform hover:scale-105 active:scale-95">Become a Partner</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Background glow effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-70"></div>
        <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-100/50 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-70"></div>

        <div className="max-w-7xl mx-auto px-8 flex flex-col lg:flex-row items-center gap-16">
          {/* Text Content */}
          <div className="lg:w-1/2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-sm font-semibold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
              </span>
              Now accepting partners across India
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6">
              Turn your empty <br className="hidden lg:block"/>
              space into <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">extra income.</span>
            </h1>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-lg">
              Join thousands of hotels, cafes, and local shops earning passive income by securely storing luggage for travelers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login" className="inline-flex justify-center items-center px-8 py-4 bg-purple-600 text-white text-lg font-semibold rounded-2xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 hover:-translate-y-1">
                Start Earning Today
              </Link>
              <a href="#how-it-works" className="inline-flex justify-center items-center px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-2xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
                How it works
              </a>
            </div>
            <div className="mt-10 flex items-center gap-4 text-sm text-gray-500 font-medium">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-400">P</div>
                ))}
              </div>
              <span>Trusted by 500+ local businesses</span>
            </div>
          </div>

          {/* Abstract CSS Art Hero Graphic */}
          <div className="lg:w-1/2 relative w-full h-[500px] flex items-center justify-center">
            {/* The Vault / Abstract Lockers */}
            <div className="relative w-full max-w-md aspect-square perspective-1000">
              {/* Decorative rings */}
              <div className="absolute inset-0 border-[40px] border-gray-50 rounded-full animate-[spin_60s_linear_infinite]"></div>
              <div className="absolute inset-8 border-[2px] border-dashed border-purple-200 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
              
              {/* Center composition */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Main vault box */}
                <div className="relative w-64 h-64 bg-white rounded-3xl shadow-2xl shadow-purple-900/10 border border-gray-100 flex flex-col p-6 overflow-hidden transform hover:scale-105 transition-transform duration-500">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-blue-50 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
                  
                  {/* Grid of mini lockers inside the vault */}
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-inner relative overflow-hidden group">
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,1)]"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/80 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                      <span className="text-gray-400 font-bold text-sm">EMPTY</span>
                    </div>

                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                      <span className="text-gray-400 font-bold text-sm">EMPTY</span>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-inner relative overflow-hidden group">
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,1)]"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                         <svg className="w-8 h-8 text-white/80 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="h-2 w-16 bg-gray-200 rounded-full"></div>
                    <div className="text-xs font-bold text-purple-600 tracking-widest">SECURE</div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -right-8 top-12 bg-white px-4 py-3 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">New Booking</div>
                      <div className="text-sm font-bold text-gray-900">+ ₹200.00</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -left-12 bottom-20 bg-gray-900 px-4 py-3 rounded-2xl shadow-xl shadow-gray-900/20 border border-gray-800 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xl">
                      🛡️
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Insured Storage</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works & Benefits */}
      <section id="how-it-works" className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Zero Investment, Pure Profit.</h2>
            <p className="text-lg text-gray-500">StashInn handles the marketing, booking, and payments. You just provide the secure space and verify the luggage.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl font-black text-purple-600">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">List your space</h3>
              <p className="text-gray-500 leading-relaxed">Register your business, set your operating hours, and define how many bags you can safely store.</p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
              <div className="hidden md:block absolute top-12 -left-4 w-8 h-[2px] bg-gray-200"></div>
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl font-black text-purple-600">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Receive Luggage</h3>
              <p className="text-gray-500 leading-relaxed">Customers book online. They drop off their bags at your location and verify using a secure OTP.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
               <div className="hidden md:block absolute top-12 -left-4 w-8 h-[2px] bg-gray-200"></div>
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl font-black text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Get Paid Weekly</h3>
              <p className="text-gray-500 leading-relaxed">Payments are processed automatically. Earnings are deposited directly to your bank account every week.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer CTA */}
      <footer className="bg-gray-900 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-6">Ready to maximize your space?</h2>
        <Link href="/login" className="inline-flex px-8 py-4 bg-purple-500 text-white font-semibold rounded-full hover:bg-purple-400 transition-colors">
          Join StashInn Partner Network
        </Link>
      </footer>
    </div>
  );
}
