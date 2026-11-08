'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icon';

const NAV: { title: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  {
    title: 'Operations',
    items: [
      { href: '/dashboard', label: 'Overview', icon: 'home' },
      { href: '/dashboard/bookings', label: 'Bookings', icon: 'ticket' },
      { href: '/dashboard/schedule', label: 'Schedule', icon: 'calendar' },
      { href: '/dashboard/locations', label: 'Locations', icon: 'pin' },
    ],
  },
  {
    title: 'Money',
    items: [
      { href: '/dashboard/earnings', label: 'Earnings', icon: 'wallet' },
      { href: '/dashboard/settlements', label: 'Settlements', icon: 'check' },
      { href: '/dashboard/reports', label: 'Reports', icon: 'chart' },
    ],
  },
  {
    title: 'Customers',
    items: [
      { href: '/dashboard/reviews', label: 'Reviews', icon: 'star' },
      { href: '/dashboard/damage', label: 'Damage reports', icon: 'alert' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/dashboard/pocs', label: 'Staff & contacts', icon: 'users' },
      { href: '/dashboard/profile', label: 'Business profile', icon: 'building' },
    ],
  },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Live', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' },
  pending: { label: 'Under review', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' },
  suspended: { label: 'Suspended', cls: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60' },
  rejected: { label: 'Not approved', cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60' },
};

export function PartnerStatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

export default function PartnerSidebar({ businessName, email, status, logout }: {
  businessName: string;
  email: string;
  status: string;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <Link href="/dashboard" className="h-16 shrink-0 flex items-center gap-2 px-5 border-b border-gray-100 dark:border-gray-800">
        <img src="/StashInn_Light_no_text.png" alt="" className="h-8 w-auto dark:hidden" />
        <img src="/StashInn_Dark_no_text.png" alt="" className="h-8 w-auto hidden dark:block" />
        <span className="text-xl font-black tracking-tighter">
          <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
        </span>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">Partner</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Partner dashboard">
        {NAV.map(group => (
          <div key={group.title}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-orange-500" />}
                    <Icon name={item.icon} className={`w-5 h-5 shrink-0 ${active ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 p-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-sm">
            {businessName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{businessName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PartnerStatusPill status={status} />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Icon name="logout" className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
