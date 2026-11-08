import Link from 'next/link';
import { statusOf } from '../bookingStatus';

// Building blocks shared by the role-specific dashboard overviews.

export const ICONS = {
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  store: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  refund: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  bag: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  car: 'M8 17a2 2 0 11-4 0 2 2 0 014 0zM20 17a2 2 0 11-4 0 2 2 0 014 0zM4 17H3v-5l2-5h10l4 5h2v5h-1M8 17h8M5 12h14',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  arrow: 'M9 5l7 7-7 7',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  cash: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  cancel: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
} as const;

export function Icon({ name, className = 'w-5 h-5' }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS[name]} />
    </svg>
  );
}

export const inr = (n: number, decimals = 0) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const initials = (name: string) =>
  name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';

export const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';

export function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
      {href && (
        <Link href={href} className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
          {linkLabel} <Icon name="arrow" className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

/** A headline number with a short explanation; links to the page where it's handled. */
export function StatCard({ label, value, sub, icon, href, tone = 'orange' }: {
  label: string; value: string; sub?: string; icon: keyof typeof ICONS; href?: string; tone?: 'orange' | 'red' | 'amber' | 'emerald' | 'sky';
}) {
  const tones = {
    orange: 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400',
    red: 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400',
    amber: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    sky: 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
  };
  const body = (
    <>
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon name={icon} /></span>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{value}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
      </div>
    </>
  );
  const cls = `${card} p-5 flex flex-col justify-between`;
  return href
    ? <Link href={href} className={`${cls} hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-md transition-all`}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

/** Greeting header used at the top of every overview. */
export function OverviewHeader({ subtitle, children }: { subtitle: React.ReactNode; children?: React.ReactNode }) {
  const istHour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
  const greeting = istHour < 12 ? 'Good morning' : istHour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">{today}</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{greeting} 👋</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** A titled card holding a short list; shows `empty` when there are no rows. */
export function ListPanel({ title, href, linkLabel, empty, children, className = '' }: {
  title: string; href?: string; linkLabel?: string; empty: string; children: React.ReactNode[]; className?: string;
}) {
  return (
    <div className={`${card} overflow-hidden ${className}`}>
      <SectionHeader title={title} href={href} linkLabel={linkLabel} />
      {children.length === 0
        ? <p className="px-5 py-8 text-sm text-center text-gray-500 dark:text-gray-400">{empty}</p>
        : <ul className="divide-y divide-gray-100 dark:divide-gray-800">{children}</ul>}
    </div>
  );
}

/** One row in a ListPanel: title, detail line, optional right-hand badge, links somewhere. */
export function ListRow({ href, title, detail, badge, icon = 'arrow' }: {
  href: string; title: React.ReactNode; detail?: React.ReactNode; badge?: React.ReactNode; icon?: keyof typeof ICONS;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-5 py-3 hover:bg-orange-50/40 dark:hover:bg-gray-800/40 transition-colors group">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{title}</p>
          {detail && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{detail}</p>}
        </div>
        {badge}
        <Icon name={icon} className="w-4 h-4 shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-orange-500 transition-colors" />
      </Link>
    </li>
  );
}

export function RecentBookings({ bookings, className = '' }: { bookings: any[]; className?: string }) {
  return (
<div className={`${className} ${card} overflow-hidden`}>
      <SectionHeader title="Recent bookings" href="/dashboard/bookings" linkLabel="View all" />
      {bookings.length === 0 ? (
        <div className="px-6 py-14 text-center text-sm text-gray-500 dark:text-gray-400">No bookings yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-950/50">
                <th className="px-5 py-2.5">Customer</th>
                <th className="px-5 py-2.5">Location</th>
                <th className="px-5 py-2.5">Item</th>
                <th className="px-5 py-2.5 text-right">Amount</th>
                <th className="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {bookings.map((b: any) => {
                const name = b.users?.full_name || b.users?.email || '—';
                const s = statusOf(b.status);
                const isVehicle = b.booking_type === 'garage';
                return (
                  <tr key={b.id} className="hover:bg-orange-50/40 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white text-[11px] font-black flex items-center justify-center">
                          {initials(name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[160px]">{name}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">{timeAgo(b.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{b.partner_locations?.name || '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {isVehicle ? (
                        <span className="inline-flex items-center gap-1.5 text-brand-teal dark:text-teal-300 font-medium">
                          <Icon name="car" className="w-4 h-4" />
                          {[b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') || 'Vehicle'}
                          {b.vehicle_license_plate && <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{b.vehicle_license_plate}</span>}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                          <Icon name="bag" className="w-4 h-4 text-orange-500" />
                          {b.num_bags} bag{b.num_bags === 1 ? '' : 's'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900 dark:text-gray-100 tabular-nums whitespace-nowrap">{inr(Number(b.total_amount), 2)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border whitespace-nowrap ${s.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
