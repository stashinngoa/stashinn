'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@stashinn/lib/supabase/client';
import ThemeToggle from './ThemeToggle';

export default function SupportHeader() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (e) {
        // Handle gracefully if client fails
      }
    };
    fetchUser();
  }, []);

  return (
    <header className="h-20 bg-white/80 dark:bg-black backdrop-blur-md border-b border-gray-100 dark:border-gray-900 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 transition-colors">
      <Link href="/" className="flex items-center gap-2">
        <img src="/StashInn_Light_no_text.png" alt="StashInn Logo" className="h-8 md:h-10 w-auto dark:hidden" />
        <img src="/StashInn_Dark_no_text.png" alt="StashInn Logo" className="h-8 md:h-10 w-auto hidden dark:block" />
        <span className="text-xl md:text-2xl font-black tracking-tighter shrink-0">
          <span className="text-gray-900 dark:text-white">Stash</span>
          <span className="text-orange-500">Inn</span>
        </span>
      </Link>

      <nav className="flex items-center gap-2 md:gap-4 lg:gap-6">
        <ThemeToggle />

        <Link 
          href="/search" 
          className="hidden sm:flex items-center text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors text-sm font-medium"
        >
          Find Storage
        </Link>

        <Link 
          href="/#how-it-works" 
          className="hidden md:flex items-center text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors text-sm font-medium"
        >
          How it works
        </Link>

        <a 
          href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"} 
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors p-2 md:p-0 rounded-full hover:bg-gray-100 md:hover:bg-transparent dark:hover:bg-gray-900 md:dark:hover:bg-transparent"
        >
          <svg className="w-5 h-5 md:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="hidden md:inline-block text-sm font-medium">Become a Partner</span>
        </a>

        {user ? (
          <Link 
            href="/dashboard" 
            className="px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all shadow-sm hover:shadow"
          >
            Dashboard
          </Link>
        ) : (
          <Link 
            href="/login" 
            className="px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all shadow-sm hover:shadow"
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
