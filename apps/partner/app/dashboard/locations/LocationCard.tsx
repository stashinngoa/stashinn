'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteLocation } from './actions';
import Icon from '../../../components/Icon';
import { capacitySummary, fmtTime12, locationStatus } from './locationUi';

export default function LocationCard({ location, isPrimary, pausedUntil }: { location: any; isPrimary?: boolean; pausedUntil?: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const st = locationStatus(location.admin_status);
  const garage = location.location_type === 'garage';
  const needsChanges = (location.admin_status === 'update_required' || location.admin_status === 'rejected') && location.status_reason;
  const href = `/dashboard/locations/${location.id}`;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`Delete "${location.name}"? This can't be undone.`)) return;
    setIsDeleting(true);
    const res = await deleteLocation(location.id);
    setIsDeleting(false);
    if (res?.error) alert(res.error);
    else router.refresh();
  };

  return (
    <Link href={href} className={`group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border shadow-sm dark:shadow-none hover:shadow-md transition-all ${
      needsChanges ? 'border-sky-300 dark:border-sky-700/60' : 'border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700/60'
    } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
        {location.photos?.length ? (
          <img src={location.photos[0]} alt="" className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.02] transition-transform" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-800 dark:to-gray-900 text-orange-400 dark:text-gray-500">
            <Icon name={garage ? 'car' : 'bag'} className="w-9 h-9" />
            <span className="text-[10px] font-bold uppercase tracking-wider">No photos yet</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${st.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
          </span>
          {isPrimary && <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/95 dark:bg-gray-900/95 text-orange-700 dark:text-orange-400 shadow-sm">Primary</span>}
        </div>
        {pausedUntil && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950">
            <Icon name="clock" className="w-3.5 h-3.5" />Paused until {new Date(pausedUntil).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
        {location.photos?.length > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
            <Icon name="photo" className="w-3 h-3" />{location.photos.length}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Icon name={garage ? 'car' : 'bag'} className="w-3.5 h-3.5" />{garage ? 'Vehicle parking' : 'Luggage storage'}
        </div>
        <h3 className="mt-1 font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-700 dark:group-hover:text-orange-400">{location.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{[location.address_line1, location.city].filter(Boolean).join(', ')}</p>

        {needsChanges && (
          <p className="mt-3 flex gap-1.5 rounded-lg border border-sky-200 dark:border-sky-800/50 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-2 text-xs text-sky-900 dark:text-sky-200">
            <Icon name="info" className="w-4 h-4 shrink-0" />
            <span className="line-clamp-2"><span className="font-bold">StashInn:</span> {location.status_reason}</span>
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">{capacitySummary(location)}</span>
          <span className="inline-flex items-center gap-1 shrink-0"><Icon name="clock" className="w-3.5 h-3.5" />{fmtTime12(location.operating_hours?.open)} – {fmtTime12(location.operating_hours?.close)}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
            {needsChanges ? 'Review & update' : 'View details'} <Icon name="chevron" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
          {!isPrimary && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label={`Delete ${location.name}`}
              title="Delete location"
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Icon name="trash" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
