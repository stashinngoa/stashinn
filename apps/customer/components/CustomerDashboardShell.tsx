'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ThemeToggle from './ThemeToggle';

const NAV: { href: string; label: string; icon: string; menuOnly?: boolean }[] = [
  { href: '/dashboard', label: 'My bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/dashboard/notifications', label: 'Notifications', menuOnly: true, icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { href: '/dashboard/profile', label: 'Profile & settings', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { href: '/dashboard/disputes', label: 'Help & disputes', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const isActive = (pathname: string, href: string) => (href === '/dashboard' ? pathname === '/dashboard' || pathname.startsWith('/dashboard/review') : pathname.startsWith(href));

const Icon = ({ d, className = 'w-5 h-5' }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
);

export default function CustomerDashboardShell({ user, bell, logout, unread, children }: {
  user: { name: string; email: string };
  bell: React.ReactNode;
  logout: () => Promise<void>;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-inter flex flex-col">
      <header className="h-16 sticky top-0 z-50 flex items-center gap-3 px-4 md:px-6 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="StashInn home">
          <img src="/StashInn_Light_no_text.png" alt="" className="h-8 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="" className="h-8 w-auto hidden dark:block" />
          <span className="hidden sm:inline text-xl font-black tracking-tighter">
            <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
          </span>
        </Link>
        <Link href="/search" className="hidden md:inline-flex ml-4 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900">
          <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="w-4 h-4" /> Find storage
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {bell}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-center"
            >
              {initial}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || 'Your account'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                <nav className="py-1.5">
                  {NAV.map(n => (
                    <Link key={n.href} href={n.href} className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <Icon d={n.icon} className="w-4 h-4 text-gray-400" /> {n.label}
                      {n.menuOnly && unread > 0 && (
                        <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
                      )}
                    </Link>
                  ))}
                </nav>
                <form action={logout} className="border-t border-gray-100 dark:border-gray-800">
                  <button type="submit" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="w-4 h-4" /> Log out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* One centred column: the account menu sits beside the page, not against the window edge */}
      <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col md:flex-row md:gap-8 md:px-6 lg:px-8">
        {/* Phones: a scrollable row of tabs. Larger screens: a menu beside the page that stays put while it scrolls */}
        <nav aria-label="Account" className="shrink-0 md:w-56 md:sticky md:top-16 md:self-start px-4 pt-4 md:px-0 md:py-8">
          <ul className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none]">
            {NAV.filter(n => !n.menuOnly).map(n => {
              const active = isActive(pathname, n.href);
              return (
                <li key={n.href} className="shrink-0">
                  <Link
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${active
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60'
                      : 'text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <Icon d={n.icon} className={`w-5 h-5 ${active ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`} />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex-1 min-w-0 px-4 sm:px-6 md:px-0 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
