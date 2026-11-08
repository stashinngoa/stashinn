-- ============================================================================
-- StashInn Portal — Scheduled jobs, phases 2 and 3
-- Migration: 20261110000000_scheduled_jobs_phase2_3
--
-- 1. Partners can opt in to a 07:30 "today's plan" email (notification_preferences.daily_plan).
-- 2. Settlement maths:
--    - Checkout already writes one payout row per booking to partner_transactions. The old
--      generate_monthly_settlements() added a second, monthly row on top (double counting),
--      and counted pay-at-location bookings, where the partner holds the cash and owes
--      StashInn its share instead. It is dropped; partner_monthly_statements() reports a
--      month from the per-booking rows without writing anything.
--    - A cancelled booking's pending payout row is removed (bookingLifecycle.ts does this from
--      now on), except an online-paid no-show: the partner keeps their share (decision 2).
-- ============================================================================

-- ── 1. Daily plan opt-in ─────────────────────────────────────────────────────
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS daily_plan BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN public.notification_preferences.daily_plan IS 'Partner gets a 07:30 email listing today''s drop-offs and pick-ups';

-- ── 2a. Remove payouts for bookings that never happened ─────────────────────
DELETE FROM public.partner_transactions pt
USING public.bookings b
WHERE pt.booking_id = b.id
  AND b.status = 'cancelled'
  AND pt.transfer_status = 'pending'
  AND pt.transfer_proof IS NULL
  AND NOT (
    b.cancellation_code = 'no_show'
    AND EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.booking_id = b.id AND p.method = 'razorpay' AND p.status IN ('paid', 'partially_refunded')
    )
  );

-- Monthly total rows the old function may have written (they repeat the per-booking rows)
DELETE FROM public.partner_transactions
WHERE booking_id IS NULL
  AND transfer_status = 'pending'
  AND notes LIKE 'Automated monthly settlement for %';

DROP FUNCTION IF EXISTS public.generate_monthly_settlements(TEXT);

-- ── 2b. Monthly statement per partner (read-only) ───────────────────────────
-- A booking belongs to the month (India time) its storage ended. Counted:
--   online   completed bookings and online no-shows paid through Razorpay: the partner's share,
--            and how much of it StashInn has already paid out
--   cash     completed pay-at-location bookings: StashInn's share (commission + GST) the partner
--            collected, and how much of it they've settled
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
           p.method, p.status AS pay_status
    FROM public.bookings b
    LEFT JOIN LATERAL (
      SELECT method, status FROM public.payments
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
    WHERE mb.method = 'razorpay' AND mb.pay_status IN ('paid', 'partially_refunded')
    GROUP BY mb.partner_id
  ),
  cash AS (
    SELECT partner_id, COUNT(*)::INT AS n, SUM(platform_due) AS due,
           SUM(CASE WHEN pay_status = 'paid' THEN platform_due ELSE 0 END) AS settled
    FROM month_bookings
    WHERE method = 'pay_at_location' AND status = 'checked_out'
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

COMMENT ON FUNCTION public.partner_monthly_statements(TEXT) IS 'Per-partner month summary: online share and payouts, cash commission + GST due and settled, no-shows';

-- Rollback:
-- DROP FUNCTION IF EXISTS public.partner_monthly_statements(TEXT);
-- ALTER TABLE public.notification_preferences DROP COLUMN IF EXISTS daily_plan;
-- (Deleted payout rows of cancelled bookings are not restored; generate_monthly_settlements is in
--  20260712165003_batch_e_settlement.sql if ever needed.)
