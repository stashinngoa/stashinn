'use client';

import { createContext, useContext, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Ctx = { isPending: boolean; navigate: (href: string) => void };

const DashboardTransitionContext = createContext<Ctx>({ isPending: false, navigate: () => {} });

export const useDashboardNavigation = () => useContext(DashboardTransitionContext);

// Wraps the dashboard so filter changes run as a transition: the current data stays on
// screen (dimmed, with a progress bar) until the new server render arrives.
export function DashboardTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => startTransition(() => router.push(href, { scroll: false }));

  return (
    <DashboardTransitionContext.Provider value={{ isPending, navigate }}>
      {isPending && (
        <div className="fixed top-0 inset-x-0 z-[60] h-0.5 overflow-hidden bg-orange-100 dark:bg-orange-950" role="progressbar" aria-label="Loading dashboard">
          <div className="h-full w-1/3 bg-gradient-to-r from-orange-600 to-amber-500 animate-[dashboard-progress_1.1s_ease-in-out_infinite]" />
        </div>
      )}
      {children}
    </DashboardTransitionContext.Provider>
  );
}

// A plain link that navigates inside the transition, so filters show the loading state
export function TransitionLink({ href, className, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { navigate } = useDashboardNavigation();
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // allow open-in-new-tab
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function PendingArea({ children }: { children: React.ReactNode }) {
  const { isPending } = useDashboardNavigation();
  return (
    <div
      aria-busy={isPending}
      className={`space-y-6 transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none select-none' : 'opacity-100'}`}
    >
      {children}
    </div>
  );
}
