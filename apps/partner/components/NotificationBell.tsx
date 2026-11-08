'use client';

import { useState, useRef, useEffect } from 'react';
import { markAsRead } from '../app/dashboard/notificationsActions';

export default function NotificationBell({ initialNotifications }: { initialNotifications: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    // Close popover when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      await markAsRead(notif.id);
    }
  };

  const getIconColor = (title: string) => {
    if (title === 'New Booking Request') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400';
    if (title === 'Booking Accepted') return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400';
    if (title === 'Booking Declined') return 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400';
    return 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400';
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{unreadCount} new</span>}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer flex gap-3 transition-colors ${notif.is_read ? 'opacity-60' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${getIconColor(notif.title)}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${notif.is_read ? 'text-gray-600 dark:text-gray-400' : 'font-bold text-gray-900 dark:text-white'}`}>{notif.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{new Date(notif.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
