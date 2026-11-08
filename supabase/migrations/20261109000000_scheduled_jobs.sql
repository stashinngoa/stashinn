-- ============================================================================
-- StashInn Portal — Scheduled jobs (phase 0 + 1)
-- Migration: 20261109000000_scheduled_jobs
--
-- Tables the job runner (packages/lib/src/jobs) works from:
--   job_state   one row per job: on/off switch, last run, and the runner's lease
--   job_runs    one row per job per tick: what it did, for the admin Jobs page
--   job_events  the once-only ledger: one row per (job, item, step) + retry state
-- Plus two booking columns: confirmed_at (when the partner accepted) and
-- cancellation_code (why a booking was cancelled), and 'system' as a canceller.
--
-- Nothing here schedules anything. The Supabase Cron entry that calls the runner is
-- created by hand once a deployed admin app exists (see docs/SCHEDULED_JOBS.md).
-- ============================================================================

-- ── Job state and the runner lease ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_state (
  name          TEXT PRIMARY KEY,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at   TIMESTAMPTZ,
  last_ok_at    TIMESTAMPTZ,
  last_error    TEXT,
  locked_until  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.job_state IS 'Scheduled jobs: on/off switch and last run per job; the row named "tick" holds the runner lease';

-- ── Run history ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job          TEXT NOT NULL,
  trigger      TEXT NOT NULL DEFAULT 'cron' CHECK (trigger IN ('cron', 'manual', 'script')),
  dry_run      BOOLEAN NOT NULL DEFAULT FALSE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'partial', 'error')),
  counts       JSONB NOT NULL DEFAULT '{}'::jsonb,
  error        TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_runs_job_started ON public.job_runs (job, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_started ON public.job_runs (started_at DESC);
COMMENT ON TABLE public.job_runs IS 'One row per scheduled job run';

-- ── Once-only ledger + retry queue ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job              TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        TEXT NOT NULL,
  step             TEXT NOT NULL,
  dry_run          BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL CHECK (status IN ('running', 'done', 'skipped', 'failed', 'dry')),
  attempts         INTEGER NOT NULL DEFAULT 1,
  next_attempt_at  TIMESTAMPTZ,
  last_error       TEXT,
  detail           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A dry-run row never blocks the real step later
  CONSTRAINT job_events_once UNIQUE (job, entity_id, step, dry_run)
);
CREATE INDEX IF NOT EXISTS idx_job_events_retry ON public.job_events (job, next_attempt_at) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_job_events_entity ON public.job_events (entity_id);
CREATE INDEX IF NOT EXISTS idx_job_events_created ON public.job_events (created_at DESC);
COMMENT ON TABLE public.job_events IS 'Scheduled jobs ledger: each (job, item, step) happens at most once; failed rows are retried';

-- ── Access: admins read, only the service role writes ───────────────────────
ALTER TABLE public.job_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_state_admin_select ON public.job_state;
CREATE POLICY job_state_admin_select ON public.job_state FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS job_runs_admin_select ON public.job_runs;
CREATE POLICY job_runs_admin_select ON public.job_runs FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS job_events_admin_select ON public.job_events;
CREATE POLICY job_events_admin_select ON public.job_events FOR SELECT USING (public.is_admin());

-- ── The runner lease: true when this caller now holds it ─────────────────────
CREATE OR REPLACE FUNCTION public.claim_job_lease(lease_name TEXT, seconds INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  got BOOLEAN;
BEGIN
  INSERT INTO public.job_state (name, locked_until)
  VALUES (lease_name, now() + make_interval(secs => seconds))
  ON CONFLICT (name) DO UPDATE
    SET locked_until = EXCLUDED.locked_until, updated_at = now()
    WHERE public.job_state.locked_until IS NULL OR public.job_state.locked_until < now()
  RETURNING TRUE INTO got;
  RETURN COALESCE(got, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.release_job_lease(lease_name TEXT)
RETURNS VOID AS $$
  UPDATE public.job_state SET locked_until = NULL, updated_at = now() WHERE name = lease_name;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Only the service role (the runner) may take or release the lease
REVOKE ALL ON FUNCTION public.claim_job_lease(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_job_lease(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_job_lease(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_job_lease(TEXT) TO service_role;

-- ── Bookings: when the partner accepted, and why a booking was cancelled ────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_code  TEXT;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_cancellation_code_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_cancellation_code_check
  CHECK (cancellation_code IS NULL OR cancellation_code IN ('customer', 'partner', 'admin', 'partner_no_response', 'no_show'));

COMMENT ON COLUMN public.bookings.confirmed_at IS 'When the partner accepted the booking';
COMMENT ON COLUMN public.bookings.cancellation_code IS 'Why it was cancelled: customer, partner, admin, partner_no_response (auto), no_show (auto)';
COMMENT ON COLUMN public.bookings.cancelled_by IS 'customer, partner, admin or system';

-- Existing cancellations get a code from who cancelled them
UPDATE public.bookings SET cancellation_code = cancelled_by
WHERE status = 'cancelled' AND cancellation_code IS NULL AND cancelled_by IN ('customer', 'partner', 'admin');

-- Helps the jobs find bookings by status and time
CREATE INDEX IF NOT EXISTS idx_bookings_status_start ON public.bookings (status, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status_end ON public.bookings (status, end_time);

-- ── Controls: start paused-safe in dry-run mode ──────────────────────────────
INSERT INTO public.system_config (key, value, description) VALUES
  ('jobs_control', '{"paused": false, "dry_run": true}'::jsonb,
   'Scheduled jobs: pause everything, or dry-run (record what would happen without doing it)'),
  ('jobs_settings', '{}'::jsonb,
   'Scheduled jobs: threshold overrides (minutes/hours); missing keys use the built-in defaults')
ON CONFLICT (key) DO NOTHING;

-- Rollback:
-- DROP TABLE IF EXISTS public.job_events, public.job_runs, public.job_state;
-- DROP FUNCTION IF EXISTS public.claim_job_lease(TEXT, INTEGER), public.release_job_lease(TEXT);
-- ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_cancellation_code_check,
--   DROP COLUMN IF EXISTS confirmed_at, DROP COLUMN IF EXISTS cancellation_code;
-- DELETE FROM public.system_config WHERE key IN ('jobs_control', 'jobs_settings');
