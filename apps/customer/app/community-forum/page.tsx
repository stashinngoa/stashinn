'use client';

import { useState } from 'react';
import Link from 'next/link';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

interface Post {
  id: string;
  category: 'tips' | 'earnings' | 'operations' | 'stories';
  title: string;
  author: string;
  location: string;
  role: string;
  date: string;
  likes: number;
  replies: number;
  preview: string;
}

const FORUM_POSTS: Post[] = [
  {
    id: '1',
    category: 'stories',
    title: 'How our budget hotel in Paharganj generated ₹52,000 extra net profit in August',
    author: 'Rajiv Mehra',
    location: 'New Delhi (Near NDLS Railway Station)',
    role: 'Super Host',
    date: '3 days ago',
    likes: 48,
    replies: 19,
    preview: 'We had a 10x8 ft luggage room that was mostly holding spare bedsheets. By dedicating two heavy-duty steel racks to StashInn bookings, we comfortably handle 25-35 bags daily from transit travelers catching evening trains.'
  },
  {
    id: '2',
    category: 'tips',
    title: 'Double-tier industrial shelving: Best space-saver for small retail shops',
    author: 'Pooja Kulkarni',
    location: 'Pune (FC Road)',
    role: 'Cafe & Gift Store Partner',
    date: '1 week ago',
    likes: 34,
    replies: 12,
    preview: 'If your store footprint is small, do not stack bags on top of each other! We installed two slotted angle racks (cost approx ₹2,800). It holds 14 bags vertically without any risk of damaging fragile luggage items.'
  },
  {
    id: '3',
    category: 'operations',
    title: 'Training front-desk night staff to manage late check-ins without bottlenecks',
    author: 'Vikramaditya S.',
    location: 'Jaipur (MI Road)',
    role: 'Heritage Haveli Host',
    date: '2 weeks ago',
    likes: 29,
    replies: 8,
    preview: 'We added our night desk receptionist as a Point of Contact (POC) in the StashInn dashboard. Check-in takes under 45 seconds using the mobile QR scanner. Seals are kept in a drawer right next to the POS terminal.'
  },
  {
    id: '4',
    category: 'earnings',
    title: 'Footfall cross-selling: How we get 45% of luggage travelers to buy food and coffee',
    author: 'Sunita Shetty',
    location: 'Mumbai (Colaba)',
    role: 'Boutique Bakery Host',
    date: '3 weeks ago',
    likes: 56,
    replies: 23,
    preview: 'We print a small flyer: "Show your StashInn voucher for 10% off cold brew & pastries". Travelers are usually tired, waiting for their hotel check-in or evening flight, so they gladly sit and order while dropping bags.'
  }
];

export default function CommunityForumPage() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'tips' | 'earnings' | 'operations' | 'stories'>('all');
  const [newQuestionModal, setNewQuestionModal] = useState(false);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [formData, setFormData] = useState({ title: '', category: 'tips', details: '', author: '' });

  const filteredPosts = FORUM_POSTS.filter(post => 
    activeCategory === 'all' || post.category === activeCategory
  );

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionSubmitted(true);
    setTimeout(() => {
      setNewQuestionModal(false);
      setQuestionSubmitted(false);
      setFormData({ title: '', category: 'tips', details: '', author: '' });
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-20 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 mb-4">
              Host Peer Network
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              StashInn Host Community
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of hotel operators, cafe managers, and shopkeepers across India sharing storage tips, space hacks, and earning strategies.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setNewQuestionModal(true)}
                className="px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg"
              >
                + Start a Discussion
              </button>
              <a
                href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"}
                className="px-6 py-3 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
              >
                Partner Dashboard →
              </a>
            </div>
          </div>
        </section>

        {/* Discussion Categories & Filter */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Discussions' },
                { id: 'stories', label: 'Success Stories' },
                { id: 'tips', label: 'Space Hacks & Shelving' },
                { id: 'operations', label: 'Operations & Staff' },
                { id: 'earnings', label: 'Footfall & Cross-Sell' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
                    activeCategory === cat.id
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Showing {filteredPosts.length} community insights
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Forum Threads */}
            <div className="lg:col-span-8 space-y-4">
              {filteredPosts.map(post => (
                <div
                  key={post.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 hover:border-orange-300 dark:hover:border-orange-700 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 capitalize">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{post.date}</span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                    {post.preview}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white font-bold flex items-center justify-center text-xs">
                        {post.author.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          {post.author}
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                            {post.role}
                          </span>
                        </div>
                        <div className="text-gray-400">{post.location}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 font-semibold">
                      <span className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer">
                        <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a2 2 0 00-.8 2.4z" />
                        </svg>
                        {post.likes} helpful
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {post.replies} replies
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar Guidelines & Super-Host Badge */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                  Community Rules & Etiquette
                </h3>
                <ul className="space-y-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">1.</span>
                    <span><strong>Real operational advice:</strong> Share actionable storage and customer service learnings.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">2.</span>
                    <span><strong>Customer privacy first:</strong> Never post booking codes, personal traveler names, or phone numbers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">3.</span>
                    <span><strong>Zero promotional spam:</strong> Discussions are strictly for peer knowledge sharing.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-3xl p-6 shadow-md">
                <span className="text-xs font-bold uppercase tracking-widest text-orange-200">
                  Super Host Recognition
                </span>
                <h3 className="text-xl font-bold mt-1 mb-2">Want to become a Super Host?</h3>
                <p className="text-xs text-orange-100 leading-relaxed mb-4">
                  Partners maintaining a 4.8+ star rating with zero check-in disputes receive priority search ranking on the customer app and complimentary storefront neon branding.
                </p>
                <Link
                  href="/hosting-responsibly"
                  className="inline-block py-2 px-4 rounded-full bg-white text-orange-600 font-bold text-xs hover:bg-orange-50 transition-colors shadow-sm"
                >
                  View Responsible Hosting Standards →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Modal for New Question */}
        {newQuestionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative">
              <button
                onClick={() => setNewQuestionModal(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
              >
                ✕
              </button>

              {questionSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">
                    ✓
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Discussion Posted!</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your topic has been submitted to the community moderator and will appear shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitQuestion} className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Start a New Discussion
                  </h3>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      Your Name / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="e.g. Anand, Metro Cafe Delhi"
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      Topic Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="tips">Space Hacks & Shelving</option>
                      <option value="operations">Operations & Staff Training</option>
                      <option value="earnings">Footfall & Cross-Selling</option>
                      <option value="stories">Success Story</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      Discussion Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Best way to handle oversized cricket kit bags?"
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      Details / Question *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      placeholder="Share context, location type, and what you'd like feedback on..."
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all"
                  >
                    Post to Forum
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <SupportFooter />
    </div>
  );
}
