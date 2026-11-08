import { NextRequest, NextResponse } from 'next/server';
import { getCustomers } from '../../dashboard/customers/actions';

// Quote every cell; a leading = + - @ is neutralised so spreadsheets don't run it as a formula
const cell = (v: unknown) => {
  const s = String(v ?? '');
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const { customers, error } = await getCustomers({ q: p.get('q') || '', status: p.get('status') || '', sort: p.get('sort') || '' }, { all: true });
    if (error) throw new Error(error);

    const header = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Joined', 'Bookings', 'Completed', 'Upcoming', 'Completed spend (INR)', 'Last booking', 'Open disputes'];
    const rows = customers.map(c => [
      c.id, c.full_name || '', c.email || '', c.phone || '', c.is_blocked ? 'Blocked' : 'Active',
      new Date(c.created_at).toISOString().split('T')[0], c.bookings, c.completed, c.upcoming, c.spend.toFixed(2),
      c.lastBooking ? new Date(c.lastBooking).toISOString().split('T')[0] : '', c.openDisputes,
    ]);
    const csv = [header, ...rows].map(r => r.map(cell).join(',')).join('\n') + '\n';

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="stashinn-customers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
