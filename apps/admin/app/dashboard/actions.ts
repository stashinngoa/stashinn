'use server';

import { createClient } from '@stashinn/lib/supabase/server';

export async function getAdminAnalytics(startDate?: string, endDate?: string) {
  const supabase = await createClient();

  // Helper to apply date filters
  const applyDateFilter = (query: any, column = 'created_at') => {
    if (startDate) query = query.gte(column, startDate);
    // endDate is a plain date; include the whole day rather than stopping at its midnight
    if (endDate) query = query.lte(column, `${endDate}T23:59:59.999`);
    return query;
  };

  // All queries are independent, so run them in parallel (one round trip instead of nine)
  const [
    { count: totalCustomers },
    { count: totalPartners },
    { count: pendingPartners },
    { data: bookingsData },
    { count: totalLocations },
    { count: liveLocations },
    { count: approvedPartners },
    { data: recentBookings },
    { data: pendingPartnersList },
    { data: paymentsData },
    { data: audits },
  ] = await Promise.all([
    // Total Users (customers)
    applyDateFilter(supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer')),
    // Total Partners
    applyDateFilter(supabase.from('partners').select('*', { count: 'exact', head: true })),
    // Pending Partners
    supabase.from('partners').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    // Bookings with amounts for trends
    applyDateFilter(supabase.from('bookings').select('created_at, status, total_amount, base_amount, commission_amount, booking_type')),
    // Total Locations
    supabase.from('partner_locations').select('*', { count: 'exact', head: true }),
    // Live Locations: approved and active, at an approved partner (what customers can book)
    supabase.from('partner_locations').select('id, partners!inner(status)', { count: 'exact', head: true })
      .eq('admin_status', 'approved').eq('is_active', true).eq('partners.status', 'approved'),
    // Approved Partners
    supabase.from('partners').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    // Recent Bookings (last 10)
    supabase
      .from('bookings')
      .select(`
        id, status, num_bags, total_amount, created_at, booking_type, vehicle_make, vehicle_model, vehicle_license_plate,
        users!bookings_customer_id_fkey(full_name, email),
        partner_locations(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10),
    // Recent Partners (last 5 pending)
    supabase
      .from('partners')
      .select('id, business_name, status, created_at, users!partners_user_id_fkey(email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    // Payments for refund anomaly highlights
    applyDateFilter(supabase.from('payments').select('refund_amount, created_at')),
    // Auth audits for sign-in analytics
    applyDateFilter(supabase.from('auth_audits').select('method, success')),
  ]);

  const totalBookings = bookingsData?.length || 0;
  const activeBookings = bookingsData?.filter((b: any) => b.status === 'confirmed' || b.status === 'checked_in').length || 0;
  const completedBookings = bookingsData?.filter((b: any) => b.status === 'checked_out') || [];

  const luggageCompleted = completedBookings.filter((b: any) => b.booking_type === 'luggage');
  const garageCompleted = completedBookings.filter((b: any) => b.booking_type === 'garage');

  const luggageRevenue = luggageCompleted.reduce((sum: number, b: any) => sum + Number(b.total_amount), 0);
  const luggageCommission = luggageCompleted.reduce((sum: number, b: any) => sum + Number(b.commission_amount), 0);

  const vehicleRevenue = garageCompleted.reduce((sum: number, b: any) => sum + Number(b.total_amount), 0);
  const vehicleCommission = garageCompleted.reduce((sum: number, b: any) => sum + Number(b.commission_amount), 0);

  const totalRevenue = completedBookings.reduce((sum: number, b: any) => sum + Number(b.total_amount), 0);
  const totalCommission = completedBookings.reduce((sum: number, b: any) => sum + Number(b.commission_amount), 0);
  const totalBeforeGst = completedBookings.reduce((sum: number, b: any) => sum + Number(b.base_amount), 0);

  const activeVehicles = bookingsData?.filter((b: any) => b.booking_type === 'garage' && (b.status === 'confirmed' || b.status === 'checked_in')).length || 0;

  // Booking counts by status and by type for the dashboard breakdown
  const statusCounts: Record<string, number> = {};
  let luggageBookings = 0;
  let garageBookings = 0;
  bookingsData?.forEach((b: any) => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    if (b.booking_type === 'garage') garageBookings++;
    else luggageBookings++;
  });

  // Daily Trends
  const dailyTrendsMap: Record<string, { revenue: number, bookings: number }> = {};
  
  if (bookingsData) {
    bookingsData.forEach((b: any) => {
      const dateStr = b.created_at.split('T')[0];
      if (!dailyTrendsMap[dateStr]) {
        dailyTrendsMap[dateStr] = { revenue: 0, bookings: 0 };
      }
      dailyTrendsMap[dateStr].bookings += 1;
      if (b.status === 'checked_out') {
        dailyTrendsMap[dateStr].revenue += Number(b.total_amount);
      }
    });
  }

  const dailyTrends = Object.keys(dailyTrendsMap).sort().map(date => ({
    date,
    ...dailyTrendsMap[date]
  }));

  const dailyRefunds: Record<string, number> = {};
  let totalRefunded = 0;

  if (paymentsData) {
    paymentsData.forEach((p: any) => {
      const dateStr = p.created_at.split('T')[0];
      const rAmount = Number(p.refund_amount) || 0;
      if (rAmount > 0) {
        dailyRefunds[dateStr] = (dailyRefunds[dateStr] || 0) + rAmount;
        totalRefunded += rAmount;
      }
    });
  }

  const refundDays = Object.values(dailyRefunds);
  const avgRefund = refundDays.length > 0 ? refundDays.reduce((a, b) => a + b, 0) / refundDays.length : 0;
  const anomalies: { date: string; amount: number; reason: string }[] = [];

  Object.entries(dailyRefunds).forEach(([date, amount]) => {
    if (amount > 1000 || (avgRefund > 0 && amount > avgRefund * 2)) {
      anomalies.push({
        date,
        amount,
        reason: amount > 1000 
          ? `High refund volume (₹${amount.toFixed(2)} exceeds ₹1,000 limit)` 
          : `Refund spike (₹${amount.toFixed(2)} is 2x above average daily refunds)`
      });
    }
  });

  const authMetrics = {
    total: 0,
    email: 0,
    whatsapp: 0,
    sms: 0,
    auto: 0,
    success_rate: 0
  };
  
  if (audits) {
    authMetrics.total = audits.length;
    let successful = 0;
    audits.forEach((a: any) => {
      if (a.success) successful++;
      if (a.method === 'email') authMetrics.email++;
      if (a.method === 'whatsapp') authMetrics.whatsapp++;
      if (a.method === 'sms') authMetrics.sms++;
      if (a.method === 'auto') authMetrics.auto++;
    });
    authMetrics.success_rate = authMetrics.total > 0 ? (successful / authMetrics.total) * 100 : 0;
  }

  return {
    totalCustomers: totalCustomers || 0,
    totalPartners: totalPartners || 0,
    pendingPartners: pendingPartners || 0,
    totalBookings: totalBookings || 0,
    activeBookings: activeBookings || 0,
    activeVehicles,
    statusCounts,
    luggageBookings,
    garageBookings,
    totalRevenue,
    totalBeforeGst,
    totalCommission,
    luggageRevenue,
    luggageCommission,
    vehicleRevenue,
    vehicleCommission,
    totalLocations: totalLocations || 0,
    liveLocations: liveLocations || 0,
    approvedPartners: approvedPartners || 0,
    recentBookings: recentBookings || [],
    pendingPartnersList: pendingPartnersList || [],
    dailyTrends,
    totalRefunded,
    anomalies,
    authMetrics
  };
}
