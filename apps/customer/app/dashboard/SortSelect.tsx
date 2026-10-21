'use client';

import { useRouter } from 'next/navigation';

export default function SortSelect({ currentSort, currentFilter }: { currentSort: string, currentFilter: string }) {
  const router = useRouter();
  
  return (
    <select 
      defaultValue={currentSort} 
      onChange={(e) => {
        router.push(`/dashboard?filter=${currentFilter}&sort=${e.target.value}`);
      }} 
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
    >
      <option value="newest">Newest First</option>
      <option value="oldest">Oldest First</option>
    </select>
  );
}
