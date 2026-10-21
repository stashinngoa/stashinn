'use client';

import { useState } from 'react';
import Link from 'next/link';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

interface Article {
  id: string;
  category: string;
  date: string;
  readTime: string;
  title: string;
  summary: string;
}

const ARTICLES: Article[] = [
  {
    id: '1',
    category: 'Expansion',
    date: 'October 12, 2026',
    readTime: '4 min read',
    title: 'StashInn Expands Safe Luggage Storage Network to 50+ Major Railway Stations Across India',
    summary: 'With rising domestic travel and weekend getaways, StashInn has onboarded over 350+ verified commercial hotels and cloakrooms across New Delhi, Mumbai, Bengaluru, Goa, and Jaipur.'
  },
  {
    id: '2',
    category: 'Product Innovation',
    date: 'September 28, 2026',
    readTime: '3 min read',
    title: 'Introducing Tamper-Evident Smart Seals & ₹10,000 Luggage Protection Guarantee',
    summary: 'Every booking made through StashInn now includes single-use numbered security seals and financial protection against damage or loss, setting a new safety benchmark for urban travel.'
  },
  {
    id: '3',
    category: 'New Service',
    date: 'August 14, 2026',
    readTime: '3 min read',
    title: 'StashInn Launches Garage Mode: Secure Parking for Two-Wheelers and Cars',
    summary: 'Beyond luggage storage, travelers and city commuters can now find verified commercial parking spaces near railway stations and city centers with real-time slot reservations.'
  },
  {
    id: '4',
    category: 'Partner Growth',
    date: 'July 05, 2026',
    readTime: '5 min read',
    title: 'Local Businesses Earn Over ₹1.2 Crore in Passive Revenue Through StashInn Partner Network',
    summary: 'Small shops, boutique cafes, and hotels are transforming unused square footage into steady income while experiencing an average 35% boost in store footfall sales.'
  }
];

export default function NewsroomPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Expansion', 'Product Innovation', 'New Service', 'Partner Growth'];

  const filteredArticles = activeCategory === 'All'
    ? ARTICLES
    : ARTICLES.filter(a => a.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-24 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 mb-4">
              Press & Media
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              StashInn Newsroom
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Follow our journey as we build India&apos;s largest verified luggage storage and urban physical space network.
            </p>

            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm shadow-sm">
              <span className="text-gray-500 dark:text-gray-400">Media Inquiries:</span>
              <a href="mailto:press@stashinn.in" className="font-bold text-orange-600 dark:text-orange-400 hover:underline">
                press@stashinn.in
              </a>
            </div>
          </div>
        </section>

        {/* Featured Story */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-3xl p-8 md:p-12 shadow-lg relative overflow-hidden mb-12">
            <div className="max-w-2xl relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-white mb-4">
                Featured Story
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold mb-4 leading-tight">
                Hands-Free Tourism: How StashInn Is Eliminating Travel Bag Hassles Across India
              </h2>
              <p className="text-sm md:text-base text-orange-100 leading-relaxed mb-6">
                With India&apos;s urban transit hubs seeing record footfalls, travelers no longer need to haul heavy bags to meetings, temples, or sightseeing spots. StashInn offers a safe, instant bag check at verified partner spaces in under 2 minutes.
              </p>
              <div className="flex items-center gap-4 text-xs text-orange-100 font-semibold">
                <span>By StashInn Editorial</span>
                <span>•</span>
                <span>October 2026</span>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
                  activeCategory === cat
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Article Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {filteredArticles.map(article => (
              <div
                key={article.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 hover:border-orange-400 dark:hover:border-orange-600 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span className="font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      {article.category}
                    </span>
                    <span>{article.date} · {article.readTime}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                    {article.summary}
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80">
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 group cursor-pointer">
                    Read Press Release →
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Media Kit Download Banner */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Media Kit & Brand Assets
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
                Need high-resolution vector logos, executive headshots, or official brand color guidelines for press coverage?
              </p>
            </div>
            <a
              href="mailto:press@stashinn.in?subject=Media%20Kit%20Request"
              className="px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow shrink-0"
            >
              Request Media Kit
            </a>
          </div>
        </section>
      </main>

      <SupportFooter />
    </div>
  );
}
