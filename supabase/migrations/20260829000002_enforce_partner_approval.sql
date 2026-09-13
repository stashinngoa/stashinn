-- ============================================================================
-- Enforce POC Verification for Partner Approval
-- ============================================================================

-- 1. Helper function to check if a partner has AT LEAST ONE fully verified location
CREATE OR REPLACE FUNCTION public.has_verified_location(p_partner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.partner_locations pl
    WHERE pl.partner_id = p_partner_id
    AND pl.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.partner_pocs poc WHERE poc.location_id = pl.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.partner_pocs poc WHERE poc.location_id = pl.id AND poc.is_verified = false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Trigger: Prevent partner approval if they don't have a verified location
CREATE OR REPLACE FUNCTION public.trg_check_partner_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NOT public.has_verified_location(NEW.id) THEN
      RAISE EXCEPTION 'Partner must have at least one active location with fully verified POCs before approval.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partners_approval
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.trg_check_partner_approval();


-- 3. Trigger: Downgrade partner if they lose their last verified location
CREATE OR REPLACE FUNCTION public.trg_downgrade_partner_if_invalid()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_partner_id := OLD.partner_id;
  ELSE
    v_partner_id := NEW.partner_id;
  END IF;

  -- If partner is currently approved but no longer has a verified location, downgrade them to pending
  IF EXISTS (SELECT 1 FROM public.partners WHERE id = v_partner_id AND status = 'approved') THEN
    IF NOT public.has_verified_location(v_partner_id) THEN
      UPDATE public.partners SET status = 'pending' WHERE id = v_partner_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach to partner_pocs (fires when POC is modified, added, or removed)
CREATE TRIGGER trg_partner_pocs_downgrade
AFTER INSERT OR UPDATE OR DELETE ON public.partner_pocs
FOR EACH ROW EXECUTE FUNCTION public.trg_downgrade_partner_if_invalid();

-- Attach to partner_locations (fires when location is modified or removed)
CREATE TRIGGER trg_partner_locations_downgrade
AFTER UPDATE OR DELETE ON public.partner_locations
FOR EACH ROW EXECUTE FUNCTION public.trg_downgrade_partner_if_invalid();
