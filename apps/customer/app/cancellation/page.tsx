'use client';

import Link from 'next/link';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

export default function CancellationOptionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-24 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 mb-4">
              Flexible Booking Policy
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              Cancellation & Refund Options
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Travel plans change. We offer hassle-free, transparent cancellations with 100% full refunds when notified ahead of time.
            </p>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              100% Full Refund if cancelled 12+ hours prior to scheduled drop-off
            </div>
          </div>
        </section>

        {/* Policy Grid */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Cancellation Windows & Terms
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Here is how refunds work based on when you request cancellation:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Window 1 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border-2 border-emerald-500 dark:border-emerald-500/80 shadow-md relative flex flex-col">
              <span className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-white text-xs font-bold uppercase rounded-full">
                Full Refund
              </span>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm uppercase tracking-wider mb-2">
                12+ Hours Notice
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">100% Refund</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 flex-1">
                Cancel any booking at least 12 hours before your scheduled drop-off date and time to receive a complete, 100% refund with zero cancellation penalties.
              </p>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                Refund sent directly to your original payment method via Razorpay.
              </div>
            </div>

            {/* Window 2 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
              <div className="text-amber-600 dark:text-amber-400 font-bold text-sm uppercase tracking-wider mb-2">
                Within 12 Hours
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Late Cancellation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 flex-1">
                If cancelled less than 12 hours prior to scheduled drop-off, the booking is non-refundable. Partner hosts hold and reserve space exclusively for your bags, turning away other travelers.
              </p>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                You may reschedule your drop-off time on the same date without cancelling.
              </div>
            </div>

            {/* Window 3 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
              <div className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-wider mb-2">
                After Drop-off
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Active Storage</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 flex-1">
                Once luggage is dropped off and verified at the partner location, the active reservation cannot be cancelled or partially refunded for early pick-up.
              </p>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                You can pick up your luggage early at any time during store opening hours.
              </div>
            </div>
          </div>
        </section>

        {/* Step-by-Step Cancellation Guide */}
        <section className="bg-white dark:bg-gray-900 py-16 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white text-center mb-10">
              How to Cancel Your Booking Online
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-lg mb-4">
                  1
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Open Dashboard</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Log in to your account and go to your <Link href="/dashboard" className="text-orange-600 dark:text-orange-400 underline">Customer Dashboard</Link>.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-lg mb-4">
                  2
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Locate Booking</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Find the upcoming booking card you want to cancel and click the <strong>Cancel Booking</strong> button.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-lg mb-4">
                  3
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Receive Refund</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Confirm the cancellation. If eligible, your refund is automatically triggered to your bank or UPI ID.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Refund Timelines & FAQ */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Refund Timelines by Payment Method
          </h2>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-12">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
                <tr>
                  <th className="py-4 px-6">Payment Method</th>
                  <th className="py-4 px-6">Processing Mechanism</th>
                  <th className="py-4 px-6">Estimated Credit Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-400">
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">UPI (Google Pay, PhonePe, Paytm)</td>
                  <td className="py-4 px-6">Automated Instant Reverse Transfer</td>
                  <td className="py-4 px-6 text-emerald-600 dark:text-emerald-400 font-semibold">24 – 48 Hours</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">Debit / Credit Cards</td>
                  <td className="py-4 px-6">Bank Acquiring Gateway (Razorpay)</td>
                  <td className="py-4 px-6 font-semibold">5 – 7 Business Days</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">Net Banking</td>
                  <td className="py-4 px-6">Direct Interbank Settlement</td>
                  <td className="py-4 px-6 font-semibold">3 – 5 Business Days</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delayed Train or Flight?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You do not need to cancel if your schedule changes slightly. StashInn locations accept late drop-offs anytime within their working hours.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all shrink-0"
            >
              Go to Dashboard
            </Link>
          </div>
        </section>
      </main>

      <SupportFooter />
    </div>
  );
}
