'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { markAsRead } from '../app/dashboard/notificationsActions';

const toneFor = (title: string) => {
  if (/accept|confirm/i.test(title)) return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400';
  if (/declin|cancel/i.test(title)) return 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400';
  if (/request|pending/i.test(title)) return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400';
  return 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400';
};

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function NotificationBell({ initialNotifications }: { initialNotifications: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const popoverRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setIsOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  const open = async (notif: any) => {
    if (notif.is_read) return;
    setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n)));
    await markAsRead(notif.id);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-gray-800 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{unreadCount} new</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map(n => (
                  <li key={n.id}>
                    <button type="button" onClick={() => open(n)} className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors ${n.is_read ? 'opacity-60' : ''}`}>
                      <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${toneFor(n.title)}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-sm ${n.is_read ? 'text-gray-600 dark:text-gray-400' : 'font-bold text-gray-900 dark:text-white'}`}>{n.title}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</span>
                        <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link href="/dashboard/notifications" onClick={() => setIsOpen(false)} className="block border-t border-gray-100 dark:border-gray-800 px-4 py-3 text-center text-sm font-semibold text-orange-700 dark:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800/60">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
