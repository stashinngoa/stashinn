# Scheduled jobs

Every 5 minutes a **tick** calls the job runner in the admin app. The runner works through
the jobs in `packages/lib/src/jobs/registry.ts`; each job asks the database what is due now
(for example "pending bookings 60 minutes before drop-off") and acts on it. A ledger
(`job_events`) makes sure each step happens at most once, and retries failed steps
(after 5, 15 and 45 minutes).

Design and decisions: the "StashInn scheduled jobs: design" doc.

| Piece | Where |
| --- | --- |
| Jobs, runner, ledger, settings | `packages/lib/src/jobs/` |
| Cancel + refund (shared by apps and jobs) | `packages/lib/src/services/bookingLifecycle.ts` |
| Endpoint the clock calls | `apps/admin/app/api/jobs/tick/route.ts` (`POST`, `Authorization: Bearer <JOBS_SECRET>`) |
| Admin page | Sidebar → Scheduled Jobs (`/dashboard/jobs`, superadmin) |
| Tables | `job_state`, `job_runs`, `job_events` (migration `20261109000000_scheduled_jobs.sql`) |
| Email wording | built-in in `services/bookingEmails.ts`; an `email_templates` row with the same slug overrides it |

## Jobs

| Job | Runs | Does |
| --- | --- | --- |
| `booking.partner_response` | every tick | Pending booking: reminds the partner (15 min, 60 min after booking), alerts ops + tells the customer 60 min before drop-off, cancels with a full refund 15 min before. Pauses itself if one run would cancel more than 10. |
| `payments.refund_retry` | every tick | Retries refunds Razorpay refused at cancellation, then alerts finance. |
| `booking.dropoff_reminder` | every tick | Address, contact and check-in code 3 h before drop-off (and 24 h before, if booked 36 h+ ahead). |
| `booking.no_show` | every tick | Not checked in 2 h after drop-off: nudges customer and partner. Still not at pick-up time: closes as a no-show, no refund. |
| `booking.pickup_reminder` | every tick | Pick-up time and code 60 min before the booking ends. |
| `booking.overdue_pickup` | every tick | Not collected 30 min after the end: tells customer and partner; ops alert at 24 h and at 7 days. |
| `payments.orphan_payments` | hourly | Razorpay payments captured in the last 2 days with no booking (checkout failed after paying): refunds them after 30 min and alerts finance. Skipped when Razorpay keys aren't set. |
| `settlements.cash_dues` | daily 10:00 | Weekly reminder to partners who haven't settled StashInn's share (commission + GST) of pay-at-location bookings 7+ days after pick-up. 21+ days shows in the ops digest. |
| `settlements.monthly_statements` | 1st, 06:00 | Emails each partner last month's statement (from `partner_monthly_statements()`) and finance a summary. Writes nothing to the payout ledger. |
| `disputes.response_time` | every 30 min | New dispute untouched for 4 working hours (09:00–21:00): alert support; 24 h: superadmin. Under review with no update for 72 h: reminder. |
| `support.ticket_response` | hourly | Partner ticket open 24 h: alert support. |
| `booking.review_request` | every 30 min | Review request 2 h after pick-up, one reminder at 3 days; stops once reviewed. |
| `partners.info_request` | daily 10:00 | Unanswered admin info request: partner reminder at 3 days, ops alert at 7. |
| `partners.pause_ending` | hourly | Partner note a day before a (longer than a day) location pause ends. |
| `partners.reliability` | Mondays 08:00 | Flags partners with 2+ auto-cancellations or 3+ slow replies (over 60 min) in 30 days, for ops. |
| `partners.day_plan` | daily 07:30 | Today's drop-offs and pick-ups, for partners who switched on *Morning plan email* (Profile → notifications). |
| `ops.daily_digest` | daily 09:00 | One email + in-app note to all admins with what needs attention. |
| `housekeeping.cleanup` | daily 03:30 | Deletes read + archived notifications (90 days) and job logs (90 days). |

All thresholds are editable on the admin page. Quiet hours (22:00–07:00 India time) hold
non-urgent reminders until morning when they can wait. Daily, weekly and monthly jobs that
miss their time (no tick, or a fresh deploy) catch up within 20 hours, 2 days and 3 days.

**Payouts:** checkout writes one payout row per booking to `partner_transactions`. Cancelling
a booking removes its pending row (except an online-paid no-show, where the partner keeps
their share). Statements read those rows; nothing writes monthly total rows any more.

## Safety switches

- **Dry-run mode** (on by default after the migration): jobs record in the ledger what they
  *would* do and change nothing. Switch it off on the admin page to go live.
- **Pause**: the clock's calls do nothing; *Run now* still works.
- **Per-job switch**, and the partner-response job switches itself off if it would cancel
  more than `maxAutoCancelsPerRun` bookings in one run.

## Running locally

```bash
npm run jobs:tick                                   # every due job, once
npm run jobs:tick -- --job=booking.partner_response # one job (even if switched off)
npm run jobs:tick -- --dry                          # force a dry run
npm run jobs:tick -- --now=2026-11-09T10:45:00+05:30 # as if it were that time
npm run jobs:watch                                  # every 5 minutes until Ctrl+C
```

These use `.env.local` and the same database as the dev servers.

## Setting up the clock (production)

Do this only for a deployed admin app with its **own** Supabase project. Don't point a clock at
the shared development database.

1. **Secret.** Generate one (`openssl rand -hex 32`) and set `JOBS_SECRET` in the admin
   project's Vercel environment variables. Redeploy.
2. **Supabase extensions.** Dashboard → Integrations → Cron: enable it (this turns on
   `pg_cron`). Database → Extensions: enable `pg_net`.
3. **Vault.** In the SQL editor (replace the values):

   ```sql
   select vault.create_secret('https://admin.stashinn.in/api/jobs/tick', 'jobs_tick_url');
   select vault.create_secret('<the JOBS_SECRET value>', 'jobs_secret');
   ```

4. **The tick:**

   ```sql
   select cron.schedule('stashinn-tick', '*/5 * * * *', $$
     select net.http_post(
       url     := (select decrypted_secret from vault.decrypted_secrets where name = 'jobs_tick_url'),
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'jobs_secret'),
         'Content-Type', 'application/json'),
       body    := '{}'::jsonb,
       timeout_milliseconds := 60000);
   $$);
   ```

5. **Trim Supabase's own cron log** (it grows by about 8,600 rows a month):

   ```sql
   select cron.schedule('stashinn-cron-log-trim', '15 3 * * *',
     $$ delete from cron.job_run_details where end_time < now() - interval '14 days' $$);
   ```

6. **Check:** after 5 minutes the admin page shows "Running · last tick … ago".
   `select * from cron.job_run_details order by start_time desc limit 5;` shows the calls, and
   `select * from net._http_response order by created desc limit 5;` shows the runner's replies.
7. Optional: create a check on Healthchecks.io (period 5 min, grace 15 min) and set its ping
   URL as `JOBS_HEARTBEAT_URL`.
8. Watch a few days in dry-run mode on the admin page's Activity list, then switch to live.

**Rotating the secret:** set the new value as `JOBS_SECRET` and the old one as
`JOBS_SECRET_PREVIOUS`, redeploy, update the `jobs_secret` Vault secret
(`select vault.update_secret((select id from vault.secrets where name = 'jobs_secret'), '<new>');`),
then remove `JOBS_SECRET_PREVIOUS`.

**Stopping it:** `select cron.unschedule('stashinn-tick');`

## Adding a job

1. Write it in `packages/lib/src/jobs/` as a `JobDefinition` (see `bookings/reminders.ts`):
   one query for what is due (`limit` it), then `ctx.ledger.once(entityType, id, step, description, fn)`
   per item. Use `ctx.now`, never `new Date()`, so tests can move time.
2. Add it to `JOBS` in `registry.ts`. It appears on the admin page automatically.
3. Change bookings only through `services/bookingLifecycle.ts`, and only from the status you
   expect, so a person acting at the same moment wins cleanly.
