'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import type { Amenity } from '@stashinn/lib/services/amenities';
import PhotoCarousel from './PhotoCarousel';
import { Rating } from './LocationList';
import { locationHref, resultInfo, type SearchMode } from './resultInfo';

/**
 * Fits the map to the results whenever the set of results changes (not on hover), and
 * redraws it when its box changes size. A hidden map (the mobile Map tab before it's
 * opened) has no size, so fitting waits until it's shown.
 */
function MapFit({ locations, center }: { locations: any[]; center: [number, number] }) {
  const map = useMap();
  const key = locations.map(l => l.id).join(',') || center.join(',');
  const fitted = useRef<string | null>(null);

  useEffect(() => {
    const fit = () => {
      const size = map.getSize();
      if (!size.x || !size.y || fitted.current === key) return;
      fitted.current = key;
      if (locations.length > 0) {
        map.flyToBounds(L.latLngBounds(locations.map(l => [l.latitude, l.longitude])), { padding: [60, 60], maxZoom: 15, duration: 1.2 });
      } else {
        map.flyTo(center, 12, { duration: 1.2 });
      }
    };
    fit();
    // Keeps the centre in place while the box resizes (e.g. during the expand-map slide)
    const ro = new ResizeObserver(() => { map.invalidateSize({ pan: true, animate: false, debounceMoveend: true }); fit(); });
    ro.observe(map.getContainer());
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** A price tag pin. Icons are cached per label so re-renders don't rebuild the pins. */
const iconCache = new Map<string, L.DivIcon>();
const pinIcon = (label: string) => {
  if (!iconCache.has(label)) {
    iconCache.set(label, L.divIcon({ className: 'stash-pin-wrap', html: `<div class="stash-pin"><span>${label}</span></div>`, iconSize: [0, 0], iconAnchor: [0, 0] }));
  }
  return iconCache.get(label)!;
};

/**
 * Raises the pin of the hovered result by toggling a class on its existing element
 * (swapping the icon would rebuild the element under the mouse and flicker).
 */
function useRaised(marker: React.RefObject<L.Marker | null>, raised: boolean) {
  useEffect(() => {
    const el = marker.current?.getElement();
    el?.querySelector('.stash-pin')?.classList.toggle('is-raised', raised);
    marker.current?.setZIndexOffset(raised ? 1000 : 0);
  }, [marker, raised]);
}

export default function SearchMap({ locations, center, mode, searchParams, amenityCatalog, hoveredId, onHover }: {
  locations: any[];
  center: [number, number];
  mode: SearchMode;
  searchParams: Record<string, string | undefined>;
  amenityCatalog: Amenity[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  const infos = useMemo(
    () => new Map(locations.map(l => [l.id, resultInfo(l, mode, searchParams.vehicleType, amenityCatalog)])),
    [locations, mode, searchParams.vehicleType, amenityCatalog],
  );

  return (
    <div className="h-full w-full">
      <style>{`
        .stash-pin-wrap { background: none; border: 0; }
        .stash-pin {
          position: absolute; left: 0; top: 0;
          transform: translate(-50%, calc(-100% - 6px));
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .stash-pin span {
          display: block; white-space: nowrap;
          padding: 5px 10px; border-radius: 999px;
          font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
          color: #111827; background: #fff;
          border: 1px solid rgba(17,24,39,.12);
          box-shadow: 0 2px 6px rgba(0,0,0,.18);
        }
        .stash-pin::after {
          content: ''; position: absolute; left: 50%; bottom: -5px;
          width: 10px; height: 10px; background: #fff;
          border-right: 1px solid rgba(17,24,39,.12); border-bottom: 1px solid rgba(17,24,39,.12);
          transform: translateX(-50%) rotate(45deg);
        }
        .stash-pin:hover span { border-color: #f97316; }
        .stash-pin.is-raised { transform: translate(-50%, calc(-100% - 16px)) scale(1.15); }
        .stash-pin.is-raised span { background: #ea580c; color: #fff; border-color: #ea580c; box-shadow: 0 10px 22px rgba(234,88,12,.4); }
        .stash-pin.is-raised::after { background: #ea580c; border-color: #ea580c; }

        .stash-popup .leaflet-popup-content-wrapper { padding: 0; border-radius: 1rem; overflow: hidden; background: transparent; box-shadow: 0 18px 40px rgba(0,0,0,.25); }
        .stash-popup .leaflet-popup-content { margin: 0; width: 272px !important; }
        .stash-popup .leaflet-popup-tip-container { display: none; }
        .stash-popup a.leaflet-popup-close-button {
          top: 10px; right: 10px; width: 28px; height: 28px; z-index: 5;
          display: flex; align-items: center; justify-content: center;
          border-radius: 999px; background: rgba(255,255,255,.95); color: #111827; font: 600 18px/1 sans-serif;
          box-shadow: 0 2px 6px rgba(0,0,0,.2);
        }
        .stash-popup a.leaflet-popup-close-button:hover { color: #ea580c; }
        .leaflet-container a.stash-cta { color: #fff; }
      `}</style>
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%', zIndex: 10 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map(loc => (
          <ResultPin key={loc.id} loc={loc} info={infos.get(loc.id)!} raised={hoveredId === loc.id} mode={mode} searchParams={searchParams} onHover={onHover} />
        ))}
        <MapFit locations={locations} center={center} />
      </MapContainer>
    </div>
  );
}

function ResultPin({ loc, info, raised, mode, searchParams, onHover }: {
  loc: any;
  info: ReturnType<typeof resultInfo>;
  raised: boolean;
  mode: SearchMode;
  searchParams: Record<string, string | undefined>;
  onHover: (id: string | null) => void;
}) {
  const marker = useRef<L.Marker | null>(null);
  const [open, setOpen] = useState(false);
  useRaised(marker, raised || open); // the pin whose card is open stays raised
  return (
    <Marker
      ref={marker}
      position={[loc.latitude, loc.longitude]}
      icon={pinIcon(`₹${info.price}`)}
      riseOnHover
      keyboard
      title={loc.name}
      eventHandlers={{ mouseover: () => onHover(loc.id), mouseout: () => onHover(null), popupopen: () => setOpen(true), popupclose: () => setOpen(false) }}
    >
      <Popup className="stash-popup" offset={[0, -36]} autoPanPadding={[24, 24]}>
        <div className="bg-white dark:bg-gray-900 text-left font-inter">
          <a href={locationHref(loc.id, searchParams)} target="_blank" rel="noopener noreferrer" className="block !text-inherit no-underline">
            <PhotoCarousel photos={loc.photos} alt={loc.name} className="h-40" />
          </a>
          <div className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold text-[15px] leading-snug text-gray-900 dark:text-white line-clamp-1">{loc.name}</div>
              <Rating value={info.rating} />
            </div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
              {[info.distance, loc.area].filter(Boolean).join(' · ')}
            </div>
            {info.capacity !== null && (
              <div className="mt-2 inline-block rounded-md bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 text-[11px] font-bold text-orange-700 dark:text-orange-400">
                {info.capacity} {info.capacity === 1 ? 'space' : 'spaces'} for your vehicle
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-lg font-black text-gray-900 dark:text-white">₹{info.price}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400"> / hour{mode === 'luggage' ? ' per bag' : ''}</span>
              </div>
              <a
                href={locationHref(loc.id, searchParams)}
                target="_blank"
                rel="noopener noreferrer"
                className="stash-cta shrink-0 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold no-underline hover:bg-orange-500 transition-colors"
              >
                View &amp; book
              </a>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
