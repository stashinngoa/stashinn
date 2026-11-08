/**
 * Runs the scheduled jobs from your machine, against the database in .env.local.
 *
 *   npm run jobs:tick                         run every due job once
 *   npm run jobs:tick -- --job=booking.no_show   run one job (even if switched off)
 *   npm run jobs:tick -- --dry                record what would happen, change nothing
 *   npm run jobs:tick -- --now=2026-11-09T10:45:00+05:30   run "as if it were" that time
 *   npm run jobs:watch                        repeat every 5 minutes until stopped
 *
 * The global switches on the admin Jobs page still apply (dry-run mode stays dry).
 */
import { createServiceClient } from '../packages/lib/src/supabase/service';
import { runJobs } from '../packages/lib/src/jobs/index';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
}));

async function once() {
  const now = typeof args.now === 'string' ? new Date(args.now) : undefined;
  if (now && Number.isNaN(now.getTime())) throw new Error(`Can't read --now=${args.now}`);
  const summary = await runJobs(createServiceClient(), {
    trigger: 'script',
    now,
    only: typeof args.job === 'string' ? args.job : undefined,
    dryRun: args.dry === true ? true : undefined,
  });
  const at = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
  if (!summary.ok) { console.log(`[${at}] ${summary.message}`); return; }
  console.log(`[${at}] ${summary.dryRun ? 'DRY RUN · ' : ''}${summary.ran.length} job(s) in ${summary.ms} ms`);
  for (const r of summary.ran) console.log(`  ${r.status.padEnd(7)} ${r.job.padEnd(28)} ${JSON.stringify(r.counts)}${r.error ? `  ${r.error}` : ''}`);
}

if (args.watch) {
  console.log('Running the jobs every 5 minutes. Ctrl+C to stop.');
  const loop = async () => { try { await once(); } catch (e) { console.error(e); } };
  loop();
  setInterval(loop, 5 * 60_000);
} else {
  once().catch(e => { console.error(e); process.exit(1); });
}
