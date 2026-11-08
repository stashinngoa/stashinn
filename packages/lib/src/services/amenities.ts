/**
 * The amenity catalog (public.amenities), managed in Admin → Configuration.
 *
 * A location stores amenities in partner_locations.amenities as their labels (customer search
 * filters on them), so a label can't be renamed once created. Four parking amenities predate
 * the catalog and live in boolean columns instead (`column`). Scoring uses each amenity's
 * `key` in system_scoring_rules.amenity_weights.
 */

export type AmenityScope = 'luggage' | 'garage';

export interface Amenity {
  key: string;
  label: string;
  applies_to: AmenityScope[];
  column: string | null;
  is_active: boolean;
}

/** Built-in amenities: also used if the catalog can't be read. */
export const DEFAULT_AMENITIES: Amenity[] = [
  { key: 'cctv', label: 'CCTV', applies_to: ['luggage', 'garage'], column: 'has_cctv', is_active: true },
  { key: '24_7', label: '24/7 Security', applies_to: ['luggage'], column: null, is_active: true },
  { key: 'security_guard', label: 'Security guard', applies_to: ['garage'], column: 'has_security_guard', is_active: true },
  { key: 'ac_storage', label: 'AC Storage', applies_to: ['luggage'], column: null, is_active: true },
  { key: 'locker', label: 'Locker Available', applies_to: ['luggage'], column: null, is_active: true },
  { key: 'ev_charging', label: 'EV charging', applies_to: ['garage'], column: 'has_ev_charging', is_active: true },
  { key: 'lockable_gate', label: 'Lockable gate', applies_to: ['garage'], column: 'has_lockable_gate', is_active: true },
];

export async function getAmenities(supabase: { from: (table: string) => any }): Promise<Amenity[]> {
  const { data, error } = await supabase
    .from('amenities')
    .select('key, label, applies_to, column_name, is_active')
    .order('sort_order')
    .order('created_at');
  if (error || !data?.length) return DEFAULT_AMENITIES;
  return (data as any[]).map(a => ({ key: a.key, label: a.label, applies_to: a.applies_to, column: a.column_name, is_active: a.is_active }));
}

/** Weight key from a new amenity's label, e.g. "Wheelchair access" -> "wheelchair_access". */
export const amenityKeyFromLabel = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/** Weight keys for a location's amenities, each counted once. */
export function amenityKeys(location: any, catalog: Amenity[] = DEFAULT_AMENITIES): string[] {
  const keys = new Set<string>();
  if (Array.isArray(location?.amenities)) {
    // Stored labels map to their key; a value already stored as a key is used as is
    location.amenities.forEach((am: string) => keys.add(catalog.find(a => a.label === am)?.key ?? am));
  }
  catalog.forEach(a => { if (a.column && location?.[a.column]) keys.add(a.key); });
  return [...keys];
}

/** Amenity points for a location, and what each amenity earned. */
export function scoreAmenities(location: any, weights: Record<string, number> | null | undefined, catalog: Amenity[] = DEFAULT_AMENITIES) {
  const earned: Record<string, number> = {};
  let total = 0;
  amenityKeys(location, catalog).forEach(key => {
    const points = Number(weights?.[key]) || 0;
    earned[key] = points;
    total += points;
  });
  return { total, earned };
}
