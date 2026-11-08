'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { JOB_SETTINGS_DEFAULTS, jobByName, loadJobConfig, MAX_ATTEMPTS, runJobs, type JobSettings } from '@stashinn/lib/jobs';
import { getAdminContext, requireAccess } from '../../../lib/adminAccess';

export type JobsResult = { ok: true; message: string } | { ok: false; error: string };
const PATH = '/dashboard/jobs';

async function guard(): Promise<{ adminId: string | null } | { error: string }> {
  try {
    await requireAccess(PATH);
  } catch (e: any) {
    return { error: e.message };
  }
  const { user } = await getAdminContext();
  return { adminId: user?.id ?? null };
}

async function audit(adminId: string | null, action: string, entityId: string, newValues: object, oldValues: object = {}) {
  await createServiceClient().from('audit_logs').insert({ user_id: adminId, action, entity_type: 'scheduled_jobs', entity_id: entityId, old_values: oldValues, new_values: newValues });
}

/** Switches one job on or off. */
export async function setJobEnabled(name: string, enabled: boolean): Promise<JobsResult> {
  const g = await guard();
  if ('error' in g) return { ok: false, error: g.error };
  if (!jobByName(name)) return { ok: false, error: 'Unknown job.' };
  const db = createServiceClient();
  const { error } = await db.from('job_state').upsert({ name, enabled, ...(enabled ? { last_error: null } : {}), updated_at: new Date().toISOString() }, { onConflict: 'name' });
  if (error) return { ok: false, error: error.message };
  await audit(g.adminId, enabled ? 'jobs.enabled' : 'jobs.disabled', name, { enabled });
  revalidatePath(PATH);
  return { ok: true, message: enabled ? 'Job switched on.' : 'Job switched off.' };
}

/** The global switches: pause everything, and dry-run mode. */
export async function setJobsControl(change: { paused?: boolean; dryRun?: boolean }): Promise<JobsResult> {
  const g = await guard();
  if ('error' in g) return { ok: false, error: g.error };
  const db = createServiceClient();
  const { control } = await loadJobConfig(db);
  const next = { paused: change.paused ?? control.paused, dry_run: change.dryRun ?? control.dryRun };
  const { error } = await db.from('system_config').upsert({ key: 'jobs_control', value: next, updated_by: g.adminId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return { ok: false, error: error.message };
  await audit(g.adminId, 'jobs.control_changed', 'jobs_control', next, { paused: control.paused, dry_run: control.dryRun });
  revalidatePath(PATH);
  return {
    ok: true,
    message: change.paused !== undefined
      ? (next.paused ? 'All jobs paused.' : 'Jobs resumed.')
      : (next.dry_run ? 'Dry-run mode on: jobs record what they would do and change nothing.' : 'Jobs are live: they now send messages and cancel bookings.'),
  };
}

/** Runs one job now. `dry` forces a dry run even when jobs are live. */
export async function runJobNow(name: string, dry: boolean): Promise<JobsResult> {
  const g = await guard();
  if ('error' in g) return { ok: false, error: g.error };
  const db = createServiceClient();
  const summary = await runJobs(db, { trigger: 'manual', only: name, dryRun: dry || undefined });
  if (!summary.ok) return { ok: false, error: summary.message };
  await audit(g.adminId, 'jobs.run_manually', name, { dry_run: summary.dryRun, result: summary.ran[0]?.counts ?? {} });
  revalidatePath(PATH);
  const r = summary.ran[0];
  if (!r) return { ok: false, error: 'The job didn’t run.' };
  if (r.status === 'error') return { ok: false, error: `The job failed: ${r.error}` };
  const counts = Object.entries(r.counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing due';
  return { ok: true, message: `${summary.dryRun ? 'Dry run' : 'Ran'} in ${r.ms} ms: ${counts}.` };
}

/** Gives a failed step one more attempt on the next run. */
export async function retryJobEvent(id: string): Promise<JobsResult> {
  const g = await guard();
  if ('error' in g) return { ok: false, error: g.error };
  const db = createServiceClient();
  const { data: row } = await db.from('job_events').select('id, job, entity_id, step, status, attempts').eq('id', id).maybeSingle();
  if (!row || row.status !== 'failed') return { ok: false, error: 'Only failed steps can be retried.' };
  const { error } = await db.from('job_events').update({
    attempts: Math.min(row.attempts, MAX_ATTEMPTS - 1),
    next_attempt_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await audit(g.adminId, 'jobs.step_retried', id, { job: row.job, entity_id: row.entity_id, step: row.step });
  revalidatePath(PATH);
  return { ok: true, message: 'It will be retried on the next run (or press Run now on its job).' };
}

/** Saves the thresholds. Blank fields go back to the default. */
export async function saveJobSettings(formData: FormData): Promise<JobsResult> {
  const g = await guard();
  if ('error' in g) return { ok: false, error: g.error };
  const overrides: Partial<Record<keyof JobSettings, number | string>> = {};
  for (const key of Object.keys(JOB_SETTINGS_DEFAULTS) as (keyof JobSettings)[]) {
    const raw = String(formData.get(key) ?? '').trim();
    if (!raw) continue;
    const def = JOB_SETTINGS_DEFAULTS[key];
    if (typeof def === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return { ok: false, error: `“${raw}” isn’t a whole number (0 or more).` };
      if (n !== def) overrides[key] = n;
    } else {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) return { ok: false, error: `Times are written as HH:MM, for example 22:00.` };
      if (raw !== def) overrides[key] = raw;
    }
  }
  const db = createServiceClient();
  const { error } = await db.from('system_config').upsert({ key: 'jobs_settings', value: overrides, updated_by: g.adminId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return { ok: false, error: error.message };
  await audit(g.adminId, 'jobs.settings_changed', 'jobs_settings', overrides);
  revalidatePath(PATH);
  return { ok: true, message: 'Settings saved. They apply from the next run.' };
}
