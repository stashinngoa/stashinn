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

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-100 font-inter flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 sticky top-0 z-50 shrink-0 shadow-sm">
        <button 
          className="md:hidden mr-3 p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 shrink-0"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <Link href="/" className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 flex-1 min-w-0 truncate">
          StashInn
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
            fixed inset-y-0 left-0 z-50 w-64 bg-gray-50 border-r border-gray-200 p-6 transform transition-transform duration-300 ease-in-out md:relative md:bg-transparent md:border-none md:p-0 md:translate-x-0 md:w-64 shrink-0
            ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          `}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setIsSidebarOpen(false);
          }}
        >
          <div className="md:hidden mb-6 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Menu</span>
            <button 
              className="p-2 -mr-2 text-gray-400 hover:text-gray-900 rounded-md"
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
