import { createClient } from '@stashinn/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const date = searchParams.get('date');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) return new NextResponse('Forbidden', { status: 403 });

  let query = supabase
    .from('bookings')
    .select('*, partner_locations(name), users(full_name, email)')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (date) {
    const filterDate = new Date(date);
    const nextDay = new Date(filterDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query = query
      .gte('start_time', filterDate.toISOString())
      .lt('start_time', nextDay.toISOString());
  }

  const { data: bookings } = await query;
  
  if (!bookings || bookings.length === 0) {
    return new NextResponse('No bookings found for the selected criteria.', { status: 404 });
  }

  const csvRows = [];
  // Headers
  csvRows.push(['Booking ID', 'Customer Name', 'Customer Email', 'Location', 'Check In', 'Check Out', 'Bags', 'Amount', 'Commission', 'Status'].join(','));
  
  // Rows
  for (const b of bookings) {
    csvRows.push([
      b.id,
      `"${b.users?.full_name || ''}"`,
      `"${b.users?.email || ''}"`,
      `"${b.partner_locations?.name || ''}"`,
      b.start_time,
      b.end_time,
      b.num_bags,
      b.total_amount,
      b.commission_amount,
      b.status
    ].join(','));
  }

  const csvString = csvRows.join('\n');

  return new NextResponse(csvString, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="bookings_export_${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}
