import { NextRequest, NextResponse } from 'next/server';
import { getAdminAnalytics } from '../../dashboard/actions';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const analytics = await getAdminAnalytics(startDate, endDate);
    
    // Create CSV header
    let csvData = 'Date,Booking_Volume,Gross_Revenue\n';
    
    // Append rows
    analytics.dailyTrends.forEach(trend => {
      csvData += `"${trend.date}",${trend.bookings},${trend.revenue}\n`;
    });

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="stashinn-admin-trends-${startDate || 'all'}-to-${endDate || 'now'}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
