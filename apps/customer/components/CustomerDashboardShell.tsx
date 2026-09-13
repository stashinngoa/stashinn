"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface CustomerDashboardShellProps {
  sidebar: React.ReactNode;
  headerRight: React.ReactNode;
  children: React.ReactNode;
}

export default function CustomerDashboardShell({ sidebar, headerRight, children }: CustomerDashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  // Check saved theme preference
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 font-inter flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="h-16 bg-white/80 dark:bg-black backdrop-blur-md dark:backdrop-blur-none border-b border-gray-200/50 dark:border-gray-900 flex items-center px-4 md:px-6 sticky top-0 z-50 shrink-0 relative transition-colors duration-200">
        <button 
          className="md:hidden mr-3 p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 shrink-0 transition-colors"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <Link href="/" className="flex-1 min-w-0 flex items-center gap-2">
          <img src="/StashInn_Light_no_text.png" alt="StashInn Logo" className="h-8 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="StashInn Logo" className="h-8 w-auto hidden dark:block" />
          <span className="text-xl font-black tracking-tighter">
            <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
          </span>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {headerRight}
        </div>
      </header>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row md:gap-8 px-4 sm:px-6 lg:px-8 py-6 md:py-8 min-w-0">
        
        {/* Sidebar Navigation */}
        <aside 
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 transform transition-transform duration-300 ease-in-out md:relative md:bg-transparent md:border-none md:p-0 md:translate-x-0 md:w-64 shrink-0
            ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          `}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setIsSidebarOpen(false);
          }}
        >
          <div className="md:hidden mb-6 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Menu</span>
            <button 
              className="p-2 -mr-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {sidebar}
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
