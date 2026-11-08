'use client';

import { useMemo, useState, useTransition } from 'react';
import { markRead, setArchived } from './actions';

type Notif = { id: string; title: string; message: string; category: string | null; is_read: boolean; is_archived: boolean; action_url: string | null; created_at: string };

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'archived', label: 'Archived' },
] as const;
type View = (typeof VIEWS)[number]['id'];

const CATEGORIES = [
  { id: 'all', label: 'Everything' },
  { id: 'booking', label: 'Bookings' },
  { id: 'payment', label: 'Payments' },
  { id: 'damage', label: 'Disputes' },
  { id: 'system', label: 'Account' },
];

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

export default function NotificationList({ initial }: { initial: Notif[] }) {
  const [items, setItems] = useState(initial);
  const [view, setView] = useState<View>('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const counts = useMemo(() => ({
    all: items.filter(n => !n.is_archived).length,
    unread: items.filter(n => !n.is_archived && !n.is_read).length,
    archived: items.filter(n => n.is_archived).length,
  }), [items]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(n =>
      (view === 'archived' ? n.is_archived : !n.is_archived && (view === 'all' || !n.is_read)) &&
      (category === 'all' || n.category === category) &&
      (!q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)),
    );
  }, [items, view, category, search]);

  // Update the list straight away, then save
  const read = (ids?: string[]) => {
    setItems(prev => prev.map(n => (!ids || ids.includes(n.id) ? { ...n, is_read: true } : n)));
    start(() => markRead(ids));
  };
  const archive = (ids: string[], archived: boolean) => {
    setItems(prev => prev.map(n => (ids.includes(n.id) ? { ...n, is_archived: archived, is_read: archived ? true : n.is_read } : n)));
    setSelected(new Set());
    start(() => setArchived(ids, archived));
  };
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = list.length > 0 && list.every(n => selected.has(n.id));

  return (
    <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="p-4 sm:p-5 space-y-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          {VIEWS.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => { setView(v.id); setSelected(new Set()); }}
              aria-pressed={view === v.id}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${view === v.id ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}`}
            >
              {v.label}
              <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${view === v.id ? 'bg-white/20 dark:bg-gray-900/15' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{counts[v.id]}</span>
            </button>
          ))}
          {counts.unread > 0 && view !== 'archived' && (
            <button type="button" onClick={() => read()} disabled={pending} className="ml-auto text-sm font-semibold text-orange-700 dark:text-orange-400 hover:underline disabled:opacity-60">
              Mark all as read
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications" aria-label="Search notifications" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-orange-400">
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {list.length > 0 && (
        <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 text-xs">
          <label className="flex items-center gap-2 font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(list.map(n => n.id)))} className="w-4 h-4 accent-orange-600" />
            {selected.size ? `${selected.size} selected` : 'Select all'}
          </label>
          {selected.size > 0 && (
            <div className="ml-auto flex gap-2">
              {view !== 'archived' && <button type="button" onClick={() => read([...selected])} className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2.5 py-1 font-bold text-gray-700 dark:text-gray-300">Mark read</button>}
              <button type="button" onClick={() => archive([...selected], view !== 'archived')} className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2.5 py-1 font-bold text-gray-700 dark:text-gray-300">
                {view === 'archived' ? 'Restore' : 'Archive'}
              </button>
            </div>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <p className="px-6 py-14 text-center text-sm text-gray-500 dark:text-gray-400">
          {search || category !== 'all' ? 'No notifications match.' : view === 'unread' ? 'You’re all caught up.' : view === 'archived' ? 'Nothing archived.' : 'No notifications yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {list.map(n => (
            <li key={n.id} className={`flex items-start gap-3 px-4 sm:px-5 py-4 ${selected.has(n.id) ? 'bg-orange-50/60 dark:bg-orange-950/20' : !n.is_read ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''}`}>
              <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggle(n.id)} aria-label={`Select ${n.title}`} className="mt-1 w-4 h-4 accent-orange-600" />
              <span className={`mt-2 w-2 h-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-orange-500'}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className={`text-sm ${n.is_read ? 'font-medium text-gray-700 dark:text-gray-300' : 'font-bold text-gray-900 dark:text-white'}`}>{n.title}</p>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{when(n.created_at)}</span>
                </div>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  {n.category && <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-semibold text-gray-600 dark:text-gray-400">{CATEGORIES.find(c => c.id === n.category)?.label ?? n.category}</span>}
                  {n.action_url && <a href={n.action_url} className="font-bold text-orange-700 dark:text-orange-400 hover:underline">View →</a>}
                  {!n.is_read && <button type="button" onClick={() => read([n.id])} className="font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Mark read</button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
