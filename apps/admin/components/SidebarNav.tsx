'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_SECTIONS, isActive } from './adminNav';
import { accessFor, type AdminRole } from '../lib/permissions';

export default function SidebarNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  // Only show the tabs this staff role can open
  const sections = NAV_SECTIONS
    .map(s => ({ ...s, items: s.items.filter(i => accessFor(role, i.href)) }))
    .filter(s => s.items.length > 0);

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5" aria-label="Admin navigation">
      {sections.map((section, si) => (
        <div key={section.title ?? si}>
          {section.title && (
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map(item => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors ${
                      active
                        ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {active && (
                      <span className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-orange-600 to-amber-500" aria-hidden="true" />
                    )}
                    <svg
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        active ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
