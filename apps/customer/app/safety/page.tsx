'use client';

import Link from 'next/link';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

export default function SafetyInformationPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-24 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 mb-4">
              Trust & Security
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              Your Luggage Safety is Our #1 Priority
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              We understand the value of your possessions. Learn how StashInn protects your belongings through multi-layer verification, tamper-evident seals, and secure storage guarantees.
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm text-gray-700 dark:text-gray-300">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                100% Vetted Partners
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm text-gray-700 dark:text-gray-300">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Free Tamper-Evident Seals
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm text-gray-700 dark:text-gray-300">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Up to ₹10,000 Protection
              </span>
            </div>
          </div>
        </section>

        {/* 4 Pillars of StashInn Security */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              The 4 Pillars of StashInn Security
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Every detail is engineered so you can travel hands-free with absolute peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pillar 1 */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                1. Rigorous Partner Vetting & Physical Audits
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We do not partner with random individuals. Every StashInn partner is an established commercial entity—hotels, boutique guest houses, certified luggage cloakrooms, and verified retail shops.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Government business registration & owner identity verification.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Physical inspection of storage premises before activation.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Dedicated staff-only non-public storage rooms or CCTV coverage.
                </li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                2. Free Tamper-Evident Security Seals
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                To guarantee that your zippers remain untouched while stored, every bag is fastened with a uniquely numbered security seal at the time of drop-off.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Single-use numbered seals cannot be reopened without breaking.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Unique serial number registered in your booking check-in log.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Seal verified by you before taking custody of your bags.
                </li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                3. Secure OTP & QR Two-Way Verification
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We eliminate the risk of bag mix-ups with automated cryptographic check-in and pick-up confirmation.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Exclusive pickup code issued only to your account and phone number.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Bags are only handed back once the security code matches the system.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> No unauthorized third-party handoffs without customer consent.
                </li>
              </ul>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                4. StashInn Protection Guarantee (Up to ₹10,000)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Every booking completed through StashInn is automatically backed by our financial protection guarantee for maximum reassurance.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Protection against verified theft, loss, or mishandling.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Fast-track investigation with partner security logs and CCTV.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">✓</span> Dedicated arbitration handled by our Customer Trust & Safety team.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Prohibited Items Section */}
        <section className="bg-white dark:bg-gray-900 py-16 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-3 py-1 rounded-full">
                Strict Compliance
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mt-3">
                Prohibited Items for Storage
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                In compliance with the laws of India and our host safety policies, the following items may not be placed in stored luggage:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-red-900 dark:text-red-200">
                <span className="text-lg">🚫</span>
                <div>
                  <strong className="block font-semibold">Firearms, Explosives & Weapons</strong>
                  <span className="text-xs text-red-700 dark:text-red-300">Guns, ammunition, fireworks, knives, or hazardous items.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-red-900 dark:text-red-200">
                <span className="text-lg">🚫</span>
                <div>
                  <strong className="block font-semibold">Flammable & Toxic Chemicals</strong>
                  <span className="text-xs text-red-700 dark:text-red-300">Fuels, paint thinners, compressed gas, acid, corrosive substances.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-red-900 dark:text-red-200">
                <span className="text-lg">🚫</span>
                <div>
                  <strong className="block font-semibold">Illegal Narcotics & Contraband</strong>
                  <span className="text-xs text-red-700 dark:text-red-300">Banned drugs, controlled substances, smuggled or stolen goods.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-red-900 dark:text-red-200">
                <span className="text-lg">🚫</span>
                <div>
                  <strong className="block font-semibold">Loose Cash, Bullion & High-Value Gems</strong>
                  <span className="text-xs text-red-700 dark:text-red-300">Loose currency notes, gold bars, unmounted precious stones.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-red-900 dark:text-red-200">
                <span className="text-lg">🚫</span>
                <div>
                  <strong className="block font-semibold">Perishable Food & Malodorous Goods</strong>
                  <span className="text-xs text-red-700 dark:text-red-300">Raw meat, fish, open food that can spoil or attract pests.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-red-900 dark:text-red-200">
                <span className="text-lg">🚫</span>
                <div>
                  <strong className="block font-semibold">Live Animals & Biological Material</strong>
                  <span className="text-xs text-red-700 dark:text-red-300">Pets, animals, reptiles, or biological specimens.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Traveler Safety Checklist */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-gray-900 p-8 md:p-10 rounded-3xl border border-orange-200 dark:border-orange-900/50">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Quick Safety Checklist for Travelers
            </h3>
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">1</div>
                <p><strong>Keep Vital Travel Documents With You:</strong> Passports, flight tickets, visa documents, and daily prescription medicine should always remain in your personal handbag or backpack.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">2</div>
                <p><strong>Confirm the Tamper-Proof Seal:</strong> When handing over your bags, ensure the partner applies the complimentary seal and take a quick photo of the seal number for your records.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">3</div>
                <p><strong>Inspect Bags Before Leaving:</strong> Check that the security seal is intact when picking up your luggage. If you notice any irregularities, notify host staff and contact StashInn support immediately.</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-orange-200 dark:border-orange-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Have a safety question or concern?</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Our trust & safety team responds around the clock.</p>
              </div>
              <Link 
                href="/report-concern"
                className="px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all shadow-sm"
              >
                Report a Concern
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SupportFooter />
    </div>
  );
}
