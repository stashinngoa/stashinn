'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getBreadcrumbs } from './adminNav';

export default function HeaderBreadcrumb() {
  const crumbs = getBreadcrumbs(usePathname());

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm min-w-0">
        <li className="hidden sm:flex items-center gap-1.5 text-gray-400 dark:text-gray-500 shrink-0">
          <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Admin</Link>
          <Chevron />
        </li>
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5 min-w-0">
            {c.href ? (
              <Link href={c.href} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors truncate">{c.label}</Link>
            ) : (
              <span className="font-bold text-gray-900 dark:text-white truncate" aria-current="page">{c.label}</span>
            )}
            {i < crumbs.length - 1 && <Chevron />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Chevron() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
