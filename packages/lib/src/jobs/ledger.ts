import type { Db } from '../services/bookingLifecycle';
import type { Ledger, LedgerOutcome, StepResult } from './types';
import { MIN } from './time';

export const MAX_ATTEMPTS = 3;
const BACKOFF_MIN = [5, 15, 45];

/**
 * The once-only ledger (job_events). A row is written *before* the step runs, so a crash
 * halfway can't repeat it; the unique key (job, entity_id, step, dry_run) settles races.
 */
export function createLedger(opts: { db: Db; job: string; now: Date; dryRun: boolean; count: (k: string) => void }): Ledger {
  const { db, job, now, dryRun, count } = opts;
  const stamp = () => new Date().toISOString();

  return {
    async once(entityType: string, entityId: string, step: string, describe: string, fn: () => Promise<StepResult>): Promise<LedgerOutcome> {
      const { data: rows } = await db
        .from('job_events')
        .select('id, status, attempts, next_attempt_at, dry_run')
        .eq('job', job).eq('entity_id', entityId).eq('step', step);
      const live = (rows || []).find((r: any) => !r.dry_run);
      const dry = (rows || []).find((r: any) => r.dry_run);

      if (dryRun) {
        if (live || dry) return 'exists';
        const { error } = await db.from('job_events').insert({
          job, entity_type: entityType, entity_id: entityId, step, dry_run: true, status: 'dry', detail: { would: describe },
        });
        if (error) return 'exists';
        count('dry');
        return 'dry';
      }

      let id: string;
      let attempts: number;
      if (live) {
        if (live.status !== 'failed') return 'exists';
        if (live.attempts >= MAX_ATTEMPTS) return 'exists';
        if (live.next_attempt_at && new Date(live.next_attempt_at) > now) return 'exists';
        // Claim the retry; another runner that got here first wins
        const { data: claimed } = await db.from('job_events')
          .update({ status: 'running', attempts: live.attempts + 1, updated_at: stamp() })
          .eq('id', live.id).eq('status', 'failed').eq('attempts', live.attempts)
          .select('id');
        if (!claimed?.length) return 'exists';
        id = live.id;
        attempts = live.attempts + 1;
      } else {
        const { data: created, error } = await db.from('job_events')
          .insert({ job, entity_type: entityType, entity_id: entityId, step, dry_run: false, status: 'running', attempts: 1, detail: { what: describe } })
          .select('id').single();
        if (error || !created) return 'exists';
        id = created.id;
        attempts = 1;
      }

      try {
        const result = (await fn()) || {};
        const status = result.status ?? 'done';
        await db.from('job_events').update({
          status, last_error: null, next_attempt_at: null, updated_at: stamp(),
          detail: { what: describe, ...(result.detail || {}) },
        }).eq('id', id);
        count(status);
        return status === 'skipped' ? 'skipped' : 'ran';
      } catch (e: any) {
        const message = String(e?.message || e).slice(0, 500);
        const wait = BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)]!;
        await db.from('job_events').update({
          status: 'failed', last_error: message, updated_at: stamp(),
          next_attempt_at: attempts >= MAX_ATTEMPTS ? null : new Date(now.getTime() + wait * MIN).toISOString(),
        }).eq('id', id);
        count('failed');
        return 'failed';
      }
    },
  };
}
