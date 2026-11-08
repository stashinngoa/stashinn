import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getAdminContext } from '../../../lib/adminAccess';
import { accessFor } from '../../../lib/permissions';
import { parseReport } from './disputeShared';
import DisputesWorkspace, { type DisputeCase } from './DisputesWorkspace';

export const dynamic = 'force-dynamic';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function DisputesPage(props: { searchParams: Promise<{ id?: string; status?: string }> }) {
  const params = await props.searchParams;
  const { role } = await getAdminContext();
  const access = role ? accessFor(role, '/dashboard/disputes') : null;
  if (!access) return null; // the middleware redirects before this

  // Read with the service role after the access check above: the RLS role check can't see
  // every admin's role, and the customer / partner contact details live in tables admins
  // only partly see.
  const db = createServiceClient();
  const { data: rows, error } = await db
    .from('damage_reports')
    .select(`
      *,
      bookings (
        id, status, booking_type, num_bags, vehicle_make, vehicle_model, vehicle_license_plate, check_in_photos,
        start_time, end_time, actual_checkin, actual_checkout, total_amount, cancellation_reason, cancelled_by, created_at,
        partner_locations ( name, address_line1, city )
      ),
      partners ( id, business_name, users!partners_user_id_fkey ( full_name, email, phone ) ),
      users!damage_reports_customer_id_fkey ( id, full_name, email, phone )
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  const list = rows || [];
  const bookingIds = [...new Set(list.map(r => r.booking_id))];
  const reportIds = list.map(r => r.id);

  const [{ data: payments }, { data: logs }] = await Promise.all([
    bookingIds.length
      ? db.from('payments').select('booking_id, amount, status, method, refund_amount, created_at').in('booking_id', bookingIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    reportIds.length
      ? db.from('audit_logs').select('entity_id, action, new_values, created_at, users(full_name, email)').eq('entity_type', 'damage_reports').in('entity_id', reportIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const cases: DisputeCase[] = list.map((r: any) => {
    const b = one(r.bookings) as any;
    const loc = one(b?.partner_locations) as any;
    const partner = one(r.partners) as any;
    const partnerUser = one(partner?.users) as any;
    const customer = one(r.users) as any;
    const report = parseReport(r.description, r.photos);
    const pay = (payments || []).find((p: any) => p.booking_id === r.booking_id && p.status !== 'failed') || null;
    return {
      id: r.id,
      bookingId: r.booking_id,
      status: r.status,
      source: report.source,
      category: report.category,
      details: report.details,
      photos: r.photos || [],
      adminNotes: r.admin_notes || '',
      refundAmount: Number(r.refund_amount) || 0,
      award: Number(r.partner_award) || 0,
      awardPaidAt: r.partner_award_paid_at ?? null,
      awardReference: r.partner_award_reference ?? '',
      resolvedAt: r.resolved_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      customer: { name: customer?.full_name || 'Customer', email: customer?.email || '', phone: customer?.phone || '' },
      partner: { id: partner?.id || '', name: partner?.business_name || 'Partner', contact: partnerUser?.full_name || '', email: partnerUser?.email || '', phone: partnerUser?.phone || '' },
      booking: b ? {
        status: b.status,
        type: b.booking_type,
        bags: b.num_bags,
        vehicle: b.booking_type === 'garage' ? [b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') : '',
        make: b.vehicle_make || '',
        model: b.vehicle_model || '',
        plate: b.vehicle_license_plate || '',
        checkInPhotos: b.check_in_photos || [],
        start: b.start_time,
        end: b.end_time,
        checkedIn: b.actual_checkin,
        checkedOut: b.actual_checkout,
        total: Number(b.total_amount) || 0,
        cancellation: b.cancellation_reason ? `${b.cancellation_reason}${b.cancelled_by ? ` (by ${b.cancelled_by})` : ''}` : '',
        location: loc ? { name: loc.name, address: [loc.address_line1, loc.city].filter(Boolean).join(', ') } : null,
      } : null,
      payment: pay ? { amount: Number(pay.amount) || 0, status: pay.status, method: pay.method, refunded: Number(pay.refund_amount) || 0 } : null,
      history: (logs || []).filter((l: any) => l.entity_id === r.id).map((l: any) => {
        const who = one(l.users) as any;
        return { at: l.created_at, by: who?.full_name || who?.email || 'Admin', action: l.action, status: l.new_values?.status || '', note: l.new_values?.admin_notes || l.new_values?.reference || '', refund: Number(l.new_values?.refund_amount) || Number(l.new_values?.partner_award) || 0 };
      }),
    };
  });

  return (
    <DisputesWorkspace
      cases={cases}
      canEdit={access === 'full'}
      canPay={accessFor(role!, '/dashboard/settlements') === 'full'}
      initialId={params.id || null}
      initialStatus={params.status || null}
      loadError={error ? 'Couldn’t load disputes. Refresh the page to try again.' : null}
    />
  );
}
