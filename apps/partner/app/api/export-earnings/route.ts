import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@stashinn/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: 'Not a partner' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let query = supabase
      .from('partner_transactions')
      .select(`
        *,
        bookings (
          start_time,
          payments (
            method
          )
        )
      `)
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: transactions, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    let csvData = 'Date,Booking_ID,Payment_Method,Gross_Amount,Commission,Net_Earnings,Status\n';

    (transactions || []).forEach(tx => {
      const payment = tx.bookings?.payments?.[0];
      const method = payment?.method === 'razorpay' ? 'Online' : 'Cash';
      const gross = Number(tx.amount) + Number(tx.commission);
      const status = tx.transfer_status === 'completed' ? 'Settled' : (payment?.method === 'razorpay' ? 'Pending Payout' : 'Owe Commission');
      const date = new Date(tx.created_at).toISOString().split('T')[0];
      
      csvData += `"${date}","${tx.booking_id}","${method}",${gross},-${tx.commission},${tx.amount},"${status}"\n`;
    });

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="stashinn-partner-earnings-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
