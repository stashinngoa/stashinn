'use client';

import { useSearchParams } from 'next/navigation';

export default function DateRangeFilter() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  return (
    <form method="GET" className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 font-medium">From</label>
        <input 
          type="date" 
          name="startDate" 
          defaultValue={startDate}
          className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-1.5 focus:border-purple-500 focus:outline-none shadow-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 font-medium">To</label>
        <input 
          type="date" 
          name="endDate" 
          defaultValue={endDate}
          className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-1.5 focus:border-purple-500 focus:outline-none shadow-sm"
        />
      </div>
      <button 
        type="submit" 
        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
      >
        Filter
      </button>
      {(startDate || endDate) && (
        <a 
          href="/dashboard/reports" 
          className="px-3 py-1.5 text-gray-500 hover:text-gray-900 text-sm transition-colors font-medium"
        >
          Clear
        </a>
      )}
    </form>
  );
}
