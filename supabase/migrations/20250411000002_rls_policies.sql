-- ============================================================================
-- StashInn Portal — Row Level Security Policies
-- Migration: 20250411000002_rls_policies
--
-- Enforces data isolation: customers see only their data, partners see only
-- their own locations/bookings, admins have full access.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_pocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper function: get current user's role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Helper function: check if current user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Helper function: get current user's partner_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_partner_id()
RETURNS UUID AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can read all users
CREATE POLICY users_admin_select ON public.users
  FOR SELECT USING (public.is_admin());

-- Admins can update any user (e.g. block/unblock)
CREATE POLICY users_admin_update ON public.users
  FOR UPDATE USING (public.is_admin());

-- Service role inserts (signup trigger) — handled by SECURITY DEFINER functions

-- ============================================================================
-- PARTNERS TABLE POLICIES
-- ============================================================================

-- Partners can read their own record
CREATE POLICY partners_select_own ON public.partners
  FOR SELECT USING (user_id = auth.uid());

-- Partners can update their own record
CREATE POLICY partners_update_own ON public.partners
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Partners can insert their own record (onboarding)
CREATE POLICY partners_insert_own ON public.partners
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can read all partners
CREATE POLICY partners_admin_select ON public.partners
  FOR SELECT USING (public.is_admin());

-- Admins can update any partner (approve/reject/suspend)
CREATE POLICY partners_admin_update ON public.partners
  FOR UPDATE USING (public.is_admin());

-- Customers can view approved partners (for search results)
CREATE POLICY partners_customer_select_approved ON public.partners
  FOR SELECT USING (status = 'approved');

-- ============================================================================
-- PARTNER LOCATIONS POLICIES
-- ============================================================================

-- Partners can CRUD their own locations
CREATE POLICY locations_partner_select ON public.partner_locations
  FOR SELECT USING (partner_id = public.get_partner_id());

CREATE POLICY locations_partner_insert ON public.partner_locations
  FOR INSERT WITH CHECK (partner_id = public.get_partner_id());

CREATE POLICY locations_partner_update ON public.partner_locations
  FOR UPDATE USING (partner_id = public.get_partner_id())
  WITH CHECK (partner_id = public.get_partner_id());

CREATE POLICY locations_partner_delete ON public.partner_locations
  FOR DELETE USING (partner_id = public.get_partner_id());

-- Everyone can view active locations (public search)
CREATE POLICY locations_public_select ON public.partner_locations
  FOR SELECT USING (is_active = TRUE);

-- Admins can read/update all locations
CREATE POLICY locations_admin_select ON public.partner_locations
  FOR SELECT USING (public.is_admin());

CREATE POLICY locations_admin_update ON public.partner_locations
  FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- PARTNER POC POLICIES
-- ============================================================================

CREATE POLICY pocs_partner_select ON public.partner_pocs
  FOR SELECT USING (partner_id = public.get_partner_id());

CREATE POLICY pocs_partner_insert ON public.partner_pocs
  FOR INSERT WITH CHECK (partner_id = public.get_partner_id());

CREATE POLICY pocs_partner_update ON public.partner_pocs
  FOR UPDATE USING (partner_id = public.get_partner_id());

CREATE POLICY pocs_partner_delete ON public.partner_pocs
  FOR DELETE USING (partner_id = public.get_partner_id());

CREATE POLICY pocs_admin_select ON public.partner_pocs
  FOR SELECT USING (public.is_admin());

-- ============================================================================
-- BOOKINGS POLICIES
-- ============================================================================

-- Customers can read their own bookings
CREATE POLICY bookings_customer_select ON public.bookings
  FOR SELECT USING (customer_id = auth.uid());

-- Customers can create bookings
CREATE POLICY bookings_customer_insert ON public.bookings
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Customers can update their own bookings (e.g. cancel)
CREATE POLICY bookings_customer_update ON public.bookings
  FOR UPDATE USING (customer_id = auth.uid());

-- Partners can read bookings for their locations
CREATE POLICY bookings_partner_select ON public.bookings
  FOR SELECT USING (partner_id = public.get_partner_id());

-- Partners can update bookings (confirm, check-in/out via OTP)
CREATE POLICY bookings_partner_update ON public.bookings
  FOR UPDATE USING (partner_id = public.get_partner_id());

-- Admins can read/update all bookings
CREATE POLICY bookings_admin_select ON public.bookings
  FOR SELECT USING (public.is_admin());

CREATE POLICY bookings_admin_update ON public.bookings
  FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- PAYMENTS POLICIES
-- ============================================================================

-- Customers can read their own payments
CREATE POLICY payments_customer_select ON public.payments
  FOR SELECT USING (
    booking_id IN (SELECT id FROM public.bookings WHERE customer_id = auth.uid())
  );

-- Partners can read payments for their bookings
CREATE POLICY payments_partner_select ON public.payments
  FOR SELECT USING (
    booking_id IN (SELECT id FROM public.bookings WHERE partner_id = public.get_partner_id())
  );

-- Admins can read/update all payments
CREATE POLICY payments_admin_select ON public.payments
  FOR SELECT USING (public.is_admin());

CREATE POLICY payments_admin_update ON public.payments
  FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- PARTNER TRANSACTIONS POLICIES
-- ============================================================================

-- Partners can read their own transactions
CREATE POLICY transactions_partner_select ON public.partner_transactions
  FOR SELECT USING (partner_id = public.get_partner_id());

-- Admins can CRUD all transactions
CREATE POLICY transactions_admin_select ON public.partner_transactions
  FOR SELECT USING (public.is_admin());

CREATE POLICY transactions_admin_insert ON public.partner_transactions
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY transactions_admin_update ON public.partner_transactions
  FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- REVIEWS POLICIES
-- ============================================================================

-- Customers can insert reviews for their completed bookings
CREATE POLICY reviews_customer_insert ON public.reviews
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Anyone authenticated can read reviews (public display)
CREATE POLICY reviews_public_select ON public.reviews
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can only read their own notifications
CREATE POLICY notif_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY notif_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- NOTIFICATION PREFERENCES POLICIES
-- ============================================================================

CREATE POLICY notif_prefs_select_own ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notif_prefs_update_own ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY notif_prefs_insert_own ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- DAMAGE REPORTS POLICIES
-- ============================================================================

-- Partners can submit and view their damage reports
CREATE POLICY damage_partner_select ON public.damage_reports
  FOR SELECT USING (partner_id = public.get_partner_id());

CREATE POLICY damage_partner_insert ON public.damage_reports
  FOR INSERT WITH CHECK (partner_id = public.get_partner_id());

-- Customers can view damage reports involving them
CREATE POLICY damage_customer_select ON public.damage_reports
  FOR SELECT USING (customer_id = auth.uid());

-- Admins can read/update all damage reports
CREATE POLICY damage_admin_select ON public.damage_reports
  FOR SELECT USING (public.is_admin());

CREATE POLICY damage_admin_update ON public.damage_reports
  FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- AUDIT LOGS POLICIES (read-only for admins)
-- ============================================================================

CREATE POLICY audit_admin_select ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- Insert is done via service role / SECURITY DEFINER functions only

-- ============================================================================
-- SYSTEM CONFIG POLICIES
-- ============================================================================

-- Anyone authenticated can read config (needed for app behavior)
CREATE POLICY config_public_select ON public.system_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can modify config
CREATE POLICY config_admin_update ON public.system_config
  FOR UPDATE USING (public.is_admin());

CREATE POLICY config_admin_insert ON public.system_config
  FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================================
-- EMAIL TEMPLATES POLICIES
-- ============================================================================

-- Only admins can manage email templates
CREATE POLICY templates_admin_select ON public.email_templates
  FOR SELECT USING (public.is_admin());

CREATE POLICY templates_admin_insert ON public.email_templates
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY templates_admin_update ON public.email_templates
  FOR UPDATE USING (public.is_admin());
