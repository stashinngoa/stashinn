'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type SearchMap from './Map';

// Leaflet needs the browser, so the map only loads on the client
const DynamicMap = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 animate-pulse flex items-center justify-center text-sm font-medium text-gray-400">Loading map…</div>
  ),
});

export default function MapWrapper(props: ComponentProps<typeof SearchMap>) {
  return <DynamicMap {...props} />;
}
