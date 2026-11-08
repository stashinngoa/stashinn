import { NextResponse } from 'next/server';
import { createClient } from '@stashinn/lib/supabase/server';
import { itemsLabel } from '../../dashboard/bookings/bookingShared';
import { loadEarnings, thisMonth } from '../../dashboard/earnings/earningsData';

const cell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const money = (n: number) => n.toFixed(2);
const istDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** One month's earnings statement, the same as the Earnings page. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) return new NextResponse('Forbidden', { status: 403 });

  const param = new URL(request.url).searchParams.get('month') || '';
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : thisMonth();
  let e;
  try {
    e = await loadEarnings(supabase, partner.id, month, itemsLabel);
  } catch {
    return new NextResponse('Couldn’t build the statement. Please try again.', { status: 500 });
  }

  const lines = [['Booking', 'Ended (IST)', 'Customer', 'Storing', 'Location', 'Customer paid', 'GST', 'StashInn commission', 'You earned', 'Paid', 'Status', 'You owe StashInn'].map(cell).join(',')];
  for (const l of e.lines) {
    lines.push([`#${l.bookingId.slice(0, 8).toUpperCase()}`, istDay(l.endedAt), l.customer, `${l.items}${l.noShow ? ' (no-show)' : ''}`, l.location,
      money(l.paid), money(l.gst), money(l.commission), money(l.earned), l.how, l.status.label, l.owe ? money(l.owe) : ''].map(cell).join(','));
  }
  lines.push(['Total', '', '', '', '', money(e.customersPaid), money(e.gst), money(e.commission), money(e.earned), '', '', e.owe ? money(e.owe) : ''].map(cell).join(','));

  return new NextResponse('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="stashinn-earnings-${month}.csv"`, 'Cache-Control': 'no-store' },
  });
}
