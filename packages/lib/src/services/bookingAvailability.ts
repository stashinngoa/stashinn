/**
 * Booking prices, capacity and pauses, shared by the customer search, location page,
 * checkout and the server-side booking check so they can never disagree.
 *
 * Vehicles:
 *  - bikes have their own slots and rate;
 *  - cars and SUVs pay the car rate (vehicle_pricing.sedan_rate_hr; SUV rate columns are unused);
 *  - an SUV needs an SUV slot, while a car uses a car slot or, when those are full, a free SUV slot.
 */

export type VehicleType = 'bike' | 'car' | 'suv';
export type BookingMode = 'luggage' | 'garage';

/** Used only if the rate in system_scoring_rules (Admin → Scoring System) can't be read. */
export const DEFAULT_GST_PERCENT = 18;

/** The GST % set in Admin → Scoring System. Guests can't read that table: use a service-role client. */
export async function getGstPercent(supabase: { from: (table: string) => any }): Promise<number> {
  const { data } = await supabase.from('system_scoring_rules').select('gst_rate').eq('id', 1).maybeSingle();
  const rate = Number(data?.gst_rate);
  return Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_GST_PERCENT;
}

/** GST % for a partner's bookings: the system rate, or 0 if an admin set GST as not applying to them. */
export const gstPercentFor = (systemPercent: number, partner: { gst_applicable?: boolean | null } | null | undefined) =>
  partner?.gst_applicable === false ? 0 : systemPercent;

/**
 * What a customer pays per hour: the stored rate (always before GST) plus GST, rounded up
 * to a whole rupee. GST is applied here and nowhere else, so it can't be charged twice.
 */
export function priceIncGst(rate: number, gstPercent: number = DEFAULT_GST_PERCENT): number {
  // toFixed drops floating point noise, which could otherwise round an exact price up a rupee
  return Math.ceil(Number((rate * (1 + gstPercent / 100)).toFixed(6)));
}

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'bike', label: 'Bike / scooter' },
  { value: 'car', label: 'Car (hatchback / sedan)' },
  { value: 'suv', label: 'SUV / MUV' },
];

/**
 * Booking times arrive as local Goa times without a zone ("2026-11-09T11:00"). Read them as
 * India time, so a server running in UTC doesn't shift them by 5½ hours. Values that already
 * carry a zone (or "Z") are left as they are.
 */
export function parseIndiaTime(value: string | null | undefined): Date {
  const v = (value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(v)) return new Date(`${v}${v.length === 16 ? ':00' : ''}+05:30`);
  return new Date(v);
}

/** URL / form value to a vehicle type. The old 'sedan' value means car. */
export const normalizeVehicleType = (v?: string | null): VehicleType => (v === 'bike' ? 'bike' : v === 'suv' ? 'suv' : 'car');

export const vehicleLabel = (v?: string | null) => VEHICLE_TYPES.find(t => t.value === normalizeVehicleType(v))!.label;

const vp = (location: any) => (Array.isArray(location?.vehicle_pricing) ? location.vehicle_pricing[0] : location?.vehicle_pricing) || {};

/**
 * Hourly rate before GST, set by applying the location's score. SUVs use the car rate.
 * 0 means the location has no rate yet; there is no default price.
 */
export function hourlyRate(location: any, mode: BookingMode, vehicleType?: string | null): number {
  if (mode !== 'garage') return Number(location?.price_per_hour) || 0;
  const pricing = vp(location);
  return Number(normalizeVehicleType(vehicleType) === 'bike' ? pricing.bike_rate_hr : pricing.sedan_rate_hr) || 0;
}

/** Whether an admin has applied this location's score, giving it the rates it needs to go live. */
export function isLocationPriced(location: any): boolean {
  if (!(Number(location?.auto_score) > 0)) return false;
  if (location?.location_type !== 'garage') return hourlyRate(location, 'luggage') > 0;
  return hourlyRate(location, 'garage', 'bike') > 0 && hourlyRate(location, 'garage', 'car') > 0;
}

export interface AmountSplit {
  /** Amount with GST removed. */
  taxable: number;
  gst: number;
  /** Commission on the taxable amount. */
  commission: number;
  /** Taxable amount minus commission. */
  partner: number;
}

const rupees = (n: number) => Math.round(n * 100) / 100;

/** Splits a GST-inclusive amount. The parts always add back up to the total. */
export function splitAmount(total: number, gstPercent: number, commissionPercent: number): AmountSplit {
  const taxable = rupees(total / (1 + gstPercent / 100));
  const commission = rupees(taxable * (commissionPercent / 100));
  return { taxable, gst: rupees(total - taxable), commission, partner: rupees(taxable - commission) };
}

/** What a partner hands to StashInn after collecting cash: commission plus the GST. Older bookings have no GST recorded. */
export const platformDue = (booking: { commission_amount?: number | string | null; gst_amount?: number | string | null }) =>
  rupees((Number(booking?.commission_amount) || 0) + (Number(booking?.gst_amount) || 0));

export interface Quote {
  hours: number;
  pricePerHourIncGst: number;
  total: number;
  base: number;
  gst: number;
}

/** Price for a stay: rate incl. GST rounded up per hour, × started hours × quantity. The total already includes GST. */
export function quote(rate: number, start: Date, end: Date, quantity = 1, gstPercent: number = DEFAULT_GST_PERCENT): Quote {
  const pricePerHourIncGst = priceIncGst(rate, gstPercent);
  const ms = end.getTime() - start.getTime();
  const hours = ms > 0 ? Math.ceil(ms / 3_600_000) : 0;
  const total = pricePerHourIncGst * hours * Math.max(0, quantity);
  const base = total / (1 + gstPercent / 100);
  return { hours, pricePerHourIncGst, total, base, gst: total - base };
}

/** Slots a vehicle type can use at a location when nothing is booked (cars may also use SUV slots). */
export function vehicleCapacity(location: any, vehicleType?: string | null): number {
  const pricing = vp(location);
  const bike = Number(pricing.bike_capacity) || 0;
  const car = Number(pricing.sedan_capacity) || 0;
  const suv = Number(pricing.suv_capacity) || 0;
  const type = normalizeVehicleType(vehicleType);
  return type === 'bike' ? bike : type === 'suv' ? suv : car + suv;
}

export type VehicleCounts = Record<VehicleType, number>;

/** Whether one more vehicle of `type` fits next to the vehicles already parked. */
export function vehicleFits(location: any, booked: VehicleCounts, vehicleType?: string | null): boolean {
  const pricing = vp(location);
  const cap = { bike: Number(pricing.bike_capacity) || 0, car: Number(pricing.sedan_capacity) || 0, suv: Number(pricing.suv_capacity) || 0 };
  const next = { ...booked };
  next[normalizeVehicleType(vehicleType)] += 1;
  if (next.bike > cap.bike || next.suv > cap.suv) return false;
  return next.car <= cap.car + (cap.suv - next.suv); // cars overflow into free SUV slots
}

export interface PauseWindow {
  starts_at: string;
  ends_at: string;
}

/** The first pause that overlaps [start, end), if any. */
export function overlappingPause<T extends PauseWindow>(pauses: T[] | null | undefined, start: Date, end: Date): T | null {
  return (pauses || []).find(p => new Date(p.starts_at) < end && new Date(p.ends_at) > start) ?? null;
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in'];

export type AvailabilityResult =
  | { ok: true; location: any; rate: number; quote: Quote; vehicleType: VehicleType | null; gstPercent: number }
  | { ok: false; reason: string };

/**
 * Server-side check before taking a booking or payment: the location is bookable, isn't
 * paused, has room for these bags / this vehicle, and what it costs. Use a service-role
 * client (it reads other customers' bookings and private pause records).
 */
export async function checkAvailability(
  supabase: { from: (table: string) => any },
  params: { locationId: string; mode: BookingMode; vehicleType?: string | null; bags?: number; start: Date; end: Date; excludeBookingId?: string },
): Promise<AvailabilityResult> {
  const { locationId, mode, start, end } = params;
  if (!(end > start)) return { ok: false, reason: 'Pick-up must be after drop-off.' };

  const { data: location } = await supabase
    .from('partner_locations')
    .select('id, partner_id, name, is_active, location_type, max_bags, price_per_hour, auto_score, commission_rate, vehicle_pricing(*), partners(gst_applicable)')
    .eq('id', locationId)
    .maybeSingle();
  if (!location || !location.is_active || !isLocationPriced(location)) return { ok: false, reason: 'This location is not taking bookings right now.' };
  if ((location.location_type === 'garage') !== (mode === 'garage')) return { ok: false, reason: 'This location doesn\'t offer that kind of storage.' };

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  // When moving an existing booking, it doesn't compete with itself for space
  let others = supabase.from('bookings').select('num_bags, vehicle_type').eq('location_id', locationId).in('status', ACTIVE_STATUSES).lt('start_time', endIso).gt('end_time', startIso);
  if (params.excludeBookingId) others = others.neq('id', params.excludeBookingId);
  const [{ data: pauses }, { data: overlapping }] = await Promise.all([
    supabase.from('location_pauses').select('starts_at, ends_at').eq('location_id', locationId).is('cancelled_at', null).lt('starts_at', endIso).gt('ends_at', startIso),
    others,
  ]);

  const pause = overlappingPause(pauses as PauseWindow[], start, end);
  if (pause) {
    const until = new Date(pause.ends_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    return { ok: false, reason: `This location is closed for bookings until ${until}. Please choose other times or another location.` };
  }

  const rows = (overlapping as { num_bags: number; vehicle_type: string | null }[]) || [];
  let vehicleType: VehicleType | null = null;
  if (mode === 'garage') {
    vehicleType = normalizeVehicleType(params.vehicleType);
    const booked: VehicleCounts = { bike: 0, car: 0, suv: 0 };
    rows.forEach(r => { booked[normalizeVehicleType(r.vehicle_type)] += 1; }); // older bookings without a type count as cars
    if (!vehicleFits(location, booked, vehicleType)) return { ok: false, reason: `No ${vehicleLabel(vehicleType).toLowerCase()} space is free for those times.` };
  } else {
    const bags = Math.max(1, params.bags || 1);
    const bookedBags = rows.reduce((sum, r) => sum + (Number(r.num_bags) || 0), 0);
    if (bookedBags + bags > (Number(location.max_bags) || 0)) {
      const left = Math.max(0, (Number(location.max_bags) || 0) - bookedBags);
      return { ok: false, reason: left ? `Only ${left} bag space${left === 1 ? ' is' : 's are'} free for those times.` : 'No bag space is free for those times.' };
    }
  }

  const rate = hourlyRate(location, mode, vehicleType);
  const gstPercent = gstPercentFor(await getGstPercent(supabase), location.partners);
  return { ok: true, location, rate, vehicleType, gstPercent, quote: quote(rate, start, end, mode === 'garage' ? 1 : Math.max(1, params.bags || 1), gstPercent) };
}
