import { createClient } from '@stashinn/lib/supabase/server';

// Data for the role-specific overviews. Each function runs its queries in parallel.

type Supabase = Awaited<ReturnType<typeof createClient>>;

const BOOKING_ROW = `
  id, status, num_bags, total_amount, created_at, booking_type, vehicle_make, vehicle_model, vehicle_license_plate,
  users!bookings_customer_id_fkey(full_name, email),
  partner_locations(name)
`;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

function recentBookings(supabase: Supabase, limit = 8) {
  return supabase.from('bookings').select(BOOKING_ROW).order('created_at', { ascending: false }).limit(limit);
}

/** Checked in, but the pick-up time has passed. */
function overduePickups(supabase: Supabase) {
  return supabase
    .from('bookings')
    .select('id, end_time, users!bookings_customer_id_fkey(full_name, email), partner_locations(name)', { count: 'exact' })
    .eq('status', 'checked_in')
    .lt('end_time', new Date().toISOString())
    .order('end_time', { ascending: true })
    .limit(5);
}

export async function getOpsOverview() {
  const supabase = await createClient();
  const [pendingPartners, locationsToReview, active, overdue, newPartners, recent] = await Promise.all([
    supabase.from('partners').select('id, business_name, created_at, users!partners_user_id_fkey(email)', { count: 'exact' })
      .eq('status', 'pending').order('created_at', { ascending: true }).limit(5),
    supabase.from('partner_locations').select('id, name, city, admin_status, partner_id, created_at, partners(business_name)', { count: 'exact' })
      .in('admin_status', ['pending', 'update_required']).order('created_at', { ascending: true }).limit(5),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'checked_in']),
    overduePickups(supabase),
    supabase.from('partners').select('*', { count: 'exact', head: true }).gte('created_at', daysAgo(30)),
    recentBookings(supabase),
  ]);
  return {
    pendingPartners: { count: pendingPartners.count ?? 0, rows: pendingPartners.data ?? [] },
    locationsToReview: { count: locationsToReview.count ?? 0, rows: locationsToReview.data ?? [] },
    activeBookings: active.count ?? 0,
    overdue: { count: overdue.count ?? 0, rows: overdue.data ?? [] },
    newPartners30d: newPartners.count ?? 0,
    recentBookings: recent.data ?? [],
  };
}

export async function getFinancePayouts() {
  const supabase = await createClient();
  const [owed, failed] = await Promise.all([
    supabase.from('partner_transactions').select('amount, partner_id, partners(business_name)').in('transfer_status', ['pending', 'processing']),
    supabase.from('partner_transactions').select('*', { count: 'exact', head: true }).eq('transfer_status', 'failed'),
  ]);

  // Total owed per partner, largest first
  const byPartner = new Map<string, { name: string; amount: number; count: number }>();
  (owed.data ?? []).forEach((t: any) => {
    const row = byPartner.get(t.partner_id) ?? { name: t.partners?.business_name || 'Unknown partner', amount: 0, count: 0 };
    row.amount += Number(t.amount) || 0;
    row.count += 1;
    byPartner.set(t.partner_id, row);
  });
  const partners = [...byPartner.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.amount - a.amount);

  return {
    totalOwed: partners.reduce((s, p) => s + p.amount, 0),
    pendingTransfers: owed.data?.length ?? 0,
    partnersOwed: partners.length,
    topPartners: partners.slice(0, 5),
    failedTransfers: failed.count ?? 0,
  };
}

export async function getSupportOverview() {
  const supabase = await createClient();
  const [claims, disputed, overdue, cancellations, lowReviews, recent] = await Promise.all([
    supabase.from('damage_reports').select('id, status, description, created_at, booking_id', { count: 'exact' })
      .in('status', ['submitted', 'under_review', 'escalated']).order('created_at', { ascending: true }).limit(5),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    overduePickups(supabase),
    supabase.from('bookings').select('id, cancelled_by, cancellation_reason, updated_at, users!bookings_customer_id_fkey(full_name, email), partner_locations(name)', { count: 'exact' })
      .eq('status', 'cancelled').gte('updated_at', daysAgo(7)).order('updated_at', { ascending: false }).limit(5),
    supabase.from('reviews').select('id, rating, comment, created_at, users(full_name, email), partner_locations(name)', { count: 'exact' })
      .lte('rating', 2).gte('created_at', daysAgo(30)).order('created_at', { ascending: false }).limit(5),
    recentBookings(supabase),
  ]);
  return {
    openClaims: { count: claims.count ?? 0, rows: claims.data ?? [] },
    disputedBookings: disputed.count ?? 0,
    overdue: { count: overdue.count ?? 0, rows: overdue.data ?? [] },
    cancellations7d: { count: cancellations.count ?? 0, rows: cancellations.data ?? [] },
    lowReviews30d: { count: lowReviews.count ?? 0, rows: lowReviews.data ?? [] },
    recentBookings: recent.data ?? [],
  };
}
