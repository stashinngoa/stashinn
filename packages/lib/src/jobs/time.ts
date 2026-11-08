// India-time helpers for the jobs. Servers run in UTC; every rule here is in IST (+05:30).

const IST_OFFSET_MS = 330 * 60_000;
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** Minutes since midnight in India for `d`. */
export function istMinuteOfDay(d: Date): number {
  const t = new Date(d.getTime() + IST_OFFSET_MS);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}

const parseHm = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Today's "HH:MM" India time, as an instant. */
export function istToday(now: Date, hm: string): Date {
  const t = new Date(now.getTime() + IST_OFFSET_MS);
  const midnightIst = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  return new Date(midnightIst + parseHm(hm) * MIN - IST_OFFSET_MS);
}

/** Whether `now` falls in quiet hours (start → end, crossing midnight when start > end). */
export function inQuietHours(now: Date, start: string, end: string): boolean {
  const m = istMinuteOfDay(now), a = parseHm(start), b = parseHm(end);
  return a > b ? m >= a || m < b : m >= a && m < b;
}

/** The next moment quiet hours end. */
export function quietHoursEnd(now: Date, end: string): Date {
  const today = istToday(now, end);
  return today > now ? today : new Date(today.getTime() + DAY);
}

/** "Mon 9 Nov, 11:00 am" in India time (for messages). */
export const istLabel = (d: Date | string) =>
  new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

/** "11:00 am" in India time. */
export const istClock = (d: Date | string) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

/** India-time calendar parts of `d` (weekday 0 = Sunday). */
export function istParts(d: Date) {
  const t = new Date(d.getTime() + IST_OFFSET_MS);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), weekday: t.getUTCDay() };
}

/** "HH:MM" India time on a given India calendar day, as an instant. */
export function istAt(year: number, month: number, day: number, hm: string): Date {
  return new Date(Date.UTC(year, month - 1, day) + parseHm(hm) * MIN - IST_OFFSET_MS);
}

/** "2026-11-09" for `d` in India time. */
export const istDateKey = (d: Date) => {
  const p = istParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

/** "2026-10" for the India-time month before `d`. */
export const previousIstMonth = (d: Date) => {
  const p = istParts(d);
  const y = p.month === 1 ? p.year - 1 : p.year;
  const m = p.month === 1 ? 12 : p.month - 1;
  return `${y}-${String(m).padStart(2, '0')}`;
};

/** ISO week key ("2026-W46") of `d` in India time. */
export function istWeekKey(d: Date): string {
  const p = istParts(d);
  const date = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Minutes inside working hours (start–end India time, every day) between two instants.
 * Used for response times like "4 working hours".
 */
export function workingMinutesBetween(from: Date, to: Date, start: string, end: string): number {
  if (to <= from) return 0;
  let total = 0;
  let cursor = istToday(from, '00:00');
  for (let i = 0; i < 400 && cursor < to; i++) {
    const p = istParts(new Date(cursor.getTime() + 12 * HOUR));
    const open = istAt(p.year, p.month, p.day, start).getTime();
    const close = istAt(p.year, p.month, p.day, end).getTime();
    const a = Math.max(open, from.getTime());
    const b = Math.min(close, to.getTime());
    if (b > a) total += (b - a) / MIN;
    cursor = new Date(cursor.getTime() + DAY);
  }
  return Math.round(total);
}
