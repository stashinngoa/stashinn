'use client';

import { useDashboardNavigation } from '../DashboardTransition';

// A table row that opens the partner when clicked anywhere. The partner name inside is a
// real link, so keyboard users and ctrl/middle-click (open in new tab) still work.
export default function PartnerRow({ href, children }: { href: string; children: React.ReactNode }) {
  const { navigate } = useDashboardNavigation();
  return (
    <tr
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a, button')) return;
        if (window.getSelection()?.toString()) return; // let people copy a PAN or email
        if (e.metaKey || e.ctrlKey) window.open(href, '_blank');
        else navigate(href);
      }}
      className="group cursor-pointer hover:bg-orange-50/50 dark:hover:bg-gray-800/40 transition-colors"
    >
      {children}
    </tr>
  );
}
