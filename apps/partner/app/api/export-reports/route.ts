import { NextResponse } from 'next/server';
import { createClient } from '@stashinn/lib/supabase/server';
import { loadReport, parseRange } from '../../dashboard/reports/reportData';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const money = (n: number) => n.toFixed(2);

/** The report's daily (or weekly) figures for the same period and location as the page. */
export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) return new NextResponse('Forbidden', { status: 403 });

  const range = parseRange(sp);
  const location = UUID.test(sp.location || '') ? sp.location! : '';
  let r;
  try {
    r = await loadReport(supabase, partner.id, range, location);
  } catch {
    return new NextResponse('Couldn’t build the report. Please try again.', { status: 500 });
  }

  const lines = [[r.weekly ? 'Week starting' : 'Date', 'Booking requests', 'Completed', 'Cancelled', 'Customer paid (completed)', 'You earned'].map(cell).join(',')];
  for (const b of r.buckets) lines.push([b.key, b.bookings, b.completed, b.cancelled, money(b.customerPaid), money(b.earned)].map(cell).join(','));
  const s = r.summary;
  lines.push([ 'Total', s.requests, s.completed, s.requests - s.completed - s.active - s.pending, money(s.customerPaid), money(s.earned)].map(cell).join(','));

  const name = `stashinn-report-${range.from}-to-${range.to}${location ? '-location' : ''}.csv`;
  return new NextResponse('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' },
  });
}
