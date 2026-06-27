'use client';

import Link from 'next/link';
import { deleteLocation } from './actions';
import { useState } from 'react';

export default function LocationCard({ location }: { location: any }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this location?')) {
      setIsDeleting(true);
      await deleteLocation(location.id);
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      <div className="h-32 bg-gradient-to-r from-gray-100 to-gray-200 relative">
        {location.photos && location.photos.length > 0 ? (
          <img src={location.photos[0]} alt={location.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
             </svg>
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-md text-xs font-semibold shadow-sm text-green-700 border border-green-100">
          {location.is_active ? 'Active' : 'Inactive'}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 truncate">{location.name}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{location.address_line1}, {location.city}</p>
        
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div className="bg-gray-50 p-2 rounded">
            <span className="block text-xs text-gray-400">Capacity</span>
            <span className="font-semibold">{location.max_bags} Bags</span>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="block text-xs text-gray-400">Rate</span>
            <span className="font-semibold">₹{location.price_per_hour}/hr</span>
          </div>
        </div>
        
        <div className="mt-6 flex gap-3 pt-4 border-t border-gray-50">
          <Link href={`/dashboard/locations/${location.id}`} className="flex-1 text-center py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200">
            Edit
          </Link>
          <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors border border-red-100">
            {isDeleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
