'use client';

import { useMemo, useState, useTransition } from 'react';
import { retryJobEvent, runJobNow, saveJobSettings, setJobEnabled, setJobsControl, type JobsResult } from './actions';

export type JobRow = {
  name: string; title: string; area: string; description: string; schedule: string; enabled: boolean;
  lastRunAt: string | null; lastOkAt: string | null; lastError: string | null;
  runs24h: number; totals24h: Record<string, number>; lastStatus: string | null;
};
export type RunRow = { id: string; job: string; trigger: string; dry_run: boolean; started_at: string; finished_at: string | null; status: string; counts: Record<string, number>; error: string | null };
export type EventRow = {
  id: string; job: string; entity_type: string; entity_id: string; step: string; dry_run: boolean; status: string; attempts: number;
  next_attempt_at: string | null; last_error: string | null; detail: Record<string, any>; created_at: string; updated_at: string;
};
type Field = { group: string; key: string; label: string; unit: string };

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const eyebrow = 'text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';
const STALE_MIN = 20;

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—';
const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};
const ref = (id: string) => `#${id.split('-')[0]!.toUpperCase()}`;

const STATUS_BADGE: Record<string, string> = {
  done: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50',
  ok: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50',
  dry: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-700/50',
  skipped: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  running: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50',
  partial: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50',
  failed: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50',
  error: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50',
};
const Badge = ({ s, label }: { s: string; label?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_BADGE[s] || STATUS_BADGE.skipped}`}>{label || s}</span>
);

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-orange-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function JobsClient({ canEdit, setupNeeded, control, tick, jobs, runs, events, settings, defaults, fields }: {
  canEdit: boolean;
  setupNeeded: boolean;
  control: { paused: boolean; dryRun: boolean };
  tick: { lastRunAt: string | null; lastOkAt: string | null; lastError: string | null };
  jobs: JobRow[];
  runs: RunRow[];
  events: EventRow[];
  settings: Record<string, number | string>;
  defaults: Record<string, number | string>;
  fields: Field[];
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const [jobFilter, setJobFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');

  const act = (key: string, fn: () => Promise<JobsResult>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
      setBusy(null);
    });
  };

  const stale = !tick.lastOkAt || Date.now() - new Date(tick.lastOkAt).getTime() > STALE_MIN * 60_000;
  const failedCount = events.filter(e => e.status === 'failed').length;
  const titleOf = (name: string) => jobs.find(j => j.name === name)?.title || name;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^#/, '');
    return events.filter(e =>
      (jobFilter === 'all' || e.job === jobFilter)
      && (statusFilter === 'all' || e.status === statusFilter)
      && (!needle || e.entity_id.toLowerCase().startsWith(needle) || e.step.includes(needle) || String(e.detail?.what || e.detail?.would || '').toLowerCase().includes(needle)));
  }, [events, jobFilter, statusFilter, q]);

  const groups = [...new Set(fields.map(f => f.group))];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Scheduled Jobs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Every 5 minutes the runner checks bookings and does what is due: reminders, ops alerts, automatic cancellations and refunds. Each step happens once.</p>
        </div>
      </div>

      {setupNeeded && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          The job tables don’t exist yet. Push migration <code className="font-mono text-xs">20261109000000_scheduled_jobs</code> first.
        </div>
      )}

      {/* Health + mode */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className={`${card} p-5 lg:col-span-2 ${stale ? 'border-red-300 dark:border-red-800/70' : ''}`}>
          <p className={eyebrow}>Health</p>
          {tick.lastRunAt ? (
            stale ? (
              <p className="mt-1 text-lg font-extrabold text-red-700 dark:text-red-400">Jobs haven’t run since {fmt(tick.lastOkAt || tick.lastRunAt)}</p>
            ) : (
              <p className="mt-1 text-lg font-extrabold text-emerald-700 dark:text-emerald-400">Running · last tick {ago(tick.lastOkAt)}</p>
            )
          ) : (
            <p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-white">No run yet</p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tick.lastRunAt
              ? stale ? 'The clock may be off: check the Supabase Cron entry and JOBS_SECRET (see docs/SCHEDULED_JOBS.md).' : 'The clock is calling the runner every 5 minutes.'
              : 'Locally, run npm run jobs:tick. In production, Supabase Cron calls the runner every 5 minutes (docs/SCHEDULED_JOBS.md).'}
          </p>
          {tick.lastError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">Last error: {tick.lastError}</p>}
          {failedCount > 0 && (
            <button type="button" onClick={() => { setStatusFilter('failed'); document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400 hover:underline">
              {failedCount} failed step{failedCount === 1 ? '' : 's'} need a look →
            </button>
          )}
        </section>

        <section className={`${card} p-5 space-y-4`} data-edit>
          <p className={eyebrow}>Mode</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{control.dryRun ? 'Dry run' : 'Live'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{control.dryRun ? 'Records what would happen; sends and changes nothing.' : 'Sends messages, cancels and refunds.'}</p>
            </div>
            <Toggle label="Live mode" on={!control.dryRun} disabled={!canEdit || busy !== null}
              onChange={live => act('mode', () => setJobsControl({ dryRun: !live }), live ? 'Go live? Jobs will start messaging customers and partners, and cancelling and refunding unconfirmed bookings.' : undefined)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{control.paused ? 'Paused' : 'Running'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pause stops the clock’s runs. Run now still works.</p>
            </div>
            <Toggle label="Jobs running" on={!control.paused} disabled={!canEdit || busy !== null} onChange={on => act('pause', () => setJobsControl({ paused: !on }))} />
          </div>
        </section>
      </div>

      {msg && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${msg.ok
          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
          : 'border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Jobs */}
      <section className={`${card} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Jobs</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Counts cover the last 24 hours.</p>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {jobs.map(j => (
            <li key={j.name} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{j.title}</span>
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{j.area} · {j.schedule}</span>
                  {!j.enabled && <Badge s="skipped" label="Off" />}
                  {j.lastStatus && <Badge s={j.lastStatus} label={`last: ${j.lastStatus}`} />}
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{j.description}</p>
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  Last run {ago(j.lastRunAt)} · {j.runs24h} run{j.runs24h === 1 ? '' : 's'}
                  {Object.entries(j.totals24h).map(([k, v]) => ` · ${v} ${k}`).join('')}
                </p>
                {j.lastError && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{j.lastError}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0" data-edit>
                <button type="button" disabled={!canEdit || busy !== null} onClick={() => act(`dry-${j.name}`, () => runJobNow(j.name, true))}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                  {busy === `dry-${j.name}` ? 'Running…' : 'Dry run'}
                </button>
                <button type="button" disabled={!canEdit || busy !== null}
                  onClick={() => act(`run-${j.name}`, () => runJobNow(j.name, false), control.dryRun ? undefined : `Run “${j.title}” now? It may message people and change bookings.`)}
                  className="rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                  {busy === `run-${j.name}` ? 'Running…' : control.dryRun ? 'Run now (dry)' : 'Run now'}
                </button>
                <Toggle label={`${j.title} on`} on={j.enabled} disabled={!canEdit || busy !== null} onChange={on => act(`toggle-${j.name}`, () => setJobEnabled(j.name, on))} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Activity */}
      <section id="activity" className={`${card} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Activity</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Every step a job took, newest first. Dry-run steps show what would have happened.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Booking ref or step"
              className="w-40 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-orange-400" />
            <select value={jobFilter} onChange={e => setJobFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1.5 text-xs text-gray-900 dark:text-white">
              <option value="all">All jobs</option>
              {jobs.map(j => <option key={j.name} value={j.name}>{j.title}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1.5 text-xs text-gray-900 dark:text-white">
              {['all', 'done', 'dry', 'failed', 'skipped', 'running'].map(s => <option key={s} value={s}>{s === 'all' ? 'Any status' : s}</option>)}
            </select>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{events.length ? 'Nothing matches.' : 'No steps yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-950/60 text-left">
                <tr>
                  {['When', 'Job', 'Booking', 'Step', 'Status', 'What happened'].map(h => <th key={h} className={`${eyebrow} px-4 py-2.5 whitespace-nowrap`}>{h}</th>)}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {shown.slice(0, 150).map(e => {
                  const info = Object.entries(e.detail || {}).filter(([k]) => k !== 'what' && k !== 'would').map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
                  return (
                    <tr key={e.id} className="align-top">
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{fmt(e.updated_at)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{titleOf(e.job)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs font-bold text-gray-900 dark:text-white">{e.entity_type === 'booking' ? ref(e.entity_id) : e.entity_id}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{e.step}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap"><Badge s={e.status} />{e.attempts > 1 && <span className="ml-1 text-[11px] text-gray-500">×{e.attempts}</span>}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 min-w-[16rem]">
                        {e.detail?.what || e.detail?.would || '—'}
                        {info && <span className="block mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{info}</span>}
                        {e.last_error && <span className="block mt-0.5 text-[11px] text-red-600 dark:text-red-400">{e.last_error}{e.next_attempt_at ? ` · next try ${fmt(e.next_attempt_at)}` : ''}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right" data-edit>
                        {e.status === 'failed' && canEdit && (
                          <button type="button" disabled={busy !== null} onClick={() => act(`retry-${e.id}`, () => retryJobEvent(e.id))}
                            className="rounded-lg border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent runs */}
      <details className={`${card} overflow-hidden`}>
        <summary className="px-5 py-4 cursor-pointer text-sm font-extrabold text-gray-900 dark:text-white">Recent runs ({runs.length})</summary>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
          {runs.map(r => (
            <li key={r.id} className="px-5 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-gray-500 dark:text-gray-400 w-28">{fmt(r.started_at)}</span>
              <span className="font-semibold text-gray-900 dark:text-white w-40">{titleOf(r.job)}</span>
              <Badge s={r.status} />
              <span className="text-gray-500 dark:text-gray-400">{r.trigger}{r.dry_run ? ' · dry run' : ''}</span>
              <span className="text-gray-600 dark:text-gray-300">{Object.entries(r.counts || {}).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing due'}</span>
              {r.error && <span className="text-red-600 dark:text-red-400">{r.error}</span>}
            </li>
          ))}
        </ul>
      </details>

      {/* Settings */}
      <section className={`${card} p-5`} data-edit>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Times are India time. Leave a field as it is to keep the default (shown in grey).</p>
        <form className="mt-4 space-y-6" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); act('settings', () => saveJobSettings(fd)); }}>
          {groups.map(g => (
            <fieldset key={g}>
              <legend className={eyebrow}>{g}</legend>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                {fields.filter(f => f.group === g).map(f => (
                  <label key={f.key} className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="min-w-0">{f.label}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <input name={f.key} defaultValue={String(settings[f.key])} placeholder={String(defaults[f.key])} disabled={!canEdit}
                        inputMode={typeof defaults[f.key] === 'number' ? 'numeric' : 'text'}
                        className="w-20 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1 text-right text-sm tabular-nums text-gray-900 dark:text-white outline-none focus:border-orange-400 disabled:opacity-60" />
                      <span className="w-16 text-[11px] text-gray-500 dark:text-gray-400">{f.unit}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="flex justify-end">
            <button type="submit" disabled={!canEdit || busy !== null} className="rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {busy === 'settings' ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
