import { NextResponse } from 'next/server';
import { createClient } from '@stashinn/lib/supabase/server';
import { PAYMENT_METHOD, fmtDateTime, itemsLabel, ref, statusOf } from '../../dashboard/bookings/bookingShared';
import { LIST_FIELDS, applyFilters, applyTab, matchingCustomerIds, parseFilters, partnerShare } from '../../dashboard/bookings/bookingQuery';

const MAX_ROWS = 5000;
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/** Quote every cell, and stop spreadsheets from running text that starts like a formula. */
const cell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const money = (n: unknown) => (n == null || n === '' ? '' : Number(n).toFixed(2));

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const f = parseFilters({ ...sp, tab: sp.tab || 'all' });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) return new NextResponse('Forbidden', { status: 403 });

  const customerIds = await matchingCustomerIds(supabase, f.q);
  const { data: rows, error } = await applyTab(
    applyFilters(supabase.from('bookings').select(LIST_FIELDS).eq('partner_id', partner.id), f, customerIds),
    f.tab,
  ).range(0, MAX_ROWS - 1);
  if (error) return new NextResponse('Couldn’t export bookings. Please try again.', { status: 500 });

  const header = ['Booking', 'Status', 'Customer', 'Location', 'Storing', 'Drop-off (IST)', 'Pick-up (IST)', 'Dropped off (IST)', 'Picked up (IST)',
    'Customer paid', 'GST', 'Commission', 'You earn', 'Payment', 'Refunded', 'Cancellation reason', 'Booked (IST)'];
  const lines = [header.map(cell).join(',')];
  for (const b of (rows || []) as any[]) {
    const payment = one(b.payments) as any;
    const cancelled = b.status === 'cancelled';
    lines.push([
      `#${ref(b.id)}`,
      statusOf(b).label,
      (one(b.customer) as any)?.full_name || '',
      (one(b.partner_locations) as any)?.name || '',
      itemsLabel(b),
      fmtDateTime(b.start_time),
      fmtDateTime(b.end_time),
      b.actual_checkin ? fmtDateTime(b.actual_checkin) : '',
      b.actual_checkout ? fmtDateTime(b.actual_checkout) : '',
      money(b.total_amount),
      money(b.gst_amount),
      money(b.commission_amount),
      cancelled ? '0.00' : money(partnerShare(b)),
      PAYMENT_METHOD[payment?.method] || payment?.method || '',
      Number(payment?.refund_amount) > 0 ? money(payment.refund_amount) : '',
      cancelled ? b.cancellation_reason || '' : '',
      fmtDateTime(b.created_at),
    ].map(cell).join(','));
  }

  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  // BOM so Excel reads ₹ and names correctly
  return new NextResponse('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="stashinn-bookings-${f.tab}-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
