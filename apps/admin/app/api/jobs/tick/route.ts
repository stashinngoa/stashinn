import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { runJobs } from '@stashinn/lib/jobs';

// The clock (Supabase Cron, every 5 minutes) calls this. See docs/SCHEDULED_JOBS.md.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const matches = (given: string, secret: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function POST(request: Request) {
  // Fails closed: no secret configured → nothing runs
  const secret = process.env.JOBS_SECRET;
  if (!secret) return NextResponse.json({ error: 'Scheduled jobs are not configured (JOBS_SECRET is not set).' }, { status: 503 });

  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const accepted = [secret, process.env.JOBS_SECRET_PREVIOUS].filter((s): s is string => !!s);
  if (!given || !accepted.some(s => matches(given, s))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: { job?: string; now?: string } = await request.json().catch(() => ({}));
  // Tests may run "as if it were" another time, never in production
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';
  const now = !isProduction && body.now && !Number.isNaN(Date.parse(body.now)) ? new Date(body.now) : undefined;

  try {
    const summary = await runJobs(createServiceClient(), { trigger: 'cron', now, only: body.job });
    const status = summary.ok ? 200 : summary.reason === 'locked' ? 409 : summary.reason === 'unknown_job' ? 404 : 200;
    return NextResponse.json(summary, { status });
  } catch (e: any) {
    console.error('[JOBS_TICK_FAILED]', e);
    return NextResponse.json({ error: 'The job runner failed.', detail: String(e?.message || e) }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: 'Use POST.' }, { status: 405 });
}
