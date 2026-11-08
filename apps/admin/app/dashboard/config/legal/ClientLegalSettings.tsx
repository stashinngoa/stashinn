'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { LegalDocument } from '@repo/ui/legalDocument';
import {
  LEGAL_DOCS,
  LEGAL_FIELD_GROUPS,
  LEGAL_LIVE_FIELDS,
  fillLegal,
  formatLegalDate,
  legalDefaultText,
  legalOutline,
  missingLegalValues,
  parseLegal,
  type LegalDetails,
  type LegalDocKey,
} from '@stashinn/lib/services/legal';
import { saveLegal } from '../actions';

type DocState = { text: string; updatedAt: string | null; isDraft: boolean };
type Section = LegalDocKey | 'details';
type Mode = 'write' | 'preview' | 'split';

const FORMAT_HELP: [string, string][] = [
  ['## Heading', 'Section heading'],
  ['### Heading', 'Sub-heading'],
  ['**bold**', 'Bold text'],
  ['- item', 'Bullet list'],
  ['1. item', 'Numbered list'],
  ['> text', 'Highlighted note'],
  ['| a | b |', 'Table row (first row is the header; add |---|---| under it)'],
  ['{{legal_name}}', 'Business detail, filled in when shown'],
];

const Icon = ({ d, className = 'w-4 h-4' }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
);
const ICONS = {
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  restore: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  check: 'M5 13l4 4L19 7',
  print: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
};

export default function ClientLegalSettings({
  docs: initialDocs,
  details: initialDetails,
  live,
  detailsUpdatedAt: initialDetailsUpdatedAt,
  canEdit,
}: {
  docs: Record<LegalDocKey, DocState>;
  details: LegalDetails;
  live: Record<string, string>;
  detailsUpdatedAt: string | null;
  canEdit: boolean;
}) {
  const [saved, setSaved] = useState(initialDocs);
  const [texts, setTexts] = useState<Record<LegalDocKey, string>>(() => Object.fromEntries(LEGAL_DOCS.map(d => [d.key, initialDocs[d.key].text])) as Record<LegalDocKey, string>);
  const [savedDetails, setSavedDetails] = useState(initialDetails);
  const [details, setDetails] = useState(initialDetails);
  const [detailsUpdatedAt, setDetailsUpdatedAt] = useState(initialDetailsUpdatedAt);
  const [section, setSection] = useState<Section>('partner_terms_and_conditions');
  const [mode, setMode] = useState<Mode>(canEdit ? 'split' : 'preview');
  const [showHelp, setShowHelp] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startSaving] = useTransition();

  // Unsaved = text differs from what's stored, or a draft that has never been saved
  const docDirty = (key: LegalDocKey) => texts[key] !== saved[key].text || saved[key].isDraft;
  const detailsDirty = JSON.stringify(details) !== JSON.stringify(savedDetails);
  const dirtyDocs = LEGAL_DOCS.filter(d => docDirty(d.key));
  const editedCount = LEGAL_DOCS.filter(d => texts[d.key] !== saved[d.key].text).length + (detailsDirty ? 1 : 0);
  const anyUnsaved = dirtyDocs.length > 0 || detailsDirty;

  const ctx = useMemo(() => ({ details, live }), [details, live]);
  const missingFor = (key: LegalDocKey) => missingLegalValues(texts[key], ctx, saved[key].updatedAt);
  const allMissing = useMemo(() => {
    const seen = new Map<string, string>();
    LEGAL_DOCS.forEach(d => missingLegalValues(texts[d.key], ctx).forEach(m => seen.set(m.key, m.label)));
    return [...seen].map(([key, label]) => ({ key, label }));
  }, [texts, ctx]);

  // Warn before leaving with edits that haven't been saved
  useEffect(() => {
    const hasEdits = editedCount > 0;
    const warn = (e: BeforeUnloadEvent) => { if (hasEdits) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editedCount]);

  const save = () => {
    if (!canEdit || pending || !anyUnsaved) return;
    setStatus(null);
    startSaving(async () => {
      const res = await saveLegal({
        docs: Object.fromEntries(dirtyDocs.map(d => [d.key, texts[d.key]])),
        details: detailsDirty ? details : undefined,
      });
      if (!res.ok) return setStatus({ ok: false, text: res.error });
      const at = res.savedAt ?? new Date().toISOString();
      setSaved(prev => {
        const next = { ...prev };
        dirtyDocs.forEach(d => { next[d.key] = { text: texts[d.key], updatedAt: at, isDraft: false }; });
        return next;
      });
      if (detailsDirty) { setSavedDetails(details); setDetailsUpdatedAt(at); }
      setStatus({ ok: true, text: 'All changes saved.' });
    });
  };

  // Ctrl/Cmd + S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const discard = () => {
    setTexts(Object.fromEntries(LEGAL_DOCS.map(d => [d.key, saved[d.key].text])) as Record<LegalDocKey, string>);
    setDetails(savedDetails);
    setStatus(null);
  };

  const doc = section === 'details' ? null : LEGAL_DOCS.find(d => d.key === section)!;

  return (
    <div className="space-y-4">
      {/* Status strip: draft notice, save state and actions (not floating) */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="mt-0.5 text-amber-600 dark:text-amber-400"><Icon d={ICONS.warning} className="w-5 h-5" /></span>
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Draft based on StashInn&apos;s legal research. Have a lawyer review it before launch.</p>
            <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              {allMissing.length
                ? <>{allMissing.length} business detail{allMissing.length === 1 ? ' is' : 's are'} still blank and show{allMissing.length === 1 ? 's' : ''} highlighted to readers. <button type="button" onClick={() => setSection('details')} className="font-semibold underline underline-offset-2">Fill them in</button></>
                : 'All business details are filled in.'}
            </p>
          </div>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2 shrink-0">
            {status && (
              <span role="status" className={`text-xs font-semibold ${status.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{status.text}</span>
            )}
            {editedCount > 0 && (
              <button type="button" onClick={discard} disabled={pending} className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-800 disabled:opacity-50">
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!anyUnsaved || pending}
              title="Ctrl + S"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? 'Saving…' : anyUnsaved ? `Save${dirtyDocs.length + (detailsDirty ? 1 : 0) > 1 ? ' all' : ''}` : <><Icon d={ICONS.check} /> Saved</>}
            </button>
          </div>
        ) : (
          <span className="shrink-0 text-xs font-semibold text-amber-800 dark:text-amber-300">View only: superadmins can edit</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] gap-4 items-start">
        {/* Navigation */}
        <nav aria-label="Legal documents" className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 lg:sticky lg:top-4">
          {(['partner', 'customer'] as const).map(audience => (
            <div key={audience} className="contents lg:block lg:space-y-1.5">
              <p className="hidden lg:block px-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{audience === 'partner' ? 'Partners' : 'Customers'}</p>
              {LEGAL_DOCS.filter(d => d.audience === audience).map(d => (
                <NavItem
                  key={d.key}
                  active={section === d.key}
                  onClick={() => setSection(d.key)}
                  icon={d.key.includes('privacy') ? ICONS.shield : ICONS.doc}
                  title={d.title}
                  sub={texts[d.key] !== saved[d.key].text ? 'Unsaved changes' : saved[d.key].isDraft ? 'Draft, not saved yet' : `Saved ${formatLegalDate(saved[d.key].updatedAt)}`}
                  tone={texts[d.key] !== saved[d.key].text || saved[d.key].isDraft ? 'amber' : 'muted'}
                  badge={missingFor(d.key).length || undefined}
                />
              ))}
            </div>
          ))}
          <div className="contents lg:block lg:space-y-1.5">
            <p className="hidden lg:block px-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Shared</p>
            <NavItem
              active={section === 'details'}
              onClick={() => setSection('details')}
              icon={ICONS.building}
              title="Business details"
              sub={detailsDirty ? 'Unsaved changes' : detailsUpdatedAt ? `Saved ${formatLegalDate(detailsUpdatedAt)}` : 'Not saved yet'}
              tone={detailsDirty ? 'amber' : 'muted'}
              badge={allMissing.filter(m => m.key !== 'last_updated').length || undefined}
            />
          </div>
        </nav>

        {/* Workspace */}
        <section className="min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none">
          {doc ? (
            <>
              <header className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-extrabold text-gray-900 dark:text-white truncate">{doc.title}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Shown in: {doc.usedIn}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div role="tablist" aria-label="View" className="inline-flex p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                    {(['write', 'split', 'preview'] as Mode[]).filter(m => canEdit || m === 'preview').map(m => (
                      <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={mode === m}
                        onClick={() => setMode(m)}
                        className={`${m === 'split' ? 'hidden xl:inline-flex' : 'inline-flex'} px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${mode === m ? 'bg-white dark:bg-gray-950 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                      >
                        {m === 'write' ? 'Write' : m === 'split' ? 'Side by side' : 'Preview'}
                      </button>
                    ))}
                  </div>
                  {canEdit && (
                    <>
                      <IconButton label="Formatting help" active={showHelp} onClick={() => setShowHelp(v => !v)} d={ICONS.help} />
                      <IconButton
                        label="Restore StashInn draft"
                        onClick={() => {
                          if (texts[doc.key] === legalDefaultText(doc.key)) return;
                          if (confirm(`Replace the ${doc.title} text with the StashInn draft? Your edits stay unsaved until you press Save.`)) {
                            setTexts(t => ({ ...t, [doc.key]: legalDefaultText(doc.key) }));
                          }
                        }}
                        d={ICONS.restore}
                      />
                    </>
                  )}
                </div>
              </header>

              {showHelp && canEdit && (
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    {FORMAT_HELP.map(([code, what]) => (
                      <div key={code} className="flex items-baseline gap-3">
                        <dt><code className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">{code}</code></dt>
                        <dd className="text-gray-500 dark:text-gray-400">{what}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <MissingBar missing={missingFor(doc.key)} onFill={() => setSection('details')} />

              <div className={`grid ${mode === 'split' ? 'xl:grid-cols-2 xl:divide-x divide-gray-200 dark:divide-gray-800' : 'grid-cols-1'}`}>
                {mode !== 'preview' && canEdit && (
                  <div className="flex flex-col">
                    <textarea
                      aria-label={`${doc.title} text`}
                      value={texts[doc.key]}
                      onChange={e => setTexts(t => ({ ...t, [doc.key]: e.target.value }))}
                      spellCheck
                      className="w-full h-[68vh] min-h-[420px] px-5 py-4 bg-transparent text-[13px] leading-6 font-mono text-gray-800 dark:text-gray-200 resize-none outline-none focus:bg-orange-50/30 dark:focus:bg-orange-500/5"
                    />
                    <p className="px-5 py-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 dark:text-gray-500">
                      {texts[doc.key].trim().split(/\s+/).filter(Boolean).length.toLocaleString('en-IN')} words · Placeholders like {'{{legal_name}}'} come from Business details
                    </p>
                  </div>
                )}
                {(mode !== 'write' || !canEdit) && (
                  <Preview text={fillLegal(texts[doc.key], ctx, texts[doc.key] !== saved[doc.key].text ? null : saved[doc.key].updatedAt)} tall={mode === 'split'} />
                )}
              </div>
            </>
          ) : (
            <DetailsForm details={details} setDetails={setDetails} live={live} canEdit={canEdit} missing={new Set(allMissing.map(m => m.key))} />
          )}
        </section>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, title, sub, tone, badge }: { active: boolean; onClick: () => void; icon: string; title: string; sub: string; tone: 'amber' | 'muted'; badge?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`shrink-0 w-60 lg:w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${active
        ? 'bg-white dark:bg-gray-900 border-orange-300 dark:border-orange-600/60 shadow-sm ring-1 ring-orange-200 dark:ring-orange-700/40'
        : 'bg-white/60 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'}`}
    >
      <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${active ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
        <Icon d={icon} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{title}</span>
        <span className={`block text-xs mt-0.5 truncate ${tone === 'amber' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{sub}</span>
      </span>
      {badge ? (
        <span title={`${badge} blank business detail${badge === 1 ? '' : 's'}`} className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[11px] font-bold flex items-center justify-center">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function IconButton({ label, onClick, d, active }: { label: string; onClick: () => void; d: string; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${active
        ? 'border-orange-300 dark:border-orange-600/60 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-600/60'}`}
    >
      <Icon d={d} />
    </button>
  );
}

function MissingBar({ missing, onFill }: { missing: { key: string; label: string }[]; onFill: () => void }) {
  if (!missing.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-amber-50/60 dark:bg-amber-950/20 text-xs">
      <span className="font-semibold text-amber-800 dark:text-amber-300">Blank in this document:</span>
      {missing.map(m => (
        <span key={m.key} className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">{m.label}</span>
      ))}
      <button type="button" onClick={onFill} className="ml-auto font-bold text-orange-600 dark:text-orange-400 hover:underline">Fill in business details</button>
    </div>
  );
}

function Preview({ text, tall }: { text: string; tall: boolean }) {
  const outline = useMemo(() => legalOutline(parseLegal(text)), [text]);
  return (
    <div className={`overflow-y-auto ${tall ? 'h-[calc(68vh+33px)] min-h-[453px]' : ''}`}>
      {outline.length > 3 && (
        <details className="mx-5 mt-4 rounded-xl border border-gray-200 dark:border-gray-800 text-sm group">
          <summary className="cursor-pointer select-none px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300 list-none flex items-center justify-between">
            Contents · {outline.length} sections
            <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <ol className="px-4 pb-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
            {outline.map(o => (
              <li key={o.id}><a href={`#${o.id}`} className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">{o.title}</a></li>
            ))}
          </ol>
        </details>
      )}
      <article className="px-5 sm:px-8 py-6 max-w-3xl">
        <LegalDocument text={text} />
      </article>
    </div>
  );
}

function DetailsForm({ details, setDetails, live, canEdit, missing }: {
  details: LegalDetails;
  setDetails: (fn: (d: LegalDetails) => LegalDetails) => void;
  live: Record<string, string>;
  canEdit: boolean;
  missing: Set<string>;
}) {
  const input = 'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500';
  return (
    <div>
      <header className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Business details</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Filled into every document wherever its {'{{placeholder}}'} appears. Blank ones show highlighted to readers.</p>
      </header>
      <div className="p-5 space-y-8">
        {LEGAL_FIELD_GROUPS.map(group => (
          <fieldset key={group.title} disabled={!canEdit}>
            <legend className="text-sm font-extrabold text-gray-900 dark:text-white mb-3">{group.title}</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.fields.map(f => {
                const blank = missing.has(f.key) && !details[f.key]?.trim();
                const id = `legal-${f.key}`;
                const props = {
                  id,
                  value: details[f.key] ?? '',
                  placeholder: f.placeholder,
                  onChange: (e: { target: { value: string } }) => setDetails(d => ({ ...d, [f.key]: e.target.value })),
                  className: `${input} ${blank ? 'border-amber-300 dark:border-amber-700/60' : 'border-gray-300 dark:border-gray-700'}`,
                };
                return (
                  <div key={f.key} className={f.multiline ? 'md:col-span-2' : ''}>
                    <label htmlFor={id} className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
                      {f.label}
                      <code className="font-normal text-[10px] text-gray-400 dark:text-gray-500">{`{{${f.key}}}`}</code>
                      {blank && <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Used, blank</span>}
                    </label>
                    {f.multiline ? <textarea rows={2} {...props} /> : <input type="text" {...props} />}
                    {f.hint && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{f.hint}</p>}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div>
          <p className="text-sm font-extrabold text-gray-900 dark:text-white mb-1">From platform settings</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">These follow the live configuration, so the documents stay in step when it changes.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LEGAL_LIVE_FIELDS.map(f => (
              <div key={f.key} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 text-xs">
                <span className="text-gray-600 dark:text-gray-400">{f.label} <code className="text-[10px] text-gray-400 dark:text-gray-500">{`{{${f.key}}}`}</code></span>
                <span className="font-bold text-gray-900 dark:text-white">{f.key === 'last_updated' ? 'Automatic' : live[f.key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
