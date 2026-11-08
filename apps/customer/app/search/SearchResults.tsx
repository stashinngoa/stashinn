'use client';

import { useState } from 'react';
import type { Amenity } from '@stashinn/lib/services/amenities';
import FiltersBar from './FiltersBar';
import LocationList from './LocationList';
import MapWrapper from './MapWrapper';

/** Results list and map side by side, sharing which result is hovered so its pin rises. */
export default function SearchResults({ locations, totalCount, searchParams, amenityCatalog, center }: {
  locations: any[];
  totalCount: number;
  searchParams: Record<string, string | undefined>;
  amenityCatalog: Amenity[];
  center: [number, number];
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list'); // small screens
  const [mapExpanded, setMapExpanded] = useState(false); // large screens: map across the whole page
  const mode = searchParams.mode === 'garage' ? 'garage' : 'luggage';

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* On large screens the list slides away (width → 0) while the map grows to fill the page */}
      <section
        aria-label="Results"
        inert={mapExpanded || undefined}
        className={`w-full shrink-0 lg:overflow-x-clip lg:transition-[width,opacity] lg:duration-500 lg:ease-in-out ${view === 'map' ? 'hidden lg:block' : ''} ${mapExpanded ? 'lg:w-0 lg:opacity-0' : 'lg:w-[56vw] xl:w-[54vw]'}`}
      >
        {/* Fixed width inside, so the cards don't squash while the section slides */}
        <div className="px-4 sm:px-6 py-5 lg:py-6 lg:w-[56vw] xl:w-[54vw]">
          <FiltersBar searchParams={searchParams} amenityCatalog={amenityCatalog} total={totalCount || locations.length} view={view} onView={setView} />
          <div className="mt-5">
            <LocationList
              locations={locations}
              searchParams={searchParams}
              totalCount={totalCount}
              amenityCatalog={amenityCatalog}
              hoveredId={hoveredId}
              onHover={setHoveredId}
            />
          </div>
        </div>
      </section>

      <section
        aria-label="Map"
        className={`relative w-full min-w-0 lg:flex-1 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] p-3 sm:p-4 lg:transition-[padding] lg:duration-500 ${mapExpanded ? '' : 'lg:pl-0'} ${view === 'list' ? 'hidden lg:block' : 'h-[calc(100vh-4rem)]'}`}
      >
        {view === 'map' && (
          <div className="lg:hidden mb-3">
            <FiltersBar searchParams={searchParams} amenityCatalog={amenityCatalog} total={totalCount || locations.length} view={view} onView={setView} />
          </div>
        )}
        {/* Large screens: widen the map over the whole page, or bring the list back */}
        <button
          type="button"
          onClick={() => { setMapExpanded(e => !e); setHoveredId(null); }}
          aria-pressed={mapExpanded}
          aria-label={mapExpanded ? 'Show the list of locations' : 'Hide the list and expand the map'}
          title={mapExpanded ? 'Show list' : 'Expand map'}
          className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 z-[500] w-10 h-10 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-lg hover:border-orange-300 dark:hover:border-orange-600/60 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-500 ${mapExpanded ? 'left-7' : '-left-5'}`}
        >
          <svg className={`w-4 h-4 transition-transform duration-500 ${mapExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="relative h-full w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <MapWrapper
            locations={locations}
            center={center}
            mode={mode}
            searchParams={searchParams}
            amenityCatalog={amenityCatalog}
            hoveredId={hoveredId}
            onHover={setHoveredId}
          />
        </div>
      </section>
    </div>
  );
}
