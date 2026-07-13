-- ============================================================================
-- Add Admin Update and Delete Policies for partner_pocs
-- ============================================================================

CREATE POLICY pocs_admin_update ON public.partner_pocs
  FOR UPDATE USING (public.is_admin());

CREATE POLICY pocs_admin_delete ON public.partner_pocs
  FOR DELETE USING (public.is_admin());
