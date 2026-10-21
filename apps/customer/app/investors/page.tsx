'use client';

import { useState } from 'react';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

export default function InvestorsPage() {
  const [deckRequested, setDeckRequested] = useState(false);
  const [formData, setFormData] = useState({ name: '', fund: '', email: '', message: '' });

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setDeckRequested(true);
    setTimeout(() => {
      setDeckRequested(false);
      setFormData({ name: '', fund: '', email: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-24 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 mb-4">
              Investor Relations
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              Unlocking India&apos;s Urban Space Economy
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              StashInn is building an asset-light, decentralized storage and logistics infrastructure that turns spare square footage into profitable urban utility.
            </p>

            <a
              href="#deck-form"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md"
            >
              Request Investor Overview Deck ↓
            </a>
          </div>
        </section>

        {/* Growth & Key Metrics */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-orange-600 dark:text-orange-400 mb-1">
                350+
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                Verified Storage Points
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-orange-600 dark:text-orange-400 mb-1">
                50,000+
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                Bags Stored Safely
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-orange-600 dark:text-orange-400 mb-1">
                4.8★
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                Customer Satisfaction
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-orange-600 dark:text-orange-400 mb-1">
                Zero
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                Capex Fleet Model
              </div>
            </div>
          </div>
        </section>

        {/* Investment Pillars */}
        <section className="bg-white dark:bg-gray-900 py-16 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/60 px-3 py-1 rounded-full">
                Value Proposition
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-3">
                Why StashInn Is Scaling Rapidly
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Massive TAM & Transit Demand</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Indian Railways and domestic aviation transport over 10 million passengers every single day. A vast majority experience gap hours between hotel checkout and departure.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Asset-Light Unit Economics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  We own no real estate and maintain zero warehouses. By aggregating spare square footage in hotels, retail shops, and cafes, our margins scale exponentially with network density.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Multi-Modal Expansion</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Our network architecture extends seamlessly from luggage storage to garage vehicle parking and micro-warehousing, unlocking high customer lifetime value.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Investor Contact & Deck Request Form */}
        <section id="deck-form" className="max-w-3xl mx-auto px-6 py-16">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="text-center max-w-md mx-auto mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                Connect with Investor Relations
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Institutional funds, angel syndicates, and venture partners can request our latest investor memo and financial deck.
              </p>
            </div>

            {deckRequested ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <div className="text-emerald-600 dark:text-emerald-400 text-3xl font-bold">✓</div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">Request Sent Successfully</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Our founders and investor relations team will review your inquiry and dispatch the investor deck within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequest} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Iyer"
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      Fund / Firm Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fund}
                      onChange={(e) => setFormData({ ...formData, fund: e.target.value })}
                      placeholder="e.g. Peak Capital / Angel"
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@fund.com"
                    className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                    Message / Investment Stage Interest
                  </label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Share specific areas of interest (e.g. Seed round, unit economics, geographic expansion)..."
                    className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow transition-all"
                >
                  Request Investor Deck & Schedule Call
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-gray-400">Direct Inquiries: </span>
                  <a href="mailto:ir@stashinn.in" className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">
                    ir@stashinn.in
                  </a>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      <SupportFooter />
    </div>
  );
}
