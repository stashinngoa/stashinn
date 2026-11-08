"use client";

import { useState, useEffect, Suspense } from "react";
import RoleAccessArea from "./RoleAccessArea";
import type { AdminRole } from "../lib/permissions";

interface DashboardShellProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  adminRole: AdminRole;
}

export default function DashboardShell({ sidebar, header, children, adminRole }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // The root layout's init script has already applied the saved theme; just sync the toggle icon
    setIsDark(document.documentElement.classList.contains('dark'));
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

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSidebarOpen]);

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-black flex font-inter transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-xl md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        onClick={(e) => {
          // Close sidebar on mobile when a link is clicked
          if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) {
            setIsSidebarOpen(false);
          }
        }}
      >
        {sidebar}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 px-4 md:px-8 shrink-0 transition-colors duration-200">
          <button
            className="md:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 shrink-0 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1 flex items-center gap-3 min-w-0">
            {header}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
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
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-black min-w-0 transition-colors duration-200">
          <Suspense fallback={children}>
            <RoleAccessArea role={adminRole}>{children}</RoleAccessArea>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
