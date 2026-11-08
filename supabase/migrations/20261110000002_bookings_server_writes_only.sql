-- ============================================================================
-- StashInn Portal — Customers and partners can't update bookings directly
-- Migration: 20261110000002_bookings_server_writes_only
--
-- The old policies let a customer or partner UPDATE any column of their own bookings
-- through the API: a partner could mark a booking picked up without the customer's code
-- or change the amounts, and a customer could change their own status or price.
-- Every booking change now goes through a server action that checks ownership and
-- the allowed status change, then writes with the service role (which bypasses RLS).
-- Admin update and all SELECT policies are unchanged.
-- ============================================================================

DROP POLICY IF EXISTS bookings_customer_update ON public.bookings;
DROP POLICY IF EXISTS bookings_partner_update ON public.bookings;

-- Rollback:
-- CREATE POLICY bookings_customer_update ON public.bookings FOR UPDATE USING (customer_id = auth.uid());
-- CREATE POLICY bookings_partner_update ON public.bookings FOR UPDATE USING (partner_id = public.get_partner_id());
