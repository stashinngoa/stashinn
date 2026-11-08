import type { Db } from '../services/bookingLifecycle';

/**
 * Thresholds for the jobs. Admins override any of them on the Scheduled Jobs page
 * (stored in system_config 'jobs_settings'); a missing key uses the default here.
 */
export const JOB_SETTINGS_DEFAULTS = {
  // Partner hasn't accepted or declined (minutes)
  partnerReminder1AfterMin: 15,
  partnerReminder2AfterMin: 60,
  partnerReminder2LatestBeforeDropoffMin: 180,
  opsAlertBeforeDropoffMin: 60,
  autoCancelBeforeDropoffMin: 15,
  autoCancelNotBeforeBookedMin: 30,
  maxAutoCancelsPerRun: 10,
  // Reminders to the customer
  dropoffReminderBeforeMin: 180,
  dropoffEarlyReminderBeforeHours: 24,
  dropoffEarlyReminderIfBookedAheadHours: 36,
  pickupReminderBeforeMin: 60,
  // No-shows and overdue pick-ups
  noShowNudgeAfterMin: 120,
  overdueNotifyAfterMin: 30,
  overdueOpsAlertAfterHours: 24,
  overdueUncollectedAfterDays: 7,
  // Delivery rules
  reminderLateLimitMin: 120,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  // Housekeeping (days)
  keepReadNotificationsDays: 90,
  keepJobLogsDays: 90,
  // Disputes and support (phase 2)
  workingHoursStart: '09:00',
  workingHoursEnd: '21:00',
  disputeNewAlertWorkingHours: 4,
  disputeEscalateAfterHours: 24,
  disputeIdleAfterHours: 72,
  ticketOpenAlertHours: 24,
  // Partners (phase 2)
  applicationPendingAlertHours: 48,
  infoRequestReminderDays: 3,
  infoRequestOpsAlertDays: 7,
  pauseEndingNoticeHours: 24,
  reliabilityAutoCancels: 2,
  reliabilitySlowReplies: 3,
  reliabilitySlowReplyMin: 60,
  // Reviews (phase 2)
  reviewRequestAfterHours: 2,
  reviewReminderAfterDays: 3,
  // Money (phase 3)
  cashDueReminderAfterDays: 7,
  cashDueEscalateAfterDays: 21,
  orphanPaymentAfterMin: 30,
};

export type JobSettings = typeof JOB_SETTINGS_DEFAULTS;
export type JobControl = { paused: boolean; dryRun: boolean };

/** Labels for the settings form, grouped as on the admin page. */
export const JOB_SETTING_FIELDS: { group: string; key: keyof JobSettings; label: string; unit: string }[] = [
  { group: 'Partner response', key: 'partnerReminder1AfterMin', label: 'First reminder to the partner, after booking', unit: 'min' },
  { group: 'Partner response', key: 'partnerReminder2AfterMin', label: 'Second reminder, after booking', unit: 'min' },
  { group: 'Partner response', key: 'partnerReminder2LatestBeforeDropoffMin', label: 'Second reminder no later than, before drop-off', unit: 'min' },
  { group: 'Partner response', key: 'opsAlertBeforeDropoffMin', label: 'Alert ops and tell the customer, before drop-off', unit: 'min' },
  { group: 'Partner response', key: 'autoCancelBeforeDropoffMin', label: 'Auto-cancel with a full refund, before drop-off', unit: 'min' },
  { group: 'Partner response', key: 'autoCancelNotBeforeBookedMin', label: 'Never auto-cancel sooner than this after booking', unit: 'min' },
  { group: 'Partner response', key: 'maxAutoCancelsPerRun', label: 'Pause the job if one run would cancel more than', unit: 'bookings' },
  { group: 'Customer reminders', key: 'dropoffReminderBeforeMin', label: 'Drop-off reminder, before drop-off', unit: 'min' },
  { group: 'Customer reminders', key: 'dropoffEarlyReminderBeforeHours', label: 'Early drop-off reminder, before drop-off', unit: 'hours' },
  { group: 'Customer reminders', key: 'dropoffEarlyReminderIfBookedAheadHours', label: 'Send the early reminder only if booked this far ahead', unit: 'hours' },
  { group: 'Customer reminders', key: 'pickupReminderBeforeMin', label: 'Pick-up reminder, before pick-up', unit: 'min' },
  { group: 'No-shows and overdue', key: 'noShowNudgeAfterMin', label: 'Nudge a customer who hasn’t dropped off, after drop-off time', unit: 'min' },
  { group: 'No-shows and overdue', key: 'overdueNotifyAfterMin', label: 'Tell customer and partner about a late pick-up, after pick-up time', unit: 'min' },
  { group: 'No-shows and overdue', key: 'overdueOpsAlertAfterHours', label: 'Alert ops about a late pick-up, after pick-up time', unit: 'hours' },
  { group: 'No-shows and overdue', key: 'overdueUncollectedAfterDays', label: 'Start the uncollected-items process, after pick-up time', unit: 'days' },
  { group: 'Delivery', key: 'reminderLateLimitMin', label: 'Skip a reminder that would arrive later than', unit: 'min late' },
  { group: 'Delivery', key: 'quietHoursStart', label: 'Quiet hours start (no reminders)', unit: 'HH:MM' },
  { group: 'Delivery', key: 'quietHoursEnd', label: 'Quiet hours end', unit: 'HH:MM' },
  { group: 'Disputes and support', key: 'workingHoursStart', label: 'Support working hours start', unit: 'HH:MM' },
  { group: 'Disputes and support', key: 'workingHoursEnd', label: 'Support working hours end', unit: 'HH:MM' },
  { group: 'Disputes and support', key: 'disputeNewAlertWorkingHours', label: 'Alert support about an untouched dispute after', unit: 'working h' },
  { group: 'Disputes and support', key: 'disputeEscalateAfterHours', label: 'Escalate an untouched dispute to superadmin after', unit: 'hours' },
  { group: 'Disputes and support', key: 'disputeIdleAfterHours', label: 'Remind support about a dispute under review with no update for', unit: 'hours' },
  { group: 'Disputes and support', key: 'ticketOpenAlertHours', label: 'Alert support about an open partner ticket after', unit: 'hours' },
  { group: 'Partners', key: 'applicationPendingAlertHours', label: 'List applications in the digest when waiting more than', unit: 'hours' },
  { group: 'Partners', key: 'infoRequestReminderDays', label: 'Remind a partner about an unanswered info request after', unit: 'days' },
  { group: 'Partners', key: 'infoRequestOpsAlertDays', label: 'Alert ops about an unanswered info request after', unit: 'days' },
  { group: 'Partners', key: 'pauseEndingNoticeHours', label: 'Tell a partner their pause is ending, before it ends', unit: 'hours' },
  { group: 'Partners', key: 'reliabilityAutoCancels', label: 'Flag a partner with this many auto-cancellations in 30 days', unit: 'bookings' },
  { group: 'Partners', key: 'reliabilitySlowReplies', label: 'Flag a partner with this many slow replies in 30 days', unit: 'bookings' },
  { group: 'Partners', key: 'reliabilitySlowReplyMin', label: 'A reply counts as slow after', unit: 'min' },
  { group: 'Reviews', key: 'reviewRequestAfterHours', label: 'Ask for a review, after pick-up', unit: 'hours' },
  { group: 'Reviews', key: 'reviewReminderAfterDays', label: 'One reminder, after pick-up', unit: 'days' },
  { group: 'Money', key: 'cashDueReminderAfterDays', label: 'Remind a partner about unpaid cash commission after', unit: 'days' },
  { group: 'Money', key: 'cashDueEscalateAfterDays', label: 'List unpaid cash commission in the ops digest after', unit: 'days' },
  { group: 'Money', key: 'orphanPaymentAfterMin', label: 'Refund an online payment with no booking after', unit: 'min' },
  { group: 'Housekeeping', key: 'keepReadNotificationsDays', label: 'Delete read, archived notifications after', unit: 'days' },
  { group: 'Housekeeping', key: 'keepJobLogsDays', label: 'Delete job logs after', unit: 'days' },
];

export async function loadJobConfig(db: Db): Promise<{ settings: JobSettings; control: JobControl }> {
  const { data } = await db.from('system_config').select('key, value').in('key', ['jobs_settings', 'jobs_control']);
  const byKey = Object.fromEntries(((data as { key: string; value: any }[]) || []).map(r => [r.key, r.value]));
  const overrides = (byKey.jobs_settings && typeof byKey.jobs_settings === 'object') ? byKey.jobs_settings : {};
  const settings = { ...JOB_SETTINGS_DEFAULTS };
  for (const k of Object.keys(JOB_SETTINGS_DEFAULTS) as (keyof JobSettings)[]) {
    const v = overrides[k];
    if (typeof JOB_SETTINGS_DEFAULTS[k] === 'number' && Number.isFinite(Number(v)) && Number(v) >= 0) (settings as any)[k] = Number(v);
    if (typeof JOB_SETTINGS_DEFAULTS[k] === 'string' && typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) (settings as any)[k] = v;
  }
  const c = byKey.jobs_control || {};
  // No control row yet (migration not run) → dry run, so nothing is changed by accident
  return { settings, control: { paused: c.paused === true, dryRun: c.dry_run !== false } };
}
