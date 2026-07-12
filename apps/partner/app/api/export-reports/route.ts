import { NextRequest, NextResponse } from 'next/server';
import { getPartnerReports } from '../../dashboard/reports/actions';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const reports = await getPartnerReports(startDate, endDate);
    
    // Create CSV header
    let csvData = 'Date,Booking_Volume,Earnings\n';
    
    // Append rows
    reports.dailyTrends.forEach(trend => {
      csvData += `"${trend.date}",${trend.bookings},${trend.earnings}\n`;
    });

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="stashinn-partner-earnings-${startDate || 'all'}-to-${endDate || 'now'}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
