'use client';

import { useRouter } from 'next/navigation';

export default function PartnerFilter({ tabs, currentFilter }: { tabs: { value: string; label: string }[]; currentFilter: string }) {
  const router = useRouter();

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => router.push(`/dashboard/partners?status=${tab.value}`)}
          className={`px-4 py-2 text-sm font-bold rounded-lg border transition-colors ${
            currentFilter === tab.value
              ? 'bg-red-900/30 text-red-400 border-red-700/50'
              : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
