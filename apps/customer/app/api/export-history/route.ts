import { NextResponse } from 'next/server';
import { createClient } from '@stashinn/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, num_bags, total_amount, status, partner_locations(name)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    // Create CSV header
    let csvData = 'Booking_ID,Location,Start_Time,End_Time,Bags,Amount,Status\n';
    
    // Append rows
    if (bookings) {
      bookings.forEach(booking => {
        const loc = (booking.partner_locations as any)?.name?.replace(/,/g, '') || 'Unknown';
        const start = new Date(booking.start_time).toISOString();
        const end = new Date(booking.end_time).toISOString();
        csvData += `"${booking.id}","${loc}","${start}","${end}",${booking.num_bags},${booking.total_amount},"${booking.status}"\n`;
      });
    }

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="stashinn-my-bookings.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
