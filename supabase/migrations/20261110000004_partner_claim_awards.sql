-- ============================================================================
-- StashInn Portal — Paying partners for approved claims
-- Migration: 20261110000004_partner_claim_awards
--
-- Partners file claims (damage to their property, unpaid charges, ...) into damage_reports,
-- the same table as customer complaints. Admin Disputes could only close a case by refunding
-- the customer, which makes no sense for a partner's claim.
--
--   * New status 'resolved_compensated': closed with an award to the partner.
--   * partner_award: the amount StashInn owes the partner for the claim.
--   * partner_award_paid_at / _reference / _paid_by: finance records the bank transfer.
--
-- The award is kept on the claim, not in partner_transactions: that ledger is matched by
-- booking (cash-dues approvals mark every unproven row of a booking as completed), so an
-- award row there could be marked paid by mistake.
-- Partners already read their own damage_reports (damage_partner_select); only admins update.
-- ============================================================================

ALTER TYPE public.damage_status ADD VALUE IF NOT EXISTS 'resolved_compensated';

ALTER TABLE public.damage_reports
  ADD COLUMN IF NOT EXISTS partner_award           NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_award_paid_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partner_award_reference TEXT,
  ADD COLUMN IF NOT EXISTS partner_award_paid_by   UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.damage_reports DROP CONSTRAINT IF EXISTS damage_reports_partner_award_check;
ALTER TABLE public.damage_reports ADD CONSTRAINT damage_reports_partner_award_check
  CHECK (partner_award >= 0 AND (partner_award_paid_at IS NULL OR partner_award > 0));

COMMENT ON COLUMN public.damage_reports.partner_award IS 'Amount StashInn owes the partner for an approved claim (status resolved_compensated)';
COMMENT ON COLUMN public.damage_reports.partner_award_paid_at IS 'When finance paid the award; NULL while it is owed';
COMMENT ON COLUMN public.damage_reports.partner_award_reference IS 'Bank / UPI reference of the award payment';

-- Rollback (enum values can't be removed; no row should use it before rolling back):
-- ALTER TABLE public.damage_reports DROP CONSTRAINT IF EXISTS damage_reports_partner_award_check,
--   DROP COLUMN IF EXISTS partner_award_paid_by, DROP COLUMN IF EXISTS partner_award_reference,
--   DROP COLUMN IF EXISTS partner_award_paid_at, DROP COLUMN IF EXISTS partner_award;
