'use client';

import { useState } from 'react';
import Link from 'next/link';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

export default function ReportConcernPage() {
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bookingId: '',
    concernType: 'location_closed',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedTicket = 'STASH-' + Math.floor(100000 + Math.random() * 900000);
    setTicketId(generatedTicket);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-24 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 mb-4">
              Trust & Resolution
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              Report a Concern or Incident
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              We take safety, partner conduct, and luggage care seriously. If you encountered an issue at a storage point, let us know immediately.
            </p>

            {/* Emergency Hotline Banner for Travelers on site */}
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/60 shadow-md text-left">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Stranded or currently at the host location?</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Call our live emergency hotline for instant assistance: <a href="tel:+919990092171" className="font-bold text-orange-600 dark:text-orange-400 hover:underline">+91 99900 92171</a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Col - Dashboard Dispute vs General Info */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 p-6 rounded-3xl">
                <span className="text-xs font-bold uppercase text-orange-700 dark:text-orange-400 tracking-wider">
                  Logged In Customer?
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1 mb-2">
                  Have a Completed Booking?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  If you have an active or past booking and need to file a formal claim with photo proof of damage or partner disputes, file it directly through your dashboard.
                </p>
                <Link
                  href="/dashboard/disputes"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all shadow-sm"
                >
                  Go to Dashboard Disputes →
                </Link>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Common Concerns We Arbitrate
                </h3>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2.5">
                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                    <span><strong>Partner Location Closed:</strong> Host is not at the location or doors are locked during advertised working hours.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                    <span><strong>Unauthorized Charges:</strong> Host demanded offline cash or unexpected fees (StashInn has a zero-tolerance policy).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                    <span><strong>Tamper Seal Broken / Damage:</strong> Security tag showed signs of tampering upon retrieval.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                    <span><strong>Forgotten Luggage:</strong> You were unable to pick up your luggage prior to closing time.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Our Resolution Commitment
                </h3>
                <div className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                    <span>Live On-Site Blocker</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">15 – 30 Minutes</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                    <span>Dispute & Claim Review</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">Within 24 Hours</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span>Refund Arbitration Payout</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">24 – 48 Hours</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col - Report Concern Form */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 md:p-10 shadow-sm">
                {submitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                      ✓
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Concern Registered
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      Thank you for reporting this. Your ticket ID is <strong className="text-orange-600 dark:text-orange-400 font-mono text-base">{ticketId}</strong>. A support specialist has been alerted and will reach out via email or phone shortly.
                    </p>
                    <div className="pt-6">
                      <button
                        onClick={() => {
                          setSubmitted(false);
                          setFormData({ name: '', email: '', phone: '', bookingId: '', concernType: 'location_closed', description: '' });
                        }}
                        className="px-6 py-2.5 rounded-full border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Submit Another Concern
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
                        Submit a Concern Ticket
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Fill out the details below. Our support team reviews all inquiries promptly.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Snehal Sharma"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@example.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Contact Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Booking ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.bookingId}
                          onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                          placeholder="e.g. bkg_12345 or leave blank"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Type of Concern *
                      </label>
                      <select
                        value={formData.concernType}
                        onChange={(e) => setFormData({ ...formData, concernType: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      >
                        <option value="location_closed">Partner store is closed / Host unreachable</option>
                        <option value="unauthorized_charge">Host demanded offline cash or unfair fees</option>
                        <option value="seal_tampered">Security seal broken or item damaged</option>
                        <option value="forgotten_item">Forgotten luggage or delayed pick-up assistance</option>
                        <option value="staff_misconduct">Partner staff misconduct / poor service</option>
                        <option value="other">Other issue</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Describe What Happened *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Please include details such as time of arrival, location name, and host interaction..."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg"
                    >
                      Submit Concern Ticket
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SupportFooter />
    </div>
  );
}
