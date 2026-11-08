import type { Amenity } from '@stashinn/lib/services/amenities';
import { hourlyRate, normalizeVehicleType, priceIncGst, vehicleCapacity } from '@stashinn/lib/services/bookingAvailability';

export type SearchMode = 'luggage' | 'garage';

/** What a result card and its map pin show, using the same price and capacity rules as checkout. */
export function resultInfo(loc: any, mode: SearchMode, vehicleType: string | undefined, catalog: Amenity[]) {
  const price = priceIncGst(hourlyRate(loc, mode, normalizeVehicleType(vehicleType)), loc.gst_percent);
  const rating = Number(loc.avg_rating) > 0 ? Number(loc.avg_rating).toFixed(1) : null;
  const distance = typeof loc.distance_km === 'number' ? (loc.distance_km < 1 ? `${Math.round(loc.distance_km * 1000)} m` : `${loc.distance_km.toFixed(1)} km`) : null;
  const capacity = mode === 'garage' ? vehicleCapacity(loc, vehicleType) : null;

  // Amenities are stored as labels (older rows) or keys; built-in parking ones are columns
  const labelFor = (v: string) => catalog.find(a => a.key === v || a.label === v)?.label ?? v;
  const amenities = [
    ...(mode === 'garage'
      ? catalog.filter(a => a.column && loc[a.column]).map(a => a.label)
      : []),
    ...((loc.amenities as string[] | null) || []).map(labelFor),
  ].filter((v, i, all) => all.indexOf(v) === i);

  return { price, rating, distance, capacity, amenities };
}

/** Keeps the search (dates, bags, vehicle) when opening a location. */
export const locationHref = (id: string, searchParams: Record<string, string | undefined>) => {
  const params = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => v && k !== 'page') as [string, string][]);
  const q = params.toString();
  return `/locations/${id}${q ? `?${q}` : ''}`;
};
