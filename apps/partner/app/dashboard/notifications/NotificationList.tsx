'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Icon, { type IconName } from '../../../components/Icon';
import { archiveMultiple, getNotifications, markAllAsRead, markAsRead, markMultipleAsRead, markMultipleAsUnread, restoreMultiple } from './actions';

type N = { id: string; title: string; message: string; category: string | null; action_url: string | null; is_read: boolean; is_archived: boolean; created_at: string };

const IST = 'Asia/Kolkata';
const CATEGORY: Record<string, { label: string; icon: IconName; tone: string }> = {
  booking: { label: 'Bookings', icon: 'ticket', tone: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
  payment: { label: 'Payments', icon: 'wallet', tone: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
  damage: { label: 'Claims', icon: 'alert', tone: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  system: { label: 'Account', icon: 'info', tone: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' },
};
const STATUS = [{ key: 'unread', label: 'Unread' }, { key: 'all', label: 'All' }, { key: 'archived', label: 'Archived' }] as const;
const RANGES = [{ key: 'all', label: 'Any time' }, { key: 'today', label: 'Today' }, { key: 'week', label: 'Last 7 days' }, { key: 'month', label: 'Last 30 days' }];
const field = 'rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20';

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: IST });
function dayHeading(iso: string) {
  const k = dayKey(iso);
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 864e5).toISOString());
  if (k === today) return 'Today';
  if (k === yesterday) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: IST });
}
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });

export default function NotificationList() {
  const router = useRouter();
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'unread' | 'all' | 'archived'>('unread');
  const [range, setRange] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getNotifications({ search: query, category, status, range });
    setItems(data as N[]);
    setSelected(new Set());
    setLoading(false);
  }, [query, category, status, range]);
  useEffect(() => { load(); }, [load]);
  // Search after typing pauses
  useEffect(() => { const t = setTimeout(() => setQuery(search), 300); return () => clearTimeout(t); }, [search]);

  const act = (fn: () => Promise<void>) => start(async () => { await fn(); await load(); router.refresh(); });
  const groups = useMemo(() => {
    const m = new Map<string, N[]>();
    items.forEach(n => { const k = dayKey(n.created_at); m.set(k, [...(m.get(k) || []), n]); });
    return [...m.values()];
  }, [items]);
  const ids = [...selected];
  const allSelected = items.length > 0 && selected.size === items.length;
  const unread = items.filter(n => !n.is_read).length;

  const open = (n: N) => {
    if (!n.is_read) markAsRead(n.id).catch(() => null);
    if (n.action_url) router.push(n.action_url);
    else setItems(cur => cur.map(x => (x.id === n.id ? { ...x, is_read: true } : x)));
  };

  return (
    <div>
      <div className="px-4 pt-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-end justify-between gap-2">
        <nav className="flex gap-1" aria-label="Show">
          {STATUS.map(s => (
            <button key={s.key} type="button" onClick={() => setStatus(s.key)} aria-current={status === s.key ? 'page' : undefined}
              className={`px-3 py-2.5 text-sm font-bold border-b-2 -mb-px ${status === s.key ? 'border-orange-500 text-orange-700 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>{s.label}</button>
          ))}
        </nav>
        {status !== 'archived' && unread > 0 && (
          <button type="button" disabled={pending} onClick={() => act(markAllAsRead)} className="mb-2 text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline disabled:opacity-50">Mark all as read</button>
        )}
      </div>

      <div className="px-4 py-3 flex flex-col md:flex-row gap-2 md:items-center border-b border-gray-100 dark:border-gray-800">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications" aria-label="Search notifications" className={`${field} flex-1`} />
        <div className="flex gap-2">
          <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Type" className={field}>
            <option value="all">All types</option>
            {Object.entries(CATEGORY).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
          <select value={range} onChange={e => setRange(e.target.value)} aria-label="When" className={field}>
            {RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {items.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-950/40 border-b border-gray-100 dark:border-gray-800 text-xs">
          <label className="inline-flex items-center gap-2 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.map(n => n.id)))} className="accent-orange-600" />
            {selected.size ? `${selected.size} selected` : 'Select all'}
          </label>
          {selected.size > 0 && (
            <span className="ml-auto flex flex-wrap gap-1.5">
              {status === 'archived' ? (
                <button type="button" disabled={pending} onClick={() => act(() => restoreMultiple(ids))} className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800">Move back to inbox</button>
              ) : (
                <>
                  <button type="button" disabled={pending} onClick={() => act(() => markMultipleAsRead(ids))} className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800">Mark read</button>
                  <button type="button" disabled={pending} onClick={() => act(() => markMultipleAsUnread(ids))} className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800">Mark unread</button>
                  <button type="button" disabled={pending} onClick={() => act(() => archiveMultiple(ids))} className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800">Archive</button>
                </>
              )}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800" aria-busy="true">
          {[0, 1, 2, 3].map(i => <li key={i} className="px-4 py-4 flex gap-3"><span className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" /><span className="flex-1 space-y-2"><span className="block h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" /><span className="block h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" /></span></li>)}
        </ul>
      ) : items.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <span className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><Icon name="check" className="w-6 h-6" /></span>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{status === 'unread' && !query && category === 'all' && range === 'all' ? 'You’re all caught up' : 'Nothing here'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{status === 'unread' ? 'New booking requests, payments and messages from StashInn show up here.' : 'Try another filter.'}</p>
        </div>
      ) : (
        groups.map(g => (
          <section key={g[0]!.id}>
            <h3 className="px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{dayHeading(g[0]!.created_at)}</h3>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {g.map(n => {
                const c = CATEGORY[n.category || 'system'] ?? CATEGORY.system!;
                return (
                  <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.is_read ? '' : 'bg-orange-50/40 dark:bg-orange-950/10'}`}>
                    <input type="checkbox" aria-label={`Select “${n.title}”`} checked={selected.has(n.id)}
                      onChange={() => setSelected(s => { const x = new Set(s); if (x.has(n.id)) x.delete(n.id); else x.add(n.id); return x; })} className="mt-3 accent-orange-600" />
                    <button type="button" onClick={() => open(n)} className="flex-1 min-w-0 flex items-start gap-3 text-left group">
                      <span className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${c.tone}`}><Icon name={c.icon} className="w-4 h-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-label="Unread" />}
                          <span className={`text-sm truncate ${n.is_read ? 'font-semibold text-gray-700 dark:text-gray-300' : 'font-bold text-gray-900 dark:text-white'} group-hover:text-orange-700 dark:group-hover:text-orange-400`}>{n.title}</span>
                        </span>
                        <span className="mt-0.5 block text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line line-clamp-3">{n.message}</span>
                        <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">{time(n.created_at)} · {c.label}{n.action_url ? ' · Open →' : ''}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
