'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import Icon from '../../../components/Icon';
import { deletePoc, makePrimary, requestPocChange, savePoc, type PocResult } from './actions';
import { formatPhone, initials, type LocationLite, type Person } from './contactShared';

const input = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-900 dark:disabled:text-gray-400';
const label = 'block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1';
const fileInput = 'w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 dark:file:bg-orange-900/30 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-orange-700 dark:file:text-orange-300 hover:file:bg-orange-100 disabled:opacity-50';

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
        className="relative my-6 w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 md:p-6 shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200">
          <Icon name="x" className="w-5 h-5" />
        </button>
        <h3 className="pr-8 text-lg font-extrabold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-1 pr-8 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<PocResult | null>(null);
  const run = (fn: () => Promise<PocResult>, after?: (message: string) => void) => {
    setResult(null);
    start(async () => {
      try {
        const r = await fn();
        setResult(r);
        if (r.ok) { router.refresh(); after?.(r.message); }
      } catch {
        setResult({ ok: false, error: 'Something went wrong. Please try again.' });
      }
    });
  };
  return { pending, result, setResult, run };
}

function ContactForm({ person, locations, approved, onClose, onDone }: { person?: Person; locations: LocationLite[]; approved: boolean; onClose: () => void; onDone: (msg: string) => void }) {
  const { pending, result, run } = useAction();
  const [picked, setPicked] = useState<string[]>(person?.locationIds ?? (locations.length === 1 ? [locations[0]!.id] : []));
  const locked = approved && !!person; // a live partner can't change a verified identity themselves
  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const unverifiedOnLive = !person?.verified && locations.some(l => l.live && picked.includes(l.id) && !person?.locationIds.includes(l.id));

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete('location_id');
    picked.forEach(id => fd.append('location_id', id));
    if (person) fd.set('poc_ids', person.ids.join(','));
    run(() => savePoc(fd), m => { onDone(m); onClose(); });
  };

  return (
    <Modal title={person ? `Edit ${person.name}` : 'Add a contact'} subtitle={person ? undefined : 'Someone customers can reach at your location. StashInn checks their ID before their locations go live.'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {locked && (
          <p className="rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/30 px-3 py-2 text-xs text-sky-800 dark:text-sky-300">
            Your account is live, so you can change the email and locations here. To change the name, phone or documents, close this and use <span className="font-bold">Request a change</span>.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="poc-name" className={label}>Full name</label>
            <input id="poc-name" name="name" required minLength={2} maxLength={80} defaultValue={person?.name} readOnly={locked} className={input} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="poc-phone" className={label}>Mobile number</label>
            <input id="poc-phone" name="phone" type="tel" inputMode="tel" required defaultValue={person?.phone} readOnly={locked} placeholder="98765 43210" className={input} autoComplete="tel" />
          </div>
          <div>
            <label htmlFor="poc-email" className={label}>Email <span className="font-normal text-gray-400">(optional)</span></label>
            <input id="poc-email" name="email" type="email" defaultValue={person?.email ?? ''} className={input} autoComplete="email" />
          </div>
        </div>

        <fieldset>
          <div className="flex items-center justify-between mb-1">
            <legend className={label + ' mb-0'}>Contact for</legend>
            {locations.length > 1 && (
              <button type="button" onClick={() => setPicked(picked.length === locations.length ? [] : locations.map(l => l.id))} className="text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">
                {picked.length === locations.length ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>
          {locations.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">You have no locations yet. You can assign this person once you add one.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {locations.map(l => (
                <label key={l.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  picked.includes(l.id) ? 'border-orange-400 bg-orange-50/60 dark:bg-orange-950/30 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'}`}>
                  <input type="checkbox" checked={picked.includes(l.id)} onChange={() => toggle(l.id)} className="accent-orange-600" />
                  <Icon name={l.type === 'garage' ? 'car' : 'bag'} className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{l.name}</span>
                  {l.live && <span className="ml-auto shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Live</span>}
                </label>
              ))}
            </div>
          )}
          {unverifiedOnLive && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">A live location stops showing in search while it has a contact who isn’t verified yet. It comes back once StashInn verifies them.</p>
          )}
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          <div>
            <label htmlFor="poc-id" className={label}>
              ID proof {person ? <span className="font-normal text-gray-400">(replace)</span> : null}
              {person?.idDocUrl && <a href={person.idDocUrl} target="_blank" rel="noreferrer" className="ml-1.5 font-semibold text-orange-700 dark:text-orange-400 hover:underline">View current</a>}
            </label>
            <input id="poc-id" type="file" name="poc_id_document" required={!person} disabled={locked} accept="application/pdf,image/jpeg,image/png,image/webp" className={fileInput} />
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Aadhaar, PAN, passport or driving licence. PDF or image, up to 5 MB.</p>
          </div>
          <div>
            <label htmlFor="poc-photo" className={label}>
              Photo {person ? <span className="font-normal text-gray-400">(replace)</span> : null}
              {person?.photoUrl && <a href={person.photoUrl} target="_blank" rel="noreferrer" className="ml-1.5 font-semibold text-orange-700 dark:text-orange-400 hover:underline">View current</a>}
            </label>
            <input id="poc-photo" type="file" name="poc_photo" required={!person} disabled={locked} accept="image/jpeg,image/png,image/webp" className={fileInput} />
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">A clear photo of their face. JPG, PNG or WebP, up to 5 MB.</p>
          </div>
        </div>
        {person && !locked && person.verified && (
          <p className="text-xs text-amber-700 dark:text-amber-400">Changing the name, phone or documents means StashInn verifies this person again.</p>
        )}

        {result && !result.ok && <p role="alert" className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-400">{result.error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
          <button type="submit" disabled={pending} className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm disabled:opacity-50">
            {pending ? 'Saving…' : person ? 'Save changes' : 'Add contact'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RequestForm({ person, onClose, onDone }: { person: Person; onClose: () => void; onDone: (msg: string) => void }) {
  const { pending, result, run } = useAction();
  const [kind, setKind] = useState<'change' | 'remove'>('change');
  return (
    <Modal title={`Request a change for ${person.name}`} subtitle="Your account is live, so StashInn checks changes to a verified contact before they apply. This keeps your locations bookable meanwhile." onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('poc_ids', person.ids.join(',')); fd.set('kind', kind); run(() => requestPocChange(fd), m => { onDone(m); onClose(); }); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['change', 'remove'] as const).map(k => (
            <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${kind === k ? 'border-orange-400 bg-orange-50/60 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}>
              {k === 'change' ? 'Update details' : 'Remove this person'}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="req-desc" className={label}>{kind === 'change' ? 'What should change?' : 'Why are they leaving, and who replaces them?'}</label>
          <textarea id="req-desc" name="description" required minLength={10} maxLength={1000} rows={4} className={input}
            placeholder={kind === 'change' ? `E.g. ${person.name}'s new number is 98xxxxxx10` : 'E.g. They no longer work here. Priya (already added) takes over.'} />
        </div>
        {result && !result.ok && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">{result.error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
          <button type="submit" disabled={pending} className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold disabled:opacity-50">{pending ? 'Sending…' : 'Send request'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function AddContactButton({ locations, approved }: { locations: LocationLite[]; approved: boolean }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      <button type="button" onClick={() => { setOpen(true); setDone(null); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm transition-colors">
        <Icon name="plus" className="w-4 h-4" /> Add contact
      </button>
      {done && <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{done}</p>}
      {open && <ContactForm locations={locations} approved={approved} onClose={() => setOpen(false)} onDone={m => setDone(m)} />}
    </div>
  );
}

export function ContactCard({ person, locations, approved }: { person: Person; locations: LocationLite[]; approved: boolean }) {
  const [modal, setModal] = useState<'edit' | 'request' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { pending, result, run } = useAction();
  const byId = new Map(locations.map(l => [l.id, l]));
  const assigned = person.locationIds.map(id => byId.get(id)).filter(Boolean) as LocationLite[];
  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50';

  return (
    <article className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        {person.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-gray-200 dark:border-gray-800" />
        ) : (
          <span className="h-14 w-14 shrink-0 rounded-2xl bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 flex items-center justify-center text-lg font-black">{initials(person.name)}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white truncate">{person.name}</h3>
            {person.isPrimary && <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60">Primary</span>}
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${person.verified
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'}`}>
              {person.verified ? 'Verified' : 'Awaiting verification'}
            </span>
          </div>
          <div className="mt-1.5 space-y-1 text-sm">
            <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-400"><Icon name="phone" className="w-4 h-4 text-gray-400" />{formatPhone(person.phone)}</a>
            {person.email
              ? <a href={`mailto:${person.email}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-400 break-all"><Icon name="mail" className="w-4 h-4 shrink-0 text-gray-400" />{person.email}</a>
              : <p className="flex items-center gap-2 text-gray-400 dark:text-gray-500"><Icon name="mail" className="w-4 h-4" />No email</p>}
          </div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Contact for</p>
        {assigned.length ? (
          <div className="flex flex-wrap gap-1.5">
            {assigned.map(l => (
              <span key={l.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Icon name={l.type === 'garage' ? 'car' : 'bag'} className="w-3.5 h-3.5 text-gray-400" />{l.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-400">Not assigned to any location yet.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {person.idDocUrl ? <a href={person.idDocUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-orange-700 dark:text-orange-400 hover:underline"><Icon name="lock" className="w-3.5 h-3.5" />ID proof</a> : <span className="text-red-600 dark:text-red-400 font-semibold">No ID proof</span>}
          {!person.photoUrl && <span className="text-red-600 dark:text-red-400 font-semibold">No photo</span>}
          {person.openRequest && <span className="inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-400"><Icon name="clock" className="w-3.5 h-3.5" />{person.openRequest}</span>}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/30 px-4 py-3">
        <button type="button" onClick={() => setModal('edit')} className={`${btn} border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800`}><Icon name="pencil" className="w-3.5 h-3.5" />Edit</button>
        {approved && (
          <button type="button" onClick={() => setModal('request')} disabled={!!person.openRequest} className={`${btn} border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800`}>Request a change</button>
        )}
        {!person.isPrimary && (
          <button type="button" disabled={pending} onClick={() => run(() => makePrimary(person.ids.join(',')), m => setNotice(m))} className={`${btn} text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800`}>Make primary</button>
        )}
        {!approved && !person.isPrimary && (
          confirmRemove ? (
            <span className="ml-auto inline-flex items-center gap-1.5">
              <span className="text-xs text-gray-600 dark:text-gray-300">Remove {person.name.split(' ')[0]}?</span>
              <button type="button" disabled={pending} onClick={() => run(() => deletePoc(person.ids.join(',')))} className={`${btn} bg-red-600 hover:bg-red-500 text-white`}>{pending ? 'Removing…' : 'Remove'}</button>
              <button type="button" onClick={() => setConfirmRemove(false)} className={`${btn} text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800`}>Keep</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className={`${btn} ml-auto text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40`}><Icon name="trash" className="w-3.5 h-3.5" />Remove</button>
          )
        )}
      </div>
      {(result && !result.ok) && <p role="alert" className="px-4 pb-3 text-xs font-semibold text-red-600 dark:text-red-400">{result.error}</p>}
      {notice && <p role="status" className="px-4 pb-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">{notice}</p>}

      {modal === 'edit' && <ContactForm person={person} locations={locations} approved={approved} onClose={() => setModal(null)} onDone={m => setNotice(m)} />}
      {modal === 'request' && <RequestForm person={person} onClose={() => setModal(null)} onDone={m => setNotice(m)} />}
    </article>
  );
}
