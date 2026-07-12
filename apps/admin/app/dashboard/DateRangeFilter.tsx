'use client';

import { useSearchParams } from 'next/navigation';

export default function DateRangeFilter() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  return (
    <form method="GET" className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400 font-medium">From</label>
        <input 
          type="date" 
          name="startDate" 
          defaultValue={startDate}
          className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:border-purple-500 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400 font-medium">To</label>
        <input 
          type="date" 
          name="endDate" 
          defaultValue={endDate}
          className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:border-purple-500 focus:outline-none"
        />
      </div>
      <button 
        type="submit" 
        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-colors"
      >
        Filter
      </button>
      {(startDate || endDate) && (
        <a 
          href="/dashboard" 
          className="px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors font-medium"
        >
          Clear
        </a>
      )}
    </form>
  );
}
