'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function PartnerFilter({ tabs, currentFilter }: { tabs: { value: string; label: string }[]; currentFilter: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleTabClick = (value: string) => {
    startTransition(() => {
      router.push(`/dashboard/partners?status=${value}`);
    });
  };

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleTabClick(tab.value)}
          disabled={isPending}
          className={`px-4 py-2 text-sm font-bold rounded-lg border transition-colors ${
            currentFilter === tab.value
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
          } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {tab.label}
        </button>
      ))}
      {isPending && (
        <div className="ml-2 w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      )}
    </div>
  );
}
