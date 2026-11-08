import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getAdminContext } from '../../../lib/adminAccess';
import { accessFor } from '../../../lib/permissions';
import ReviewsWorkspace, { type AdminReview } from './ReviewsWorkspace';
import { flagsFor } from './reviewShared';

export const dynamic = 'force-dynamic';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function AdminReviewsPage() {
  const { role } = await getAdminContext();
  const access = role ? accessFor(role, '/dashboard/reviews') : null;
  if (!access) return null; // the middleware redirects before this

  // Service role after the access check: customer emails aren't readable to every admin role
  const db = createServiceClient();
  const { data: rows, error } = await db
    .from('reviews')
    .select('*, bookings(id, end_time, booking_type, num_bags), partners(id, business_name), partner_locations(id, name, city), users!reviews_customer_id_fkey(id, full_name, email)')
    .order('created_at', { ascending: false })
    .limit(2000);

  const reviews: AdminReview[] = (rows || []).map((r: any) => {
    const customer = one(r.users) as any;
    const partner = one(r.partners) as any;
    const loc = one(r.partner_locations) as any;
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment || '',
      tags: r.tags || [],
      createdAt: r.created_at,
      bookingId: r.booking_id,
      customer: { id: customer?.id || r.customer_id, name: customer?.full_name || 'Customer', email: customer?.email || '' },
      partner: { id: partner?.id || r.partner_id, name: partner?.business_name || 'Partner' },
      location: { id: loc?.id || r.location_id, name: loc?.name || 'Location', city: loc?.city || '' },
      flags: flagsFor(r),
    };
  });

  return <ReviewsWorkspace reviews={reviews} canEdit={access === 'full'} loadError={error ? 'Couldn’t load reviews. Refresh the page to try again.' : null} />;
}
