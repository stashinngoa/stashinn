'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CustomerSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/dashboard/customers?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/dashboard/customers');
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-3">
      <div className="relative flex-1 max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
        />
      </div>
      <button
        type="submit"
        className="px-5 py-2.5 bg-gray-800 text-gray-300 font-bold text-sm rounded-lg border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
      >
        Search
      </button>
      {defaultValue && (
        <button
          type="button"
          onClick={() => { setQuery(''); router.push('/dashboard/customers'); }}
          className="px-4 py-2.5 text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          Clear
        </button>
      )}
    </form>
  );
}
