'use client';

import Link from 'next/link';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

export default function HostingResponsiblyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-24 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 mb-4">
              Trust, Ethics & Compliance
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              Hosting Responsibly with StashInn
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Our community thrives when every host maintains gold-standard security, legal compliance, and warm hospitality. Learn our partner standards and operating commitments.
            </p>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm shadow-sm">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verified Commercial Partners • Zero Off-Platform Fees • Safe Custody SOP
            </div>
          </div>
        </section>

        {/* 5 Core Standards */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              The 5 Pillars of Responsible Hosting
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              All StashInn partners agree to adhere to these operating commitments as part of their partnership contract.
            </p>
          </div>

          <div className="space-y-8">
            {/* Standard 1 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xl shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Legitimate Commercial Premises & Compliance
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  StashInn storage points must be registered commercial businesses (such as hotels, registered shops, travel agencies, or cafes) governed by Indian commercial regulations (e.g. Shops and Commercial Establishments Act, GST registration where applicable).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Secure, pest-free, dry storage area.
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Never block fire escapes or emergency exits.
                  </div>
                </div>
              </div>
            </div>

            {/* Standard 2 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xl shrink-0">
                2
              </div>
              <div className="flex-1">
                <div className="inline-block text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full mb-2">
                  Strict Zero-Tolerance
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  No Cash & No Offline Payments
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  All customer payments, storage fees, bag surcharges, and extension payments must be processed 100% online through the StashInn platform. Partner staff are strictly prohibited from demanding or accepting offline cash.
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                  ⚠️ Demanding cash or off-platform surcharges leads to instant termination of partnership and forfeiture of pending settlement balances.
                </p>
              </div>
            </div>

            {/* Standard 3 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xl shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Tamper Seals & Right of Visual Inspection
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Every stored piece of luggage must be fastened with a complimentary tamper-evident seal upon arrival in front of the customer. Hosts must never open, unzip, or search a customer’s bag privately.
                </p>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <strong>Inspection Protocol:</strong> If a host has reasonable cause to suspect prohibited items (e.g., ticking sounds, suspicious odor, hazardous liquids), the host has the legal right to ask the customer to open the bag in their presence during drop-off before accepting custody.
                </div>
              </div>
            </div>

            {/* Standard 4 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xl shrink-0">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Staff Training & Point of Contact (POC) Delegation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Store owners must ensure all front-desk staff, receptionists, and cashiers are trained to execute the check-in and pick-up procedure.
                </p>
                <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-orange-500 font-bold">•</span> Register shift workers as POCs under your Partner Dashboard &gt; Staff.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-orange-500 font-bold">•</span> Never hand over luggage without verifying the customer’s pickup code.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-orange-500 font-bold">•</span> Keep store operating hours accurate to avoid stranding travelers.
                  </li>
                </ul>
              </div>
            </div>

            {/* Standard 5 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xl shrink-0">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Unclaimed Luggage Protocol (SOP)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  If a traveler fails to collect their bags by the agreed drop-off end time, hosts must follow our standard operating procedure:
                </p>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                    <strong>1. Immediate Notification:</strong> Mark the booking as &quot;Overdue / Unclaimed&quot; in your Partner Portal or call our Partner Support Line.
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                    <strong>2. 48-Hour Safe Custody:</strong> StashInn support contacts the traveler via SMS, phone, and emergency contacts to arrange late retrieval or authorized courier.
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                    <strong>3. Police Handover:</strong> Unclaimed luggage remaining after 7 business days is formally deposited with the nearest local police station with a police acknowledgment receipt.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Host Protection Banner */}
        <section className="bg-white dark:bg-gray-900 py-16 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
              We Stand Behind Our Partners
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              StashInn provides partner liability protection and fair arbitration. If an unjustified customer dispute arises, our Trust &amp; Safety team evaluates CCTV footage, check-in seal serials, and timestamps to protect honest hosts.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"}
                className="px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg"
              >
                Access Partner Dashboard →
              </a>
              <Link
                href="/hosting-resources"
                className="px-6 py-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                View Operational Tools
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SupportFooter />
    </div>
  );
}
