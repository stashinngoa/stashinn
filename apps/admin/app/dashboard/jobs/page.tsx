import { createServiceClient } from '@stashinn/lib/supabase/service';
import { cadenceLabel, JOB_SETTING_FIELDS, JOB_SETTINGS_DEFAULTS, JOBS, loadJobConfig, TICK_LEASE } from '@stashinn/lib/jobs';
import { getAdminContext } from '../../../lib/adminAccess';
import { accessFor } from '../../../lib/permissions';
import JobsClient, { type JobRow, type EventRow, type RunRow } from './JobsClient';

export const dynamic = 'force-dynamic';

export default async function ScheduledJobsPage() {
  const { role } = await getAdminContext();
  const access = role ? accessFor(role, '/dashboard/jobs') : null;
  if (!access) return null; // the middleware redirects before this

  // Admin-only tables; read with the service role after the access check
  const db = createServiceClient();
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const [{ settings, control }, { data: states, error: stateError }, { data: runs }, { data: events }] = await Promise.all([
    loadJobConfig(db),
    db.from('job_state').select('name, enabled, last_run_at, last_ok_at, last_error'),
    db.from('job_runs').select('id, job, trigger, dry_run, started_at, finished_at, status, counts, error').gte('started_at', since).order('started_at', { ascending: false }).limit(1000),
    db.from('job_events').select('id, job, entity_type, entity_id, step, dry_run, status, attempts, next_attempt_at, last_error, detail, created_at, updated_at').order('updated_at', { ascending: false }).limit(300),
  ]);

  const tick = (states || []).find((s: any) => s.name === TICK_LEASE) as any;
  const jobs: JobRow[] = JOBS.map(j => {
    const st = (states || []).find((s: any) => s.name === j.name) as any;
    const mine = (runs || []).filter((r: any) => r.job === j.name);
    const totals: Record<string, number> = {};
    mine.forEach((r: any) => Object.entries(r.counts || {}).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + Number(v); }));
    return {
      name: j.name,
      title: j.title,
      area: j.area,
      description: j.description,
      schedule: cadenceLabel(j.cadence),
      enabled: st ? st.enabled : j.defaultEnabled,
      lastRunAt: st?.last_run_at ?? null,
      lastOkAt: st?.last_ok_at ?? null,
      lastError: st?.last_error ?? null,
      runs24h: mine.length,
      totals24h: totals,
      lastStatus: mine[0]?.status ?? null,
    };
  });

  return (
    <JobsClient
      canEdit={access === 'full'}
      setupNeeded={!!stateError}
      control={control}
      tick={{ lastRunAt: tick?.last_run_at ?? null, lastOkAt: tick?.last_ok_at ?? null, lastError: tick?.last_error ?? null }}
      jobs={jobs}
      runs={((runs || []) as RunRow[]).slice(0, 40)}
      events={(events || []) as EventRow[]}
      settings={settings}
      defaults={JOB_SETTINGS_DEFAULTS}
      fields={JOB_SETTING_FIELDS}
    />
  );
}
