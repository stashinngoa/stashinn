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
    // Return to the page the middleware bounced them from (same-site paths only)
    const next = String(formData.get('next') || '');
    return redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
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

const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3000';

const ICON = {
  rupee: 'M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  bag: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  car: 'M8 17a2 2 0 11-4 0 2 2 0 014 0zM20 17a2 2 0 11-4 0 2 2 0 014 0zM4 17H3v-5l2-5h10l4 5h2v5h-1M8 17h8M5 12h14',
  store: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  check: 'M5 13l4 4L19 7',
  pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
} as const;

function Icon({ name, className = 'w-5 h-5' }: { name: keyof typeof ICON; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICON[name]} />
    </svg>
  );
}

const STEPS = [
  { title: 'Apply online', body: 'Tell us about your business and add your storage locations. Takes about 10 minutes.' },
  { title: 'Get verified', body: 'Our team reviews your documents and location, then your listing goes live.' },
  { title: 'Accept bookings', body: 'Travellers book on StashInn. You accept requests, and bags are handed over with a one-time code.' },
  { title: 'Get paid', body: 'Pay-at-location bookings are paid to you directly. Online payments are settled to your bank each month.' },
];

const BENEFITS: { icon: keyof typeof ICON; title: string; body: string }[] = [
  { icon: 'rupee', title: 'No upfront cost', body: 'No listing or joining fees. StashInn only takes a commission on completed bookings.' },
  { icon: 'clock', title: 'You stay in control', body: 'Set your own opening hours, capacity and prices for each location.' },
  { icon: 'shield', title: 'Safe handovers', body: 'Every drop-off and pick-up is confirmed with a one-time code, with photos for vehicles.' },
  { icon: 'chart', title: 'Everything in one place', body: 'Manage requests, check-ins and earnings from your partner dashboard.' },
];

const FAQS = [
  { q: 'What kind of space do I need?', a: 'Any secure, staffed area where bags can be kept safely during your opening hours: a storeroom, back office or behind a counter. For vehicle parking, an attended lot or private parking area.' },
  { q: 'How much can I earn?', a: 'You set an hourly rate per bag or vehicle for each location. StashInn deducts a commission on completed bookings, and you keep the rest.' },
  { q: 'When do I get paid?', a: 'For pay-at-location bookings you collect payment from the customer directly. For online payments, your share is settled to your bank account monthly; you can track it under Earnings in your dashboard.' },
  { q: 'Can I decline a booking?', a: 'Yes. You see every request first and can accept or decline it, for example when you are out of space.' },
  { q: 'What happens if something is damaged?', a: 'Report it from your dashboard with photos. Our team reviews every claim and works with you and the customer to resolve it.' },
];

function MarketingLandingView({ loginAction }: { loginAction: (formData: FormData) => Promise<void> }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors selection:bg-orange-200 dark:selection:bg-orange-900 font-inter">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-900">
        <div className="w-full flex items-center justify-between gap-3 px-4 md:px-8 lg:px-12 py-3">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img src="/StashInn_Light_no_text.png" alt="" className="h-8 md:h-10 w-auto dark:hidden" />
            <img src="/StashInn_Dark_no_text.png" alt="" className="h-8 md:h-10 w-auto hidden dark:block" />
            <span className="text-lg md:text-2xl font-black tracking-tighter shrink-0">
              <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
            </span>
            <span className="hidden sm:inline text-[10px] md:text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60 px-2 py-0.5 rounded-md">Partner</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-4">
            <a href="#how-it-works" className="hidden md:inline text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">How it works</a>
            <a href="#faq" className="hidden md:inline text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">FAQ</a>
            <ThemeToggle />
            <Link href="/register" className="inline-flex items-center px-4 py-2 md:px-5 md:py-2.5 text-sm font-bold text-white rounded-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-500 shadow-sm whitespace-nowrap">
              Become a partner
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero + sign in */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-40 w-[560px] h-[560px] bg-orange-300/30 dark:bg-orange-900/25 blur-[140px] rounded-full" />
          <div className="absolute top-20 -right-40 w-[520px] h-[520px] bg-amber-300/25 dark:bg-amber-900/20 blur-[140px] rounded-full" />
        </div>

        <div className="relative w-full px-4 md:px-8 lg:px-12 pt-10 md:pt-20 pb-16 md:pb-24 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/50 border border-orange-200/70 dark:border-orange-800/50 text-orange-700 dark:text-orange-300 text-xs md:text-sm font-semibold">
              <Icon name="pin" className="w-4 h-4" />
              Now onboarding partners in Goa
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 dark:text-white tracking-tight leading-[1.05]">
              Earn from the space you <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">already have.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Store luggage, and park vehicles, for travellers exploring Goa. StashInn brings you the bookings and handles payments; you provide a safe spot.
            </p>

            <ul className="mt-7 grid sm:grid-cols-2 gap-x-6 gap-y-3 max-w-2xl mx-auto lg:mx-0 text-left">
              {['No joining or listing fees', 'Set your own hours and capacity', 'One-time code for every handover', 'Track bookings and earnings online'].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Icon name="check" className="w-3.5 h-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* On phones the nav button and the sign-in card already link to registration */}
            <div className="mt-8 hidden sm:flex flex-row gap-3 justify-center lg:justify-start">
              <Link href="/register" className="inline-flex justify-center items-center whitespace-nowrap px-6 xl:px-7 py-3.5 text-base font-bold text-white rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-500/25 transition-transform hover:-translate-y-0.5">
                Apply to become a partner
              </Link>
              <a href="#how-it-works" className="inline-flex justify-center items-center whitespace-nowrap px-6 xl:px-7 py-3.5 text-base font-bold text-gray-900 dark:text-white rounded-2xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                See how it works
              </a>
            </div>
          </div>

          <div className="w-full flex justify-center">
            <InlineLoginForm loginAction={loginAction} />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-y border-gray-100 dark:border-gray-900 bg-gray-50/60 dark:bg-gray-900/30">
        <div className="w-full px-4 md:px-8 lg:px-12 py-8 flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0">Ideal for</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {[
              { icon: 'store' as const, label: 'Hotels & guesthouses' },
              { icon: 'store' as const, label: 'Cafés & restaurants' },
              { icon: 'bag' as const, label: 'Shops & travel agents' },
              { icon: 'car' as const, label: 'Private parking & garages' },
            ].map(w => (
              <span key={w.label} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Icon name={w.icon} className="w-4 h-4 text-orange-500" />
                {w.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-20 md:py-24">
        <div className="w-full px-4 md:px-8 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">How it works</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">From application to first booking</h2>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white text-lg font-black flex items-center justify-center">{i + 1}</span>
                <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 md:py-24 bg-gray-50 dark:bg-gray-900/40 border-y border-gray-100 dark:border-gray-900">
        <div className="w-full px-4 md:px-8 lg:px-12 grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16 items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Why StashInn</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">Extra income, without extra work</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              We bring travellers to your door and take care of booking and payments. You keep running your business.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS.map(b => (
              <div key={b.title} className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <span className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Icon name={b.icon} />
                </span>
                <h3 className="mt-4 font-bold text-gray-900 dark:text-white">{b.title}</h3>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-20 md:py-24">
        <div className="w-full px-4 md:px-8 lg:px-12 grid lg:grid-cols-[1fr_1.6fr] gap-8 lg:gap-16 items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">FAQ</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">Questions partners ask</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              Something else on your mind? Write to{' '}
              <a href="mailto:support@stashinn.in" className="font-semibold text-orange-600 dark:text-orange-400 hover:underline">support@stashinn.in</a>.
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800">
            {FAQS.map(f => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-bold text-gray-900 dark:text-white">
                  {f.q}
                  <span className="w-7 h-7 shrink-0 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 md:px-8 lg:px-12 pb-20">
        <div className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 px-6 py-14 md:py-16 text-center text-white shadow-xl shadow-orange-500/20">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10" aria-hidden="true" />
          <div className="absolute -left-10 -bottom-20 w-48 h-48 rounded-full bg-white/10" aria-hidden="true" />
          <h2 className="relative text-3xl md:text-4xl font-extrabold">Ready to put your space to work?</h2>
          <p className="relative mt-3 text-white/90 max-w-xl mx-auto">Apply in minutes. We&apos;ll review your details and help you get your first location live.</p>
          <Link href="/register" className="relative mt-8 inline-flex px-8 py-3.5 rounded-full bg-white text-orange-700 font-bold hover:bg-orange-50 shadow-lg transition-transform hover:scale-105">
            Become a partner
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-900 bg-gray-50 dark:bg-black">
        <div className="w-full px-4 md:px-8 lg:px-12 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <img src="/StashInn_Light_no_text.png" alt="" className="h-8 w-auto dark:hidden" />
              <img src="/StashInn_Dark_no_text.png" alt="" className="h-8 w-auto hidden dark:block" />
              <span className="text-lg font-black tracking-tighter"><span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span></span>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs">Short-term luggage and vehicle storage for travellers in Goa.</p>
            <a href="mailto:support@stashinn.in" className="mt-3 inline-block text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline">support@stashinn.in</a>
          </div>
          {[
            { title: 'Partners', links: [['Become a partner', '/register'], ['How it works', '#how-it-works'], ['FAQ', '#faq']] },
            { title: 'Hosting', links: [['Hosting resources', `${CUSTOMER_URL}/hosting-resources`], ['Hosting responsibly', `${CUSTOMER_URL}/hosting-responsibly`], ['Community forum', `${CUSTOMER_URL}/community-forum`], ['Safety', `${CUSTOMER_URL}/safety`]] },
            { title: 'StashInn', links: [['Book storage', CUSTOMER_URL], ['Help centre', `${CUSTOMER_URL}/help`], ['Careers', `${CUSTOMER_URL}/careers`], ['Newsroom', `${CUSTOMER_URL}/newsroom`]] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{col.title}</h4>
              <ul className="mt-3 space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
                {col.links.map(([label, href]) => (
                  <li key={label}><a href={href} className="hover:text-orange-600 dark:hover:text-orange-400">{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 dark:border-gray-900">
          <p className="w-full px-4 md:px-8 lg:px-12 py-5 text-xs text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} StashInn. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
