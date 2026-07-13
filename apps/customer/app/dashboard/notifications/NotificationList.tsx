'use client';

import { useState, useEffect, useTransition } from 'react';
import { getNotifications, markAsRead, markAllAsRead, markMultipleAsRead, archiveMultiple } from './actions';

export default function NotificationList() {
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('unread');
  const [dateRange, setDateRange] = useState('all');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch data
  const loadNotifications = async () => {
    setLoading(true);
    const data = await getNotifications({ search, category, status, dateRange });
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, [search, category, status, dateRange]);

  const handleMarkAsRead = (id: string) => {
    startTransition(async () => {
      await markAsRead(id);
      loadNotifications();
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllAsRead();
      loadNotifications();
    });
  };

  const handleBulkMarkRead = () => {
    startTransition(async () => {
      await markMultipleAsRead(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadNotifications();
    });
  };

  const handleBulkArchive = () => {
    startTransition(async () => {
      await archiveMultiple(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadNotifications();
    });
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === notifications.length && notifications.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const exportCSV = () => {
    if (notifications.length === 0) return;
    const headers = ['ID', 'Date', 'Title', 'Message', 'Category', 'Read', 'Archived'];
    const rows = notifications.map(n => [
      n.id,
      new Date(n.created_at).toISOString(),
      `"${n.title.replace(/"/g, '""')}"`,
      `"${n.message.replace(/"/g, '""')}"`,
      n.category,
      n.is_read ? 'Yes' : 'No',
      n.is_archived ? 'Yes' : 'No'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notifications_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      {/* Filter Bar */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full relative">
          <input 
            type="text" 
            placeholder="Search notifications..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <select value={category} onChange={e => setCategory(e.target.value)} className="bg-white border border-gray-300 text-sm text-gray-700 rounded-lg px-3 py-2 outline-none">
            <option value="all">All Categories</option>
            <option value="system">System</option>
            <option value="payment">Payment</option>
            <option value="booking">Booking</option>
            <option value="damage">Damage / Dispute</option>
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="bg-white border border-gray-300 text-sm text-gray-700 rounded-lg px-3 py-2 outline-none">
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="all">All Non-Archived</option>
            <option value="archived">Archived</option>
          </select>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-white border border-gray-300 text-sm text-gray-700 rounded-lg px-3 py-2 outline-none">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={notifications.length > 0 && selectedIds.size === notifications.length}
              onChange={toggleAll}
              className="rounded bg-white border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-gray-500">Select All</span>
          </label>
          
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
              <button 
                onClick={handleBulkMarkRead} 
                disabled={isPending}
                className="text-xs font-bold px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                Mark Read
              </button>
              <button 
                onClick={handleBulkArchive}
                disabled={isPending}
                className="text-xs font-bold px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-md transition-colors"
              >
                Archive Selected
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-4 items-center">
          <button onClick={exportCSV} className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              disabled={isPending}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100 min-h-[400px]">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm animate-pulse">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No notifications found matching your filters.
          </div>
        ) : (
          notifications.map((notif: any) => (
            <div 
              key={notif.id} 
              className={`p-4 flex items-start gap-4 transition-colors ${
                selectedIds.has(notif.id) ? 'bg-indigo-50/50' :
                notif.is_read ? 'bg-white' : 'bg-indigo-50/30 hover:bg-indigo-50/50'
              }`}
            >
              <input 
                type="checkbox" 
                checked={selectedIds.has(notif.id)}
                onChange={() => toggleSelection(notif.id)}
                className="mt-1 rounded bg-white border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              
              <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${notif.is_read ? 'bg-transparent' : 'bg-red-500'}`} />
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className={`text-sm ${notif.is_read ? 'text-gray-600 font-medium' : 'text-gray-900 font-bold'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${notif.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                  {notif.message}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    {notif.category}
                  </span>
                  {notif.action_url && (
                    <a href={notif.action_url} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                      View Details →
                    </a>
                  )}
                </div>
              </div>

              {!notif.is_read && (
                <button 
                  onClick={() => handleMarkAsRead(notif.id)}
                  disabled={isPending}
                  className="shrink-0 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Mark as read"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
