'use client';

import { useState } from 'react';
import Link from 'next/link';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

export default function HostingResourcesPage() {
  const [bagsPerDay, setBagsPerDay] = useState(15);
  const [daysPerMonth, setDaysPerMonth] = useState(30);

  // Approximate host earning per bag per day: ₹50 - ₹70 net host payout
  const estimatedEarnings = bagsPerDay * daysPerMonth * 60;
  // Estimated secondary footfall sales (approx ₹40 profit per customer if cafe/retail)
  const estimatedFootfallUpsell = Math.round(bagsPerDay * daysPerMonth * 0.4 * 50);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-24 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 mb-4">
              Partner Hub
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              Hosting Resources & Operational Playbook
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Everything you need to turn unused space into steady passive income. Access operational guidelines, staff training materials, and earnings estimators.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"}
                className="px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg"
              >
                Go to Partner Portal →
              </a>
              <a
                href="#calculator"
                className="px-6 py-3 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
              >
                Estimate Earnings
              </a>
            </div>
          </div>
        </section>

        {/* Interactive Earnings Estimator */}
        <section id="calculator" className="max-w-5xl mx-auto px-6 py-16">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 md:p-12 shadow-sm">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
                How Much Can You Earn?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Monetize your empty storage room, hotel cloakroom, or cafe corner with zero upfront capital.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Average Bags Stored Per Day:
                    </label>
                    <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                      {bagsPerDay} bags
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="60"
                    step="1"
                    value={bagsPerDay}
                    onChange={(e) => setBagsPerDay(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>3 bags (Small cafe)</span>
                    <span>30 bags (Hotel)</span>
                    <span>60 bags (Transit Hub)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Operating Days Per Month:
                    </label>
                    <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                      {daysPerMonth} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="30"
                    step="1"
                    value={daysPerMonth}
                    onChange={(e) => setDaysPerMonth(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>15 days</span>
                    <span>30 days (Full month)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 text-xs text-gray-600 dark:text-gray-400">
                  💡 <strong>Footfall Advantage:</strong> 40% of luggage storage travelers make an auxiliary purchase (coffee, snacks, water, gifts, or local travel goods) at the partner store during drop-off or pick-up.
                </div>
              </div>

              <div className="lg:col-span-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-3xl p-8 text-center shadow-lg">
                <span className="text-xs uppercase font-bold tracking-widest text-orange-200">
                  Estimated Monthly Income
                </span>
                <div className="text-4xl md:text-5xl font-black mt-2 mb-1">
                  ₹{estimatedEarnings.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-orange-100 mb-6">
                  + approx. ₹{estimatedFootfallUpsell.toLocaleString('en-IN')} in store footfall sales
                </p>

                <div className="pt-6 border-t border-orange-400/40 space-y-2 text-xs text-left text-orange-100">
                  <div className="flex justify-between">
                    <span>Direct Weekly Settlement:</span>
                    <strong className="text-white">Every Monday</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tamper-evident seals:</span>
                    <strong className="text-white">Supplied Free</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Host protection cap:</span>
                    <strong className="text-white">Up to ₹10,000/bag</strong>
                  </div>
                </div>

                <a
                  href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"}
                  className="mt-6 block w-full py-3 rounded-full bg-white text-orange-600 font-extrabold text-sm hover:bg-orange-50 transition-colors shadow"
                >
                  Apply as Partner Now
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Operational Checklist */}
        <section className="bg-white dark:bg-gray-900 py-16 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/60 px-3 py-1 rounded-full">
                Standard Operating Procedure (SOP)
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-3">
                3-Step Host Check-in & Retrieval Protocol
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Handling luggage requires less than 90 seconds per customer using your Partner Portal dashboard.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Verify Booking</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  When customer arrives, ask for their StashInn booking voucher on their phone. Enter or scan their OTP on your <strong>Partner Booking Terminal</strong> to confirm paid status.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Apply Security Seal</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Fasten a complimentary numbered tamper-evident seal through the main bag zipper pulls in front of the customer. Stash the bag in your secured, staff-only room.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Verified Handoff</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  At pickup, verify the customer’s pickup code and inspect the seal together before release. Mark booking as <strong>Completed</strong> in your dashboard for immediate settlement.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Host Resources & Downloads */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Partner Toolkits & Assets
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Staff Training Guide & POCs</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Learn how to register Point of Contact (POC) staff in your dashboard so your shift attendants can check in bags safely without access to financial data.
                </p>
                <Link href="/hosting-responsibly" className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                  Read compliance & staff guidelines →
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Host Community Forum</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Connect with experienced hotel managers, store owners, and super-hosts across India. Share space-saving tips and ask questions.
                </p>
                <Link href="/community-forum" className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                  Join the Community Forum →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SupportFooter />
    </div>
  );
}
