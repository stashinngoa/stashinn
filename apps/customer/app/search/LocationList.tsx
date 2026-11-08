'use client';

import Link from 'next/link';
import type { Amenity } from '@stashinn/lib/services/amenities';
import PhotoCarousel from './PhotoCarousel';
import { locationHref, resultInfo, type SearchMode } from './resultInfo';

const PAGE_SIZE = 10;

export default function LocationList({
  locations,
  searchParams,
  totalCount = 0,
  amenityCatalog,
  hoveredId,
  onHover,
}: {
  locations: any[];
  searchParams: Record<string, string | undefined>;
  totalCount?: number;
  amenityCatalog: Amenity[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  const mode: SearchMode = searchParams.mode === 'garage' ? 'garage' : 'luggage';

  if (!locations.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No {mode === 'garage' ? 'parking' : 'storage'} spots here yet</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">Try a nearby area, other dates, or remove some filters.</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
        {locations.map(loc => (
          <li key={loc.id}>
            <ResultCard
              loc={loc}
              mode={mode}
              searchParams={searchParams}
              amenityCatalog={amenityCatalog}
              active={hoveredId === loc.id}
              onHover={onHover}
            />
          </li>
        ))}
      </ul>
      <Pagination searchParams={searchParams} totalCount={totalCount} />
    </div>
  );
}

function ResultCard({ loc, mode, searchParams, amenityCatalog, active, onHover }: {
  loc: any;
  mode: SearchMode;
  searchParams: Record<string, string | undefined>;
  amenityCatalog: Amenity[];
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  const info = resultInfo(loc, mode, searchParams.vehicleType, amenityCatalog);
  const shown = info.amenities.slice(0, 3);

  return (
    <Link
      href={locationHref(loc.id, searchParams)}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => onHover(loc.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(loc.id)}
      onBlur={() => onHover(null)}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white dark:bg-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${active
        ? 'border-orange-300 dark:border-orange-600/60 shadow-lg shadow-orange-500/10 -translate-y-0.5'
        : 'border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md'}`}
    >
      <div className="relative">
        <PhotoCarousel photos={loc.photos} alt={loc.name} className="aspect-[4/3]" />
        {info.distance && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-gray-900/95 px-2.5 py-1 text-[11px] font-bold text-gray-800 dark:text-gray-100 shadow-sm">
            <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            {info.distance}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-gray-900 dark:text-white leading-snug line-clamp-1">{loc.name}</h3>
          <Rating value={info.rating} />
        </div>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{loc.area}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {info.capacity !== null && (
            <span className="rounded-md bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 text-[11px] font-bold text-orange-700 dark:text-orange-400">
              {info.capacity} {info.capacity === 1 ? 'space' : 'spaces'} for your vehicle
            </span>
          )}
          {shown.map(a => (
            <span key={a} className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">{a}</span>
          ))}
          {info.amenities.length > shown.length && (
            <span className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">+{info.amenities.length - shown.length} more</span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between pt-4">
          <p>
            <span className="text-xl font-black text-gray-900 dark:text-white">₹{info.price}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400"> / hour{mode === 'luggage' ? ' per bag' : ''}</span>
          </p>
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">View &amp; book →</span>
        </div>
      </div>
    </Link>
  );
}

export function Rating({ value, light = false }: { value: string | null; light?: boolean }) {
  return value ? (
    <span className={`inline-flex shrink-0 items-center gap-1 text-sm font-bold ${light ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
      <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
      {value}
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">New</span>
  );
}

function Pagination({ searchParams, totalCount }: { searchParams: Record<string, string | undefined>; totalCount: number }) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const current = Math.min(Math.max(1, parseInt(searchParams.page || '1')), totalPages);
  const href = (page: number) => {
    const p = new URLSearchParams(Object.entries(searchParams).filter(([, v]) => v) as [string, string][]);
    p.set('page', String(page));
    return `/search?${p.toString()}`;
  };
  // First, last and the pages around the current one, with gaps between
  const pages = [...new Set([1, current - 1, current, current + 1, totalPages])].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const base = 'min-w-10 h-10 px-3 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors';
  const idle = `${base} border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-orange-300 dark:hover:border-orange-700/60`;

  return (
    <nav aria-label="Pages" className="pt-8 flex items-center justify-center gap-2">
      {current > 1 && <Link href={href(current - 1)} aria-label="Previous page" className={idle}>‹</Link>}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1]! > 1 && <span className="text-gray-400">…</span>}
          <Link href={href(p)} aria-current={p === current ? 'page' : undefined} className={p === current ? `${base} bg-orange-600 text-white` : idle}>{p}</Link>
        </span>
      ))}
      {current < totalPages && <Link href={href(current + 1)} aria-label="Next page" className={idle}>›</Link>}
    </nav>
  );
}
