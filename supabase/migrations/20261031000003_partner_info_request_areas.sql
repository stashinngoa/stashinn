-- ============================================================================
-- StashInn Portal — Info request areas + email template
-- Migration: 20261031000003_partner_info_request_areas
--
-- Lets an admin tick which parts of a partner need attention (business details,
-- documents, contact person, locations, missing information). The keys are defined in
-- packages/lib/src/constants/partnerInfoRequest.ts. Also adds the partner_info_requested
-- email template (editable in Admin → Configuration).
-- ============================================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS info_request_items TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.partners.info_request_items IS 'Areas flagged in the open info request, e.g. {documents,contact}';

-- Same guard as 20261031000002, now also protecting info_request_items
CREATE OR REPLACE FUNCTION public.guard_partner_admin_fields()
RETURNS trigger AS $$
BEGIN
  -- Service role / SQL editor, and partner-managing admins, may change anything
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon')
     OR public.has_admin_role(ARRAY['superadmin', 'ops']::admin_role[]) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status = 'approved' AND NEW.status = 'pending') THEN
    RAISE EXCEPTION 'Only StashInn admins can change a partner''s status' USING ERRCODE = '42501';
  END IF;

  IF NEW.kyc_verified AND NOT OLD.kyc_verified THEN
    RAISE EXCEPTION 'Only StashInn admins can mark KYC as verified' USING ERRCODE = '42501';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
     OR NEW.avg_rating IS DISTINCT FROM OLD.avg_rating
     OR NEW.total_reviews IS DISTINCT FROM OLD.total_reviews
     OR NEW.signed_registration_doc_url IS DISTINCT FROM OLD.signed_registration_doc_url
     OR NEW.info_request IS DISTINCT FROM OLD.info_request
     OR NEW.info_request_items IS DISTINCT FROM OLD.info_request_items
     OR NEW.info_requested_at IS DISTINCT FROM OLD.info_requested_at THEN
    RAISE EXCEPTION 'This partner field can only be changed by StashInn admins' USING ERRCODE = '42501';
  END IF;

  -- Partners may only mark an open request as done (a request is open while info_requested_at is set;
  -- the note itself is optional now that areas can be ticked)
  IF NEW.info_responded_at IS DISTINCT FROM OLD.info_responded_at AND OLD.info_requested_at IS NULL THEN
    RAISE EXCEPTION 'There is no open info request to respond to' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

INSERT INTO public.email_templates (slug, subject, body_html, variables) VALUES
  ('partner_info_requested', 'Action needed on your StashInn partner account',
   '<h2>Hi {{partner_name}},</h2><p>We''re reviewing <strong>{{business_name}}</strong> and need a few things from you before we can continue.</p><p><strong>Please check:</strong></p>{{items_html}}{{note_html}}<p>Sign in to the <a href="{{partner_url}}">Partner Dashboard</a> to make the changes, then click <strong>"I''ve made the changes"</strong> on the banner at the top. If we asked for a document, just reply to this email with a clear copy.</p><p>Thanks,<br/>The StashInn Team</p>',
   ARRAY['partner_name', 'business_name', 'items_html', 'note_html', 'partner_url'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- DELETE FROM public.email_templates WHERE slug = 'partner_info_requested';
-- ALTER TABLE public.partners DROP COLUMN IF EXISTS info_request_items;
-- Re-run guard_partner_admin_fields() from 20261031000002_partner_info_request.sql
-- ============================================================================
