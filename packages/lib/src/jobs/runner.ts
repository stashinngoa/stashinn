import type { Db } from '../services/bookingLifecycle';
import type { Cadence, JobContext, JobDefinition } from './types';
import { createLedger } from './ledger';
import { JOBS, jobByName } from './registry';
import { loadJobConfig } from './settings';
import { DAY, HOUR, istAt, istParts, MIN } from './time';

export const TICK_LEASE = 'tick';
const LEASE_SECONDS = 240;

export type JobRunSummary = { job: string; status: 'ok' | 'partial' | 'error' | 'skipped'; counts: Record<string, number>; error?: string; ms: number };
export type TickSummary =
  | { ok: true; dryRun: boolean; ran: JobRunSummary[]; skipped: string[]; ms: number }
  | { ok: false; reason: 'paused' | 'locked' | 'unknown_job'; message: string };

/** The most recent scheduled moment at or before `now` for a fixed-time cadence. */
function lastSlot(cadence: Exclude<Cadence, 'tick' | { everyMinutes: number }>, now: Date): Date {
  const p = istParts(now);
  if ('dailyAt' in cadence) {
    const today = istAt(p.year, p.month, p.day, cadence.dailyAt);
    return today <= now ? today : new Date(today.getTime() - DAY);
  }
  if ('weeklyOn' in cadence) {
    const back = (p.weekday - cadence.weeklyOn + 7) % 7;
    const slot = new Date(istAt(p.year, p.month, p.day, cadence.at).getTime() - back * DAY);
    return slot <= now ? slot : new Date(slot.getTime() - 7 * DAY);
  }
  const thisMonth = istAt(p.year, p.month, cadence.monthlyOn, cadence.at);
  if (thisMonth <= now) return thisMonth;
  return p.month === 1 ? istAt(p.year - 1, 12, cadence.monthlyOn, cadence.at) : istAt(p.year, p.month - 1, cadence.monthlyOn, cadence.at);
}

/**
 * Whether a job is due at `now`, given when it last ran. A fixed-time job that missed its
 * slot (no tick, or first deploy) catches up only within a window, so a new deploy doesn't
 * send last month's statements mid-month.
 */
export function isDue(cadence: Cadence, lastRunAt: string | null, now: Date): boolean {
  if (cadence === 'tick') return true;
  const last = lastRunAt ? new Date(lastRunAt).getTime() : 0;
  if ('everyMinutes' in cadence) return now.getTime() - last >= cadence.everyMinutes * MIN - 30_000;
  const slot = lastSlot(cadence, now).getTime();
  const window = 'dailyAt' in cadence ? 20 * HOUR : 'weeklyOn' in cadence ? 2 * DAY : 3 * DAY;
  return last < slot && now.getTime() - slot < window;
}

/**
 * Runs the due jobs once. Called by POST /api/jobs/tick (cron), by an admin's "Run now"
 * (`only` = one job, `trigger: 'manual'`), and by `npm run jobs:tick` (script).
 *
 * Only one runner at a time: a lease row in job_state. Each job gets a job_runs row.
 */
export async function runJobs(db: Db, opts: {
  trigger: 'cron' | 'manual' | 'script';
  now?: Date;
  only?: string;
  /** Force dry run on (a manual "Dry run now"), whatever the global switch says. */
  dryRun?: boolean;
  budgetMs?: number;
}): Promise<TickSummary> {
  const started = Date.now();
  const now = opts.now ?? new Date();
  const budgetMs = opts.budgetMs ?? 50_000;
  const { settings, control } = await loadJobConfig(db);

  if (control.paused && opts.trigger === 'cron') return { ok: false, reason: 'paused', message: 'All scheduled jobs are paused.' };
  const only = opts.only ? jobByName(opts.only) : null;
  if (opts.only && !only) return { ok: false, reason: 'unknown_job', message: `No job called ${opts.only}.` };

  const { data: leased, error: leaseError } = await (db as any).rpc('claim_job_lease', { lease_name: TICK_LEASE, seconds: LEASE_SECONDS });
  if (leaseError) throw new Error(`Couldn’t take the job lease: ${leaseError.message}`);
  if (!leased) return { ok: false, reason: 'locked', message: 'Another run is in progress. Try again in a few minutes.' };

  const dryRun = opts.dryRun === true || control.dryRun;
  const ran: JobRunSummary[] = [];
  const skipped: string[] = [];
  try {
    const { data: states } = await db.from('job_state').select('name, enabled, last_run_at');
    const stateOf = (name: string) => (states || []).find((s: any) => s.name === name) as { enabled: boolean; last_run_at: string | null } | undefined;
    const candidates: JobDefinition[] = only ? [only] : JOBS;

    for (const job of candidates) {
      const state = stateOf(job.name);
      const enabled = state ? state.enabled : job.defaultEnabled;
      if (!only && (!enabled || !isDue(job.cadence, state?.last_run_at ?? null, now))) { skipped.push(job.name); continue; }
      if (Date.now() - started > budgetMs) { skipped.push(job.name); continue; }
      ran.push(await runOne(db, job, { now, dryRun, settings, trigger: opts.trigger, deadline: started + budgetMs }));
    }
  } finally {
    await (db as any).rpc('release_job_lease', { lease_name: TICK_LEASE });
  }

  // The tick row's times feed the admin health banner
  const stamp = new Date().toISOString();
  const anyError = ran.some(r => r.status === 'error');
  await db.from('job_state').upsert({ name: TICK_LEASE, last_run_at: stamp, ...(anyError ? { last_error: ran.find(r => r.error)?.error } : { last_ok_at: stamp, last_error: null }), updated_at: stamp }, { onConflict: 'name' });

  const heartbeat = process.env.JOBS_HEARTBEAT_URL;
  if (heartbeat && opts.trigger === 'cron' && !anyError) {
    try { await fetch(heartbeat, { method: 'GET', signal: AbortSignal.timeout(5000) }); } catch { /* the monitor will notice */ }
  }

  return { ok: true, dryRun, ran, skipped, ms: Date.now() - started };
}

async function runOne(db: Db, job: JobDefinition, o: { now: Date; dryRun: boolean; settings: JobContext['settings']; trigger: string; deadline: number }): Promise<JobRunSummary> {
  const t0 = Date.now();
  const counts: Record<string, number> = {};
  const count = (k: string, n = 1) => { counts[k] = (counts[k] || 0) + n; };
  const { data: runRow } = await db.from('job_runs').insert({ job: job.name, trigger: o.trigger, dry_run: o.dryRun }).select('id').single();

  const ctx: JobContext = {
    job: job.name,
    db,
    now: o.now,
    dryRun: o.dryRun,
    settings: o.settings,
    ledger: createLedger({ db, job: job.name, now: o.now, dryRun: o.dryRun, count }),
    counts,
    count,
    outOfTime: () => Date.now() > o.deadline,
  };

  let status: JobRunSummary['status'] = 'ok';
  let error: string | undefined;
  try {
    await job.run(ctx);
    if (counts.failed) status = 'partial';
  } catch (e: any) {
    status = 'error';
    error = String(e?.message || e).slice(0, 500);
  }

  const stamp = new Date().toISOString();
  if (runRow?.id) await db.from('job_runs').update({ finished_at: stamp, status, counts, error: error ?? null }).eq('id', runRow.id);
  // Keep the on/off switch as it is (the job may have switched itself off)
  const { data: existing } = await db.from('job_state').select('name').eq('name', job.name).maybeSingle();
  const fields = { last_run_at: stamp, ...(status === 'error' ? { last_error: error } : { last_ok_at: stamp, last_error: null }), updated_at: stamp };
  if (existing) await db.from('job_state').update(fields).eq('name', job.name);
  else await db.from('job_state').insert({ name: job.name, enabled: job.defaultEnabled, ...fields });

  return { job: job.name, status, counts, error, ms: Date.now() - t0 };
}
