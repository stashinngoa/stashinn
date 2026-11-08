'use client';

import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('./LocationPinMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center text-gray-400 dark:text-gray-500">Loading Map...</div>
});

export default function MapWrapper({ 
  initialLat, 
  initialLng, 
  onChange 
}: { 
  initialLat: number, 
  initialLng: number, 
  onChange: (lat: number, lng: number) => void 
}) {
  return <DynamicMap initialLat={initialLat} initialLng={initialLng} onChange={onChange} />;
}
