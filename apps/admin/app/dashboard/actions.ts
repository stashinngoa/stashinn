'use server';

import { createClient } from '@stashinn/lib/supabase/server';

export async function getAdminAnalytics(startDate?: string, endDate?: string) {
  const supabase = await createClient();

  // Helper to apply date filters
  const applyDateFilter = (query: any, column = 'created_at') => {
    if (startDate) query = query.gte(column, startDate);
    if (endDate) query = query.lte(column, endDate);
    return query;
  };

  // Total Users (customers)
  const { count: totalCustomers } = await applyDateFilter(
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer')
  );

  // Total Partners
  const { count: totalPartners } = await applyDateFilter(
    supabase.from('partners').select('*', { count: 'exact', head: true })
  );

  // Pending Partners
  const { count: pendingPartners } = await supabase
    .from('partners')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Bookings with amounts for trends
  const { data: bookingsData } = await applyDateFilter(
    supabase.from('bookings').select('created_at, status, total_amount, commission_amount, booking_type')
  );

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

  const activeVehicles = bookingsData?.filter((b: any) => b.booking_type === 'garage' && (b.status === 'confirmed' || b.status === 'checked_in')).length || 0;

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

  // Total Locations
  const { count: totalLocations } = await supabase
    .from('partner_locations')
    .select('*', { count: 'exact', head: true });

  // Recent Bookings (last 10)
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select(`
      id, status, num_bags, total_amount, created_at, booking_type, vehicle_make, model, plate,
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

  // Fetch Payments for refund anomaly highlights
  const { data: paymentsData } = await applyDateFilter(
    supabase.from('payments').select('refund_amount, created_at')
  );

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

  return {
    totalCustomers: totalCustomers || 0,
    totalPartners: totalPartners || 0,
    pendingPartners: pendingPartners || 0,
    totalBookings: totalBookings || 0,
    activeBookings: activeBookings || 0,
    activeVehicles,
    totalRevenue,
    totalCommission,
    luggageRevenue,
    luggageCommission,
    vehicleRevenue,
    vehicleCommission,
    totalLocations: totalLocations || 0,
    recentBookings: recentBookings || [],
    pendingPartnersList: pendingPartnersList || [],
    dailyTrends,
    totalRefunded,
    anomalies
  };
}

