import { tabFor, type TabKey } from './bookingShared';

export const PAGE_SIZE = 25;

export const LIST_FIELDS =
  'id, status, cancellation_code, cancellation_reason, booking_type, num_bags, vehicle_type, vehicle_make, vehicle_model, vehicle_license_plate, ' +
  'start_time, end_time, actual_checkin, actual_checkout, created_at, updated_at, total_amount, base_amount, gst_amount, commission_amount, partner_amount, location_id, ' +
  'customer:users!bookings_customer_id_fkey(full_name, email, phone), partner_locations(name, city), payments(method, status, refund_amount)';

export type Filters = { tab: TabKey; q: string; location: string; date: string; page: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) || ''; };
  const date = one('date');
  const location = one('location');
  return {
    tab: tabFor(one('tab') || (one('status') === 'pending' ? 'pending' : '')).key,
    // Characters that would break a PostgREST or() filter are dropped
    q: one('q').replace(/[,()%*\\]/g, ' ').trim().slice(0, 60),
    location: UUID.test(location) ? location : '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    page: Math.max(1, Math.min(1000, Number.parseInt(one('page'), 10) || 1)),
  };
}

/** Customers matching a search (RLS only returns this partner's customers). */
export async function matchingCustomerIds(supabase: any, q: string): Promise<string[]> {
  if (!q || /^#?[0-9a-f]{8}$/i.test(q)) return [];
  const like = `%${q}%`;
  const { data } = await supabase.from('users').select('id').or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`).limit(200);
  return (data || []).map((u: { id: string }) => u.id);
}

/** Search, location and date filters (everything except the tab). */
export function applyFilters<Q>(query: Q, f: Pick<Filters, 'q' | 'location' | 'date'>, customerIds: string[]): Q {
  let qy: any = query;
  if (f.location) qy = qy.eq('location_id', f.location);
  if (f.date) {
    // Stored at any time on that day, India time
    const dayStart = new Date(`${f.date}T00:00:00+05:30`);
    const dayEnd = new Date(dayStart.getTime() + 864e5);
    qy = qy.lt('start_time', dayEnd.toISOString()).gt('end_time', dayStart.toISOString());
  }
  if (f.q) {
    const refMatch = f.q.match(/^#?([0-9a-f]{8})$/i);
    if (refMatch) {
      const p = refMatch[1]!.toLowerCase();
      qy = qy.gte('id', `${p}-0000-0000-0000-000000000000`).lte('id', `${p}-ffff-ffff-ffff-ffffffffffff`);
    } else {
      const parts = [`vehicle_license_plate.ilike.%${f.q}%`];
      if (customerIds.length) parts.push(`customer_id.in.(${customerIds.join(',')})`);
      qy = qy.or(parts.join(','));
    }
  }
  return qy as Q;
}

export function applyTab<Q>(query: Q, tab: TabKey): Q {
  const statuses = tabFor(tab).statuses as readonly string[];
  let qy: any = query;
  if (statuses.length) qy = qy.in('status', statuses as string[]);
  switch (tab) {
    case 'checked_in': return qy.order('end_time', { ascending: true });
    case 'checked_out': return qy.order('actual_checkout', { ascending: false, nullsFirst: false });
    case 'cancelled': return qy.order('updated_at', { ascending: false });
    case 'all': return qy.order('start_time', { ascending: false });
    default: return qy.order('start_time', { ascending: true });
  }
}

/** What the partner earns from a booking (older bookings have no partner_amount stored). */
export const partnerShare = (b: { partner_amount?: any; base_amount?: any; commission_amount?: any }) =>
  b.partner_amount != null ? Number(b.partner_amount) : Math.max(0, Number(b.base_amount || 0) - Number(b.commission_amount || 0));
