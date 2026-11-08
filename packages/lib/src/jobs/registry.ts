import type { JobDefinition } from './types';
import { partnerResponseJob } from './bookings/partnerResponse';
import { dropoffReminderJob, pickupReminderJob } from './bookings/reminders';
import { noShowJob, overduePickupJob } from './bookings/attendance';
import { refundRetryJob } from './payments';
import { cleanupJob } from './housekeeping';
import { disputeResponseJob, ticketResponseJob } from './disputes';
import { dayPlanJob, infoRequestJob, pauseEndingJob, reliabilityJob } from './partners';
import { reviewRequestJob } from './reviews';
import { opsDigestJob } from './digest';
import { cashDuesJob, monthlyStatementsJob, orphanPaymentsJob } from './settlements';

/** Every scheduled job, in the order a tick runs them (money and cancellations first). */
export const JOBS: JobDefinition[] = [
  // Bookings (phase 1)
  partnerResponseJob,
  refundRetryJob,
  dropoffReminderJob,
  noShowJob,
  pickupReminderJob,
  overduePickupJob,
  // Money (phase 3)
  orphanPaymentsJob,
  cashDuesJob,
  monthlyStatementsJob,
  // Service levels (phase 2)
  disputeResponseJob,
  ticketResponseJob,
  reviewRequestJob,
  infoRequestJob,
  pauseEndingJob,
  reliabilityJob,
  dayPlanJob,
  opsDigestJob,
  // Housekeeping (phase 4)
  cleanupJob,
];

export const jobByName = (name: string) => JOBS.find(j => j.name === name);

export function cadenceLabel(c: JobDefinition['cadence']): string {
  if (c === 'tick') return 'Every 5 minutes';
  if ('everyMinutes' in c) return c.everyMinutes % 60 === 0 ? `Every ${c.everyMinutes / 60} h` : `Every ${c.everyMinutes} min`;
  if ('dailyAt' in c) return `Daily at ${c.dailyAt}`;
  if ('weeklyOn' in c) return `${['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][c.weeklyOn]} at ${c.at}`;
  return `Monthly on the ${c.monthlyOn}${c.monthlyOn === 1 ? 'st' : c.monthlyOn === 2 ? 'nd' : c.monthlyOn === 3 ? 'rd' : 'th'} at ${c.at}`;
}
