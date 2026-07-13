'use client';

import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('./Map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>
});

export default function MapWrapper({ locations, center }: { locations: any[], center: [number, number] }) {
  return <DynamicMap locations={locations} center={center} />;
}
