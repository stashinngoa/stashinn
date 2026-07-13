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
      className="bg-white border border-gray-200 text-sm font-semibold text-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
    >
      <option value="newest">Newest First</option>
      <option value="oldest">Oldest First</option>
    </select>
  );
}
