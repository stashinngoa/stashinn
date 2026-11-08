"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

// Pages laid out to fill the screen on large displays instead of scrolling (the page sizes itself to the space left)
const FIT_ROUTES = ['/dashboard/schedule'];

interface DashboardShellProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardShell({ sidebar, header, children }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();
  const fit = FIT_ROUTES.includes(pathname);

  // The theme class is applied before paint by app/layout.tsx; this just syncs the toggle icon
  useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')); }, []);
  // Close the mobile menu after navigating
  useEffect(() => { setIsSidebarOpen(false); }, [pathname]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-950 font-inter">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 md:px-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <button
            className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center gap-3 min-w-0">{header}</div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light theme' : 'Dark theme'}
          >
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto flex flex-col ${fit ? 'lg:overflow-hidden' : ''}`}>
          <main className={`flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 ${fit ? 'lg:p-6 lg:min-h-0 lg:flex lg:flex-col' : ''}`}>{children}</main>
          <footer className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
              <p>© {new Date().getFullYear()} StashInn · Luggage & vehicle storage in Goa</p>
              <a href="mailto:support@stashinn.in" className="inline-flex items-center gap-1.5 hover:text-orange-600 dark:hover:text-orange-400">
                <Icon name="mail" className="w-3.5 h-3.5" /> Partner support: support@stashinn.in
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
