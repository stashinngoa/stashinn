'use client';

import { useState } from 'react';
import Link from 'next/link';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

interface FAQ {
  question: string;
  answer: string;
  category: 'general' | 'booking' | 'safety' | 'luggage';
}

const FAQS: FAQ[] = [
  {
    category: 'general',
    question: 'How does StashInn luggage storage work?',
    answer: 'StashInn connects travelers with verified local hotels, cafes, and shops that have secure, private space to store luggage. 1) Search your desired location, dates, and times. 2) Book online to guarantee your spot. 3) Arrive at the location, show your booking confirmation, and receive a free tamper-proof security seal for each bag. 4) Enjoy your day hands-free and return to collect your bags using your pickup code.'
  },
  {
    category: 'booking',
    question: 'How much does luggage storage cost?',
    answer: 'Storage starts from as low as ₹80 per bag per day. Pricing is completely transparent with no size penalties, surprise fees, or off-platform surcharges. You can also view hourly and vehicle parking rates for enabled partner locations.'
  },
  {
    category: 'safety',
    question: 'Are my bags safe and protected?',
    answer: 'Absolutely. All StashInn partner locations undergo in-person verification and vetting. Every stored bag is sealed with a complimentary tamper-evident barcode seal that cannot be removed without detection. Additionally, bookings are backed by our StashInn Protection Guarantee covering up to ₹10,000 per bag.'
  },
  {
    category: 'luggage',
    question: 'What types and sizes of luggage can I store?',
    answer: 'We accept all sizes: backpacks, cabin luggage, heavy suitcases, duffel bags, baby strollers, and sports bags. There is no strict weight limit as long as the items can be handled normally. We also support garage vehicle parking at selected partner facilities.'
  },
  {
    category: 'luggage',
    question: 'What items are prohibited from storage?',
    answer: 'For your security and in compliance with Indian law, prohibited items include: illegal substances, firearms or weapons, flammable or hazardous chemicals, perishable food items, and unsealed cash or high-value loose jewelry. We advise keeping passports and boarding passes with you.'
  },
  {
    category: 'booking',
    question: 'Can I store luggage for multiple days or weeks?',
    answer: 'Yes! StashInn supports multi-day and long-term storage. When booking, simply select your start and end dates. There is no maximum duration limit.'
  },
  {
    category: 'booking',
    question: 'Why is the exact address revealed only after booking?',
    answer: 'To ensure partner security and prevent unannounced walk-ins that could overwhelm partner storage capacity, exact street addresses, contact phone numbers, and direct GPS coordinates are instantly displayed on your confirmed booking voucher.'
  },
  {
    category: 'booking',
    question: 'What if my train or flight is delayed?',
    answer: 'No problem! You can drop off or pick up your luggage anytime during the partner location’s daily operating hours listed on your booking receipt. If you are significantly delayed past closing time, please contact customer support or call your host.'
  },
  {
    category: 'general',
    question: 'Can I cancel my booking and get a refund?',
    answer: 'Yes. We offer free 100% full refunds for cancellations made at least 12 hours before your scheduled drop-off time. Cancellations can be performed directly from your Customer Dashboard with one click.'
  },
  {
    category: 'general',
    question: 'How can I reach customer support?',
    answer: 'Our customer support team is available daily from 7:00 AM to 11:00 PM IST via phone (+91 99900 92171) or 24/7 via email at support@stashinn.in. You can also raise formal dispute tickets in your dashboard.'
  }
];

export default function HelpCentrePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'booking' | 'safety' | 'luggage'>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = FAQS.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-24 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 mb-4">
              StashInn Support
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              How can we help you?
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Find instant answers to questions about booking luggage storage, security seals, luggage limits, and cancellations.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g. pricing, safety seal, cancellation, delayed train)..."
                className="w-full px-5 py-4 pl-12 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <svg 
                className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-semibold uppercase px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Quick Help Channels */}
        <section className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center shrink-0 text-orange-600 dark:text-orange-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Phone Helpline</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Speak with an agent (7 AM – 11 PM IST)</p>
                <a href="tel:+919990092171" className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                  +91 99900 92171
                </a>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center shrink-0 text-orange-600 dark:text-orange-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Email Support</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">24/7 inbox with swift turnaround</p>
                <a href="mailto:support@stashinn.in" className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                  support@stashinn.in
                </a>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center shrink-0 text-orange-600 dark:text-orange-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Report a Problem</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Host closed, damaged item, or dispute?</p>
                <Link href="/report-concern" className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                  File a concern ticket →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs Content */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'general', label: 'General' },
                { id: 'booking', label: 'Bookings' },
                { id: 'safety', label: 'Safety & Seals' },
                { id: 'luggage', label: 'Luggage Rules' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    activeCategory === cat.id
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No matching questions found for &quot;{searchQuery}&quot;.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="px-4 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div 
                    key={index} 
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => toggleAccordion(index)}
                      className="w-full px-6 py-5 text-left font-semibold text-gray-900 dark:text-white flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <span className="text-base">{faq.question}</span>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-orange-500' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800/60 pt-4">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Explore More Banner */}
        <section className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Want to know about our safety standards?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Learn how we vet host premises, attach free tamper-proof security tags, and protect every booking.
              </p>
              <Link href="/safety" className="text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline">
                Read Safety Information →
              </Link>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Need to cancel or review refund rules?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                We offer 100% full refunds up to 12 hours prior to drop-off. Learn how to cancel seamlessly.
              </p>
              <Link href="/cancellation" className="text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline">
                View Cancellation Options →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SupportFooter />
    </div>
  );
}
