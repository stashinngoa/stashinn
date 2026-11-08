-- ============================================================================
-- StashInn Portal — How a pay-at-drop-off booking was paid
-- Migration: 20261110000005_pay_at_dropoff_collection
--
-- At drop-off the customer pays either the partner (cash, or UPI to the partner's own account)
-- or StashInn directly (the StashInn QR at the counter). Until now nothing recorded which, so
-- every pay-at-drop-off booking raised dues against the partner, even when StashInn had the money.
--
-- payments.collected_via   set by the partner at check-in:
--   cash         cash to the partner                  -> partner owes StashInn commission + GST
--   partner_upi  UPI / card to the partner's account   -> partner owes StashInn commission + GST
--   stashinn_qr  paid to StashInn's QR                 -> StashInn owes the partner their share,
--                                                        once finance confirms the money arrived
-- payments.status keeps its meaning for pay_at_location: pending until settled, then paid.
-- For stashinn_qr, finance confirming receipt sets it to paid (qr_confirmed_at / _by / _reference).
-- Older bookings with no collected_via are treated as collected by the partner, as before.
-- ============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS collected_via     TEXT,
  ADD COLUMN IF NOT EXISTS collected_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS collected_amount  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS qr_reference      TEXT,
  ADD COLUMN IF NOT EXISTS qr_confirmed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qr_confirmed_by   UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_collected_via_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_collected_via_check
  CHECK (collected_via IS NULL OR collected_via IN ('cash', 'partner_upi', 'stashinn_qr'));

COMMENT ON COLUMN public.payments.collected_via IS 'Pay at drop-off: who received the money (cash / partner_upi = the partner, stashinn_qr = StashInn)';
COMMENT ON COLUMN public.payments.qr_confirmed_at IS 'When finance confirmed a StashInn-QR payment arrived';

-- Monthly statement: StashInn-QR bookings are StashInn's money (the partner's share is owed
-- to them, like an online booking), not cash dues. Same output as before.
CREATE OR REPLACE FUNCTION public.partner_monthly_statements(target_month TEXT)
RETURNS TABLE (
  partner_id        UUID,
  online_bookings   INTEGER,
  online_share      NUMERIC,
  online_paid_out   NUMERIC,
  cash_bookings     INTEGER,
  cash_due          NUMERIC,
  cash_settled      NUMERIC,
  cash_outstanding  NUMERIC,
  no_shows          INTEGER
) AS $$
  WITH month_bookings AS (
    SELECT b.id, b.partner_id, b.status, b.cancellation_code,
           COALESCE(b.commission_amount, 0) + COALESCE(b.gst_amount, 0) AS platform_due,
           p.method, p.status AS pay_status, p.collected_via
    FROM public.bookings b
    LEFT JOIN LATERAL (
      SELECT method, status, collected_via FROM public.payments
      WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1
    ) p ON TRUE
    WHERE to_char(b.end_time AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') = target_month
      AND (b.status = 'checked_out' OR (b.status = 'cancelled' AND b.cancellation_code = 'no_show'))
  ),
  online AS (
    SELECT mb.partner_id, COUNT(*)::INT AS n, SUM(pt.amount) AS share,
           SUM(CASE WHEN pt.transfer_status = 'completed' THEN pt.amount ELSE 0 END) AS paid_out
    FROM month_bookings mb
    JOIN public.partner_transactions pt
      ON pt.booking_id = mb.id AND pt.transfer_proof IS NULL AND pt.transfer_status <> 'failed'
    WHERE (mb.method = 'razorpay' AND mb.pay_status IN ('paid', 'partially_refunded'))
       OR (mb.method = 'pay_at_location' AND mb.collected_via = 'stashinn_qr' AND mb.pay_status = 'paid')
    GROUP BY mb.partner_id
  ),
  cash AS (
    SELECT partner_id, COUNT(*)::INT AS n, SUM(platform_due) AS due,
           SUM(CASE WHEN pay_status = 'paid' THEN platform_due ELSE 0 END) AS settled
    FROM month_bookings
    WHERE method = 'pay_at_location' AND status = 'checked_out' AND COALESCE(collected_via, 'cash') <> 'stashinn_qr'
    GROUP BY partner_id
  ),
  no_show AS (
    SELECT partner_id, COUNT(*)::INT AS n FROM month_bookings WHERE status = 'cancelled' GROUP BY partner_id
  )
  SELECT pa.id,
         COALESCE(o.n, 0), COALESCE(o.share, 0), COALESCE(o.paid_out, 0),
         COALESCE(c.n, 0), COALESCE(c.due, 0), COALESCE(c.settled, 0), COALESCE(c.due, 0) - COALESCE(c.settled, 0),
         COALESCE(ns.n, 0)
  FROM public.partners pa
  LEFT JOIN online o ON o.partner_id = pa.id
  LEFT JOIN cash c ON c.partner_id = pa.id
  LEFT JOIN no_show ns ON ns.partner_id = pa.id
  WHERE o.partner_id IS NOT NULL OR c.partner_id IS NOT NULL OR ns.partner_id IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.partner_monthly_statements(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_monthly_statements(TEXT) TO service_role;

-- Rollback: re-run partner_monthly_statements from 20261110000000_scheduled_jobs_phase2_3.sql, then
-- ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_collected_via_check,
--   DROP COLUMN IF EXISTS qr_confirmed_by, DROP COLUMN IF EXISTS qr_confirmed_at, DROP COLUMN IF EXISTS qr_reference,
--   DROP COLUMN IF EXISTS collected_amount, DROP COLUMN IF EXISTS collected_at, DROP COLUMN IF EXISTS collected_via;
