-- ============================================================================
-- StashInn Portal — Granular Admin Roles
-- This script adds the `admin_role` column and updates RLS policies.
-- ============================================================================

-- 1. Create the new ENUM and add column to users
CREATE TYPE admin_role AS ENUM ('superadmin', 'finance', 'support', 'ops');

ALTER TABLE public.users 
ADD COLUMN admin_role admin_role;

-- 2. Set all existing admins to superadmin by default
UPDATE public.users 
SET admin_role = 'superadmin' 
WHERE role = 'admin';

-- ============================================================================
-- 3. Replace RLS Policies to Enforce Granular Checks
-- Note: Replace these specific policies in your database to restrict access
-- based on the admin_role column. 
-- ============================================================================

-- A helper function to check granular roles
CREATE OR REPLACE FUNCTION public.has_admin_role(required_roles admin_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role = 'admin' 
      AND admin_role = ANY(required_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- FINANCE: Only finance and superadmin can view/edit financial transactions
DROP POLICY IF EXISTS transactions_admin_select ON public.partner_transactions;
CREATE POLICY transactions_admin_select ON public.partner_transactions
  FOR SELECT USING (public.has_admin_role(ARRAY['superadmin', 'finance']::admin_role[]));

DROP POLICY IF EXISTS transactions_admin_update ON public.partner_transactions;
CREATE POLICY transactions_admin_update ON public.partner_transactions
  FOR UPDATE USING (public.has_admin_role(ARRAY['superadmin', 'finance']::admin_role[]));

DROP POLICY IF EXISTS payments_admin_select ON public.payments;
CREATE POLICY payments_admin_select ON public.payments
  FOR SELECT USING (public.has_admin_role(ARRAY['superadmin', 'finance']::admin_role[]));

DROP POLICY IF EXISTS payments_admin_update ON public.payments;
CREATE POLICY payments_admin_update ON public.payments
  FOR UPDATE USING (public.has_admin_role(ARRAY['superadmin', 'finance']::admin_role[]));

-- SUPPORT: Support can view bookings and manage disputes
DROP POLICY IF EXISTS damage_admin_select ON public.damage_reports;
CREATE POLICY damage_admin_select ON public.damage_reports
  FOR SELECT USING (public.has_admin_role(ARRAY['superadmin', 'support', 'finance']::admin_role[]));

DROP POLICY IF EXISTS damage_admin_update ON public.damage_reports;
CREATE POLICY damage_admin_update ON public.damage_reports
  FOR UPDATE USING (public.has_admin_role(ARRAY['superadmin', 'support']::admin_role[]));

-- OPS: Operations manages partners and locations
DROP POLICY IF EXISTS partners_admin_update ON public.partners;
CREATE POLICY partners_admin_update ON public.partners
  FOR UPDATE USING (public.has_admin_role(ARRAY['superadmin', 'ops']::admin_role[]));

-- SUPERADMIN ONLY: System config, email templates, and staff management
DROP POLICY IF EXISTS config_admin_update ON public.system_config;
CREATE POLICY config_admin_update ON public.system_config
  FOR UPDATE USING (public.has_admin_role(ARRAY['superadmin']::admin_role[]));

DROP POLICY IF EXISTS templates_admin_update ON public.email_templates;
CREATE POLICY templates_admin_update ON public.email_templates
  FOR UPDATE USING (public.has_admin_role(ARRAY['superadmin']::admin_role[]));
