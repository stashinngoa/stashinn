import type { JobContext } from './types';
import { inQuietHours, MIN, quietHoursEnd } from './time';

/**
 * True when a non-urgent message should wait: it's quiet hours and it can still go out
 * after they end, before `mustSendBy`.
 */
export function holdForQuietHours(ctx: JobContext, mustSendBy: Date | number): boolean {
  const s = ctx.settings;
  if (!inQuietHours(ctx.now, s.quietHoursStart, s.quietHoursEnd)) return false;
  return new Date(mustSendBy).getTime() > quietHoursEnd(ctx.now, s.quietHoursEnd).getTime();
}

/** A reminder that would arrive this late is noise: skip it. */
export const tooLate = (ctx: JobContext, dueAt: number) => ctx.now.getTime() - dueAt > ctx.settings.reminderLateLimitMin * MIN;
