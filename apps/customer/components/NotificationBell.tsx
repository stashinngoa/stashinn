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
    if (title === 'New Booking Request') return 'bg-yellow-100 text-yellow-600';
    if (title === 'Booking Accepted') return 'bg-green-100 text-green-600';
    if (title === 'Booking Declined') return 'bg-red-100 text-red-600';
    return 'bg-purple-100 text-purple-600';
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && <span className="text-xs font-semibold text-purple-600">{unreadCount} new</span>}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors ${notif.is_read ? 'opacity-60' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${getIconColor(notif.title)}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${notif.is_read ? 'text-gray-600' : 'font-bold text-gray-900'}`}>{notif.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
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
