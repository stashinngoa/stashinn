'use server';

import { createClient } from '@stashinn/lib/supabase/server';

export async function getAdminAnalytics() {
  const supabase = await createClient();

  // Total Users (customers)
  const { count: totalCustomers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer');

  // Total Partners
  const { count: totalPartners } = await supabase
    .from('partners')
    .select('*', { count: 'exact', head: true });

  // Pending Partners
  const { count: pendingPartners } = await supabase
    .from('partners')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Total Bookings
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });

  // Active Bookings (confirmed + checked_in)
  const { count: activeBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .in('status', ['confirmed', 'checked_in']);

  // Total Revenue (sum of paid payments)
  const { data: revenueData } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'paid');

  const totalRevenue = revenueData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  // Total Commission
  const { data: commissionData } = await supabase
    .from('partner_transactions')
    .select('commission');

  const totalCommission = commissionData?.reduce((sum, t) => sum + Number(t.commission), 0) || 0;

  // Total Locations
  const { count: totalLocations } = await supabase
    .from('partner_locations')
    .select('*', { count: 'exact', head: true });

  // Recent Bookings (last 10)
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select(`
      id, status, num_bags, total_amount, created_at,
      users!bookings_customer_id_fkey(full_name, email),
      partner_locations(name)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  // Recent Partners (last 5 pending)
  const { data: pendingPartnersList } = await supabase
    .from('partners')
    .select('id, business_name, status, created_at, users!partners_user_id_fkey(email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalCustomers: totalCustomers || 0,
    totalPartners: totalPartners || 0,
    pendingPartners: pendingPartners || 0,
    totalBookings: totalBookings || 0,
    activeBookings: activeBookings || 0,
    totalRevenue,
    totalCommission,
    totalLocations: totalLocations || 0,
    recentBookings: recentBookings || [],
    pendingPartnersList: pendingPartnersList || [],
  };
}
