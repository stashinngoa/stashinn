'use client';

import { useEffect, useState } from 'react';
import LocationScoringEngine from '../LocationScoringEngine';
import type { Amenity } from '@stashinn/lib/services/amenities';
import { isLocationPriced } from '@stashinn/lib/services/bookingAvailability';
import { PARTNER_STATUSES } from '../partnerStatus';
import { CopyButton, Icon, IconButton, PhotoPlaceholder, PrimaryBadge, StatusPill, SubmitButton, inr, isImageUrl, vehiclePricing, type IconName } from './ui';

export type Contact = { key: string; poc: any; ids: string[]; locationIds: string[]; verified: boolean };

const label = 'text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';
const input = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500';
const panel = 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 p-4';

const PAUSE_REASON_LABELS: Record<string, string> = {
  maintenance: 'Maintenance or repairs', renovation: 'Renovation', holiday: 'Holiday / closed', staff: 'Staff unavailable', event: 'Private event', other: 'Other',
};
const fmtPause = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

/** "Paused until …" (or "Pause planned") for a location's current / upcoming booking pauses. */
export function PauseChip({ pauses }: { pauses: any[] }) {
  if (!pauses.length) return null;
  const now = new Date();
  const current = pauses.find(p => new Date(p.starts_at) <= now && new Date(p.ends_at) > now);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60">
      <Icon name="clock" className="w-3.5 h-3.5" />
      {current ? `Paused until ${fmtPause(current.ends_at)}` : `Pause planned ${fmtPause(pauses[0].starts_at)}`}
    </span>
  );
}

const VERIFIED = { label: 'Verified', dot: 'bg-emerald-500', badge: PARTNER_STATUSES.approved.badge };
const NOT_VERIFIED = { label: 'Not verified', dot: 'bg-amber-500', badge: PARTNER_STATUSES.pending.badge };

// `height` fixes the window size (e.g. so switching tabs doesn't make it jump); otherwise it fits its content
function Modal({ size, height, onClose, children, labelledBy }: { size: string; height?: string; onClose: () => void; children: React.ReactNode; labelledBy: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${size} ${height ?? 'max-h-[92vh]'} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[modal-in_.18s_ease-out]`}>
        {children}
      </div>
    </div>
  );
}

function Avatar({ poc, size }: { poc: any; size: string }) {
  return poc.signed_photo_url ? (
    <img src={poc.signed_photo_url} alt="" className={`${size} shrink-0 rounded-full object-cover border border-gray-200 dark:border-gray-700`} />
  ) : (
    <div className={`${size} shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500`}>{poc.name.charAt(0)}</div>
  );
}

function Fact({ icon, title, value, sub }: { icon: IconName; title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3.5">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Icon name={icon} className="w-4 h-4" />
        <span className={label}>{title}</span>
      </div>
      <p className="mt-1.5 font-extrabold text-gray-900 dark:text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Location ────────────────────────────────────────────────────────────────

type LocationModalProps = {
  loc: any;
  partner: any;
  contacts: Contact[];
  primary: boolean;
  status: { label: string; dot: string; badge: string };
  actions: React.ReactNode;
  scoringRules?: any;
  pauses?: any[];
  amenities?: Amenity[];
  initialTab?: 'pricing';
  busy: boolean;
  onPin: (fd: FormData) => void;
  onCommission: (fd: FormData) => void;
  onToast: (ok: boolean, text: string) => void;
  onOpenContact: (key: string) => void;
  onClose: () => void;
};

export function LocationModal({ loc, partner, contacts, primary, status, actions, scoringRules, pauses = [], amenities: amenityCatalog, initialTab, busy, onPin, onCommission, onToast, onOpenContact, onClose }: LocationModalProps) {
  const [tab, setTab] = useState<'overview' | 'pricing' | 'contact'>(initialTab ?? 'overview');
  const [photo, setPhoto] = useState(0);
  useEffect(() => { setTab(initialTab ?? 'overview'); setPhoto(0); }, [loc.id, initialTab]);

  const photos: string[] = loc.photos || [];
  const isGarage = loc.location_type === 'garage';
  const vp = vehiclePricing(loc);
  const commission = loc.commission_rate ?? partner.commission_rate ?? 15;
  const amenities: string[] = [
    ...(loc.amenities || []).map((a: string) => a.replace(/_/g, ' ')),
    ...(loc.has_cctv ? ['CCTV'] : []), ...(loc.has_security_guard ? ['Security guard'] : []),
    ...(loc.has_ev_charging ? ['EV charging'] : []), ...(loc.has_lockable_gate ? ['Lockable gate'] : []),
  ];
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'pin' },
    { id: 'pricing', label: 'Pricing & score', icon: 'chart' },
    { id: 'contact', label: `Contact${contacts.length ? ` (${contacts.length})` : ''}`, icon: 'user', warn: !contacts.some(c => c.verified) },
  ] as const;

  return (
    <Modal size="max-w-4xl" height="h-[min(860px,92vh)]" onClose={onClose} labelledBy="location-modal-title">
      {/* Photo header */}
      <div className="relative h-56 sm:h-72 shrink-0 bg-gray-100 dark:bg-gray-800">
        {photos.length ? (
          <img src={photos[photo]} alt={`${loc.name} photo ${photo + 1}`} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <PhotoPlaceholder garage={isGarage} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur p-1 shadow-lg">
          {photos.length > 0 && <IconButton icon="external" label="Open photo full size" href={photos[photo]} />}
          {actions}
          <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className={`min-w-0 flex-1 ${busy ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap items-center gap-2">
              <PrimaryBadge primary={primary} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-200">
                <Icon name={isGarage ? 'car' : 'bag'} className="w-3.5 h-3.5" />{isGarage ? 'Vehicle parking' : 'Luggage storage'}
              </span>
              <StatusPill {...status} />
            </div>
            <h2 id="location-modal-title" className="mt-2 text-2xl font-extrabold text-white drop-shadow truncate">{loc.name}</h2>
            <p className="text-sm text-white/80 truncate">{[loc.address_line1, loc.city, loc.pincode].filter(Boolean).join(', ')}</p>
          </div>
          {photos.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto max-w-full sm:max-w-[45%] pb-0.5">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhoto(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className={`h-11 w-14 shrink-0 rounded-lg overflow-hidden border-2 transition ${i === photo ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 px-4 border-b border-gray-200 dark:border-gray-800 overflow-x-auto" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative inline-flex items-center gap-2 px-3 py-3 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon name={t.icon} />
            {t.label}
            {'warn' in t && t.warn && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-label="needs attention" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {loc.status_reason && loc.admin_status !== 'approved' && (
          <p className="flex gap-2 text-sm text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 rounded-2xl p-3.5">
            <Icon name="info" className="w-4 h-4 shrink-0 mt-0.5" />
            <span><span className="font-bold">Note to partner:</span> {loc.status_reason}</span>
          </p>
        )}

        {tab === 'overview' && (
          <>
            {pauses.length > 0 && (
              <div className="rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4">
                <p className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200"><Icon name="clock" className="w-4 h-4" />Booking pauses set by the partner</p>
                <ul className="mt-2 space-y-1.5">
                  {pauses.map(p => (
                    <li key={p.id} className="text-sm text-amber-900 dark:text-amber-100">
                      <span className="font-semibold">{fmtPause(p.starts_at)} → {fmtPause(p.ends_at)}</span>
                      {new Date(p.starts_at) <= new Date() && <span className="ml-2 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">NOW</span>}
                      <span className="block text-xs text-amber-800 dark:text-amber-300">{PAUSE_REASON_LABELS[p.reason] ?? p.reason}{p.details ? ` · ${p.details}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Fact icon={isGarage ? 'car' : 'bag'} title="Capacity" value={isGarage ? `${vp?.bike_capacity ?? 0} bikes` : `${loc.max_bags} bags`} sub={isGarage ? `${vp?.sedan_capacity ?? 0} cars · ${vp?.suv_capacity ?? 0} SUV-size (cars can use)` : undefined} />
              <Fact icon="chart" title="Rate / hr" value={isGarage ? inr(vp?.bike_rate_hr) : inr(loc.price_per_hour)} sub={isGarage ? `${inr(vp?.sedan_rate_hr)} per car` : undefined} />
              <Fact icon="clock" title="Hours" value={loc.operating_hours?.open && loc.operating_hours?.close ? `${loc.operating_hours.open} – ${loc.operating_hours.close}` : 'Not set'} />
              <Fact icon="percent" title="Commission" value={`${commission}%`} sub="Platform fee" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className={panel}>
                  <p className={label}>Address</p>
                  <p className="mt-1.5 text-sm text-gray-900 dark:text-white leading-relaxed">
                    {[loc.address_line1, loc.address_line2].filter(Boolean).join(', ')}<br />
                    {loc.city}, {loc.state} {loc.pincode}
                  </p>
                </div>
                <div className={panel}>
                  <p className={label}>Amenities</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {amenities.length ? amenities.map(a => (
                      <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                        <Icon name="check" className="w-3 h-3 text-emerald-500" />{a}
                      </span>
                    )) : <span className="text-sm text-gray-500 dark:text-gray-400">None listed</span>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                <div className="h-56 md:h-auto md:flex-1 md:min-h-[14rem] bg-gray-100 dark:bg-gray-800">
                  <iframe title="Location map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={`https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=15&output=embed`} />
                </div>
                <details className="group border-t border-gray-200 dark:border-gray-800">
                  <summary className="flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer list-none text-sm">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}</span>
                    <span className="flex items-center gap-3">
                      <a href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">
                        Maps <Icon name="external" className="w-3 h-3" />
                      </a>
                      <span data-edit className="text-xs font-bold text-gray-600 dark:text-gray-300 group-open:text-orange-600 dark:group-open:text-orange-400">Adjust pin</span>
                    </span>
                  </summary>
                  <form data-edit key={`${loc.id}-${loc.latitude}-${loc.longitude}`} action={onPin} className="flex items-center gap-2 px-4 pb-3">
                    <input type="hidden" name="location_id" value={loc.id} />
                    <input type="hidden" name="partner_id" value={partner.id} />
                    <input type="number" step="any" name="latitude" defaultValue={loc.latitude} aria-label="Latitude" placeholder="Latitude" required className={input} />
                    <input type="number" step="any" name="longitude" defaultValue={loc.longitude} aria-label="Longitude" placeholder="Longitude" required className={input} />
                    <SubmitButton defaultText="Save" loadingText="…" className="shrink-0 px-3 py-2 text-sm font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60" />
                  </form>
                </details>
              </div>
            </div>
          </>
        )}

        {tab === 'pricing' && (
          <>
            {!isLocationPriced(loc) && (
              <p className="flex gap-2 text-sm text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-3.5">
                <Icon name="info" className="w-4 h-4 shrink-0 mt-0.5" />
                <span><span className="font-bold">This location has no rates yet.</span> Apply its score below. It can&apos;t be approved or booked until then.</span>
              </p>
            )}
            <div className={`${panel} flex flex-col sm:flex-row sm:items-center gap-4`}>
              <div className="flex-1">
                <p className={label}>Commission for this location</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">StashInn keeps <span className="font-bold text-gray-900 dark:text-white">{commission}%</span> of each booking here; the partner gets the rest.</p>
              </div>
              <form data-edit key={`${loc.id}-${loc.commission_rate}`} action={onCommission} className="flex items-center gap-2">
                <div className="relative w-28">
                  <input type="number" name="commission_rate" defaultValue={commission} step="0.01" min="0" max="100" aria-label="Commission rate" className={`${input} pr-7`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">%</span>
                </div>
                <SubmitButton defaultText="Save" loadingText="Saving…" className="px-4 py-2 text-sm font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60" />
              </form>
            </div>
            {scoringRules ? (
              <div data-edit><LocationScoringEngine location={loc} partner={partner} rules={scoringRules} amenities={amenityCatalog} onResult={onToast} /></div>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400">Scoring rules aren&apos;t configured, so rates can&apos;t be calculated.</p>
            )}
          </>
        )}

        {tab === 'contact' && (
          contacts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-gray-900 dark:text-white">No contact assigned</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">A location needs a verified contact before it can go live.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {contacts.map(c => (
                <button key={c.key} type="button" onClick={() => onOpenContact(c.key)} className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700/60 text-left transition-colors">
                  <Avatar poc={c.poc} size="h-12 w-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-700 dark:group-hover:text-orange-400">{c.poc.name}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{c.poc.phone}</span>
                    <span className="mt-1.5 block"><StatusPill {...(c.verified ? VERIFIED : NOT_VERIFIED)} /></span>
                  </span>
                  <Icon name="chevron" className="w-4 h-4 text-gray-400 group-hover:text-orange-500" />
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </Modal>
  );
}

// ─── Contact ─────────────────────────────────────────────────────────────────

type ContactModalProps = {
  contact: Contact;
  locations: any[];
  busy: boolean;
  onToggleVerified: () => void;
  onOpenLocation: (id: string) => void;
  onClose: () => void;
};

export function ContactModal({ contact, locations, busy, onToggleVerified, onOpenLocation, onClose }: ContactModalProps) {
  const { poc, verified } = contact;
  const idUrl: string | null = poc.signed_id_doc_url;

  return (
    <Modal size="max-w-3xl" onClose={onClose} labelledBy="contact-modal-title">
      {/* Header */}
      <div className="shrink-0 p-5 flex items-start gap-4 border-b border-gray-100 dark:border-gray-800">
        <Avatar poc={poc} size="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <p className={label}>Point of contact</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <h2 id="contact-modal-title" className="text-xl font-extrabold text-gray-900 dark:text-white truncate">{poc.name}</h2>
            <StatusPill {...(verified ? VERIFIED : NOT_VERIFIED)} />
          </div>
          <div className="flex flex-wrap gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300">
              <Icon name="phone" className="w-3.5 h-3.5 text-gray-400" />
              <a href={`tel:${poc.phone}`} className="hover:text-orange-600 dark:hover:text-orange-400">{poc.phone}</a>
              <CopyButton value={poc.phone} label="phone" />
            </span>
            {poc.email && (
              <span className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 max-w-full">
                <Icon name="mail" className="w-3.5 h-3.5 text-gray-400" />
                <a href={`mailto:${poc.email}`} className="truncate hover:text-orange-600 dark:hover:text-orange-400">{poc.email}</a>
                <CopyButton value={poc.email} label="email" />
              </span>
            )}
          </div>
        </div>
        <IconButton icon="x" label="Close" onClick={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Photo and ID side by side for comparison */}
        <div>
          <p className={label}>Compare photo with ID proof</p>
          <div className="mt-2 grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
            <figure className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                {poc.signed_photo_url ? (
                  <img src={poc.signed_photo_url} alt={`${poc.name} photo`} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400"><Icon name="user" className="w-10 h-10" /><span className="text-xs font-bold">No photo</span></div>
                )}
              </div>
              <figcaption className="flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                Photo
                {poc.signed_photo_url && <a href={poc.signed_photo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 hover:underline">Open <Icon name="external" className="w-3 h-3" /></a>}
              </figcaption>
            </figure>
            <figure className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
              <div className="relative flex-1 min-h-[16rem] bg-gray-100 dark:bg-gray-800">
                {!idUrl ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400"><Icon name="doc" className="w-10 h-10" /><span className="text-xs font-bold">No ID proof uploaded</span></div>
                ) : isImageUrl(idUrl) ? (
                  <img src={idUrl} alt="ID proof" className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <iframe title="ID proof" src={idUrl} className="absolute inset-0 h-full w-full bg-white" />
                )}
              </div>
              <figcaption className="flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                ID proof
                {idUrl && <a href={idUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 hover:underline">Open full size <Icon name="external" className="w-3 h-3" /></a>}
              </figcaption>
            </figure>
          </div>
        </div>

        <div>
          <p className={label}>Responsible for</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {locations.length === 0 && <span className="text-sm text-gray-500 dark:text-gray-400">No location</span>}
            {locations.map(l => (
              <button key={l.id} type="button" onClick={() => onOpenLocation(l.id)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700/60 text-sm font-semibold text-gray-800 dark:text-gray-200 transition-colors">
                <Icon name={l.location_type === 'garage' ? 'car' : 'bag'} className="w-4 h-4 text-gray-400" />
                {l.name}
                <Icon name="chevron" className="w-3.5 h-3.5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verify */}
      <div className="shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/40 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-xs text-gray-500 dark:text-gray-400">
          {verified
            ? 'Verified contacts let their locations go live. Removing verification can take a live location offline.'
            : 'Check the name and face match the ID. Locations need a verified contact before they can go live.'}
        </p>
        <button
          type="button"
          data-edit
          disabled={busy}
          onClick={onToggleVerified}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors disabled:opacity-50 ${
            verified
              ? 'border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
          }`}
        >
          <Icon name={verified ? 'shieldOff' : 'shield'} />
          {busy ? 'Saving…' : verified ? 'Remove verification' : 'Mark as verified'}
        </button>
      </div>
    </Modal>
  );
}
