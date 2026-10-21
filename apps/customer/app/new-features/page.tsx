'use client';

import { useState } from 'react';
import Link from 'next/link';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

interface Release {
  version: string;
  date: string;
  tag: string;
  title: string;
  features: {
    title: string;
    description: string;
    badge?: string;
  }[];
}

const RELEASES: Release[] = [
  {
    version: 'v2.4',
    date: 'October 2026',
    tag: 'Latest Release',
    title: 'Instant Terminal Verification & Automated Razorpay Refunds',
    features: [
      {
        title: 'Instant OTP & QR Check-in Terminal',
        description: 'Check-in and retrieval now take under 45 seconds. Partners scan your digital QR code or enter your 6-digit OTP to instantly verify paid status and attach security seals.',
        badge: 'Traveler & Partner'
      },
      {
        title: 'Automated 100% Razorpay Refunds',
        description: 'Cancelling 12+ hours before your drop-off now triggers an immediate reverse UPI/card settlement via Razorpay with zero manual support intervention.',
        badge: 'Payments'
      },
      {
        title: 'Native Dark Mode Theme',
        description: 'Complete high-contrast dark theme support across the entire StashInn booking and search experience for comfortable low-light browsing.',
        badge: 'UI/UX'
      }
    ]
  },
  {
    version: 'v2.2',
    date: 'August 2026',
    tag: 'Major Update',
    title: 'Garage Mode: Parking for Two-Wheelers, Sedans & SUVs',
    features: [
      {
        title: 'Vehicle & Garage Storage Mode',
        description: 'In addition to luggage, commuters and travelers can now search and book verified, secure commercial parking spots for bikes and cars near busy transit stations.',
        badge: 'New Product'
      },
      {
        title: 'In-Dashboard Dispute & Damage Portal',
        description: 'File formal complaints with photo evidence directly from your Customer Dashboard. Our Trust & Safety team resolves arbitrations within 24-48 hours.',
        badge: 'Trust & Safety'
      }
    ]
  },
  {
    version: 'v2.0',
    date: 'June 2026',
    tag: 'Milestone',
    title: 'Tamper-Evident Security Seals & Protection Guarantee',
    features: [
      {
        title: 'Free Tamper-Evident Barcode Seals',
        description: 'Every stored bag is secured with a numbered single-use tamper-evident seal upon arrival. The seal cannot be removed without showing visible physical breakage.',
        badge: 'Security'
      },
      {
        title: '₹10,000 StashInn Protection Guarantee',
        description: 'Every completed reservation is automatically backed by our financial protection guarantee covering verified damage, loss, or theft.',
        badge: 'Coverage'
      },
      {
        title: 'Point of Contact (POC) Staff Delegation',
        description: 'Partner hosts can now add employees as authorized POCs to handle customer luggage check-in without exposing earnings or banking records.',
        badge: 'Partner Ops'
      }
    ]
  }
];

export default function NewFeaturesPage() {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  const handleFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setSuggestion('');
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
              Changelog & Product Updates
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              What&apos;s New in StashInn
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              We ship continuous improvements to make luggage storage faster, safer, and simpler. Explore our latest platform releases and upcoming roadmap.
            </p>

            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md"
            >
              Try New Features in Search →
            </Link>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="space-y-12">
            {RELEASES.map((rel, idx) => (
              <div key={rel.version} className="relative pl-8 md:pl-10 border-l-2 border-orange-200 dark:border-orange-900/60">
                {/* Timeline node */}
                <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-orange-500 border-4 border-white dark:border-gray-900 shadow-sm" />

                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-sm font-extrabold text-orange-600 dark:text-orange-400">{rel.version}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{rel.date}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
                    {rel.tag}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">
                  {rel.title}
                </h2>

                <div className="space-y-4">
                  {rel.features.map((feat, fIdx) => (
                    <div
                      key={fIdx}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">
                          {feat.title}
                        </h3>
                        {feat.badge && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {feat.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap Preview */}
        <section className="bg-white dark:bg-gray-900 py-16 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/60 px-3 py-1 rounded-full">
                What&apos;s Coming Next
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mt-3">
                Upcoming on Our Roadmap
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <span className="text-2xl mb-2 block">🚚</span>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Station-to-Hotel Transfer</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Have your luggage picked up from the railway cloakroom and delivered straight to your hotel room.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <span className="text-2xl mb-2 block">💬</span>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Live Host ETA Chat</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Real-time in-app messaging between traveler and host for smooth late-night arrivals.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <span className="text-2xl mb-2 block">🏢</span>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Corporate Travel Accounts</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Centralized billing, bulk monthly invoices, and priority storage for business teams on work trips.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Suggestion Form */}
        <section className="max-w-3xl mx-auto px-6 py-16">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-gray-900 border border-orange-200 dark:border-orange-900/50 rounded-3xl p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Have an Idea for a Feature?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              We build StashInn directly with feedback from travelers and partners. Tell us what would make your journey even easier.
            </p>

            {feedbackSent ? (
              <div className="p-4 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-sm font-semibold">
                ✓ Thank you for your feedback! Our product team reviews every submission.
              </div>
            ) : (
              <form onSubmit={handleFeedback} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="text"
                  required
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="e.g. Add WhatsApp booking updates..."
                  className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow transition-all shrink-0"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <SupportFooter />
    </div>
  );
}
