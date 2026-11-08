'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NAV_SECTIONS } from './adminNav';
import { accessFor, type AdminRole } from '../lib/permissions';
import { roleInfo } from '../app/dashboard/staff/roles';

const pageLabel = (segment: string) =>
  NAV_SECTIONS.flatMap(s => s.items).find(i => i.href === `/dashboard/${segment}`)?.label ?? 'that page';

/**
 * Wraps dashboard content with role notices:
 * - "view only" pages get a banner, and anything marked `data-edit` is hidden (see globals.css)
 * - after the middleware bounces a blocked URL back here (?denied=…), explains why
 * Server actions enforce the same rules (lib/adminAccess.ts); this is the visual layer.
 */
export default function RoleAccessArea({ role, children }: { role: AdminRole; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewOnly = accessFor(role, pathname) === 'view';
  const deniedSegment = searchParams.get('denied');
  const [denied, setDenied] = useState<string | null>(null);

  useEffect(() => {
    if (!deniedSegment) return;
    setDenied(pageLabel(deniedSegment));
    // Drop the flag from the address bar so a refresh doesn't repeat the notice
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete('denied');
    router.replace(qs.toString() ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [deniedSegment, pathname, router, searchParams]);

  const label = roleInfo(role).label;

  return (
    <>
      {denied && (
        <div role="alert" className="max-w-7xl mx-auto mb-4 flex items-start gap-3 p-3.5 rounded-xl border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span className="flex-1">The {label} role doesn’t have access to {denied}. Ask a superadmin if you need it.</span>
          <button type="button" onClick={() => setDenied(null)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {viewOnly && (
        <div className="max-w-7xl mx-auto mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/50 text-sm text-sky-800 dark:text-sky-300">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          View only — as {label} you can see this page but not make changes.
        </div>
      )}
      <div data-readonly={viewOnly ? 'true' : undefined}>{children}</div>
    </>
  );
}
