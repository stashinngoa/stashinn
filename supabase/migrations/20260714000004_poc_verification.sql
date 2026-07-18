-- ============================================================================
-- PM-03: POC Management Verification and Support Tickets
-- ============================================================================

-- 1. Add is_verified to partner_pocs
ALTER TABLE public.partner_pocs 
  ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Backfill existing POCs to verified (assuming existing approved partners have valid POCs)
UPDATE public.partner_pocs
SET is_verified = TRUE
WHERE partner_id IN (SELECT id FROM public.partners WHERE status = 'approved');

-- 3. Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add trigger for updated_at
CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS for support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own support tickets" 
ON public.support_tickets FOR SELECT TO authenticated
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert their own support tickets" 
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all support tickets" 
ON public.support_tickets FOR ALL TO authenticated
USING (public.is_admin());
