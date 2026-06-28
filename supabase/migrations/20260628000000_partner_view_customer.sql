-- ============================================================================
-- Add RLS policy for Partners to view their customers' details
-- ============================================================================

CREATE POLICY users_partner_select_customer ON public.users
  FOR SELECT USING (
    id IN (
      SELECT customer_id FROM public.bookings WHERE partner_id = public.get_partner_id()
    )
  );
