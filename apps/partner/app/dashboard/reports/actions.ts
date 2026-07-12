'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getPartnerReports(startDate?: string, endDate?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!partner) redirect('/onboarding');

  // Helper to apply date filters
  const applyDateFilter = (query: any, column = 'created_at') => {
    if (startDate) query = query.gte(column, startDate);
    if (endDate) query = query.lte(column, endDate);
    return query;
  };

  // Fetch all bookings for the partner within the date range
  const { data: bookingsData } = await applyDateFilter(
    supabase
      .from('bookings')
      .select('created_at, status, partner_amount, total_amount')
      .eq('partner_id', partner.id)
  );

  const totalBookings = bookingsData?.length || 0;
  const completedBookings = bookingsData?.filter((b: any) => b.status === 'checked_out') || [];
  
  const totalPartnerEarnings = completedBookings.reduce((sum: number, b: any) => sum + Number(b.partner_amount), 0);
  const totalGrossVolume = completedBookings.reduce((sum: number, b: any) => sum + Number(b.total_amount), 0);

  // Daily Trends for Charting
  const dailyTrendsMap: Record<string, { earnings: number, bookings: number }> = {};
  
  if (bookingsData) {
    bookingsData.forEach((b: any) => {
      const dateStr = b.created_at.split('T')[0];
      if (!dailyTrendsMap[dateStr]) {
        dailyTrendsMap[dateStr] = { earnings: 0, bookings: 0 };
      }
      dailyTrendsMap[dateStr].bookings += 1;
      if (b.status === 'checked_out') {
        dailyTrendsMap[dateStr].earnings += Number(b.partner_amount);
      }
    });
  }

  const dailyTrends = Object.keys(dailyTrendsMap).sort().map(date => ({
    date,
    ...dailyTrendsMap[date]
  }));

  return {
    totalBookings,
    totalPartnerEarnings,
    totalGrossVolume,
    dailyTrends
  };
}
