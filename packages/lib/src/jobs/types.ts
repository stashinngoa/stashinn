import type { Db } from '../services/bookingLifecycle';
import type { JobSettings } from './settings';

/**
 * When a job is due: every tick (5 min), every N minutes, or at an India time once a day,
 * once a week (weekday 0 = Sunday … 6 = Saturday) or once a month (day 1–28).
 */
export type Cadence =
  | 'tick'
  | { everyMinutes: number }
  | { dailyAt: string }
  | { weeklyOn: number; at: string }
  | { monthlyOn: number; at: string };

/** What happened to one step: run now, already done earlier, failed (will retry), or only recorded (dry run). */
export type LedgerOutcome = 'ran' | 'skipped' | 'failed' | 'dry' | 'exists';

export type StepResult = void | { status?: 'done' | 'skipped'; detail?: Record<string, unknown> };

export interface Ledger {
  /**
   * Runs `fn` at most once for (this job, entityId, step). A failed step is retried on later
   * ticks (5, 15, 45 minutes) up to 3 attempts. In dry-run mode `fn` is not called; the step is
   * only recorded with `describe`.
   */
  once(entityType: string, entityId: string, step: string, describe: string, fn: () => Promise<StepResult>): Promise<LedgerOutcome>;
}

export interface JobContext {
  job: string;
  db: Db;
  now: Date;
  dryRun: boolean;
  settings: JobSettings;
  ledger: Ledger;
  counts: Record<string, number>;
  count(key: string, n?: number): void;
  /** True once the run's time budget is used up: stop starting new items. */
  outOfTime(): boolean;
}

export interface JobDefinition {
  name: string;
  title: string;
  area: 'Bookings' | 'Payments' | 'Disputes' | 'Partners' | 'Ops' | 'Housekeeping';
  description: string;
  cadence: Cadence;
  defaultEnabled: boolean;
  run(ctx: JobContext): Promise<void>;
}
