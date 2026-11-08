'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { clearPartnerInfoRequest, requestPartnerInfo, setPartnerGstApplicable, updatePocStatus, updatePartnerStatus, updateLocationCommission, updateLocationCoordinates, updateLocationAdminStatus, uploadSignedRegistrationDoc } from '../actions';
import { INFO_REQUEST_AREAS, infoRequestAreas } from '@stashinn/lib/constants';
import { LOCATION_STATUSES, PARTNER_STATUSES, type PartnerStatus } from '../partnerStatus';
import { CopyButton, Icon, IconButton, PhotoPlaceholder, PrimaryBadge, StatusPill, SubmitButton, card, inr, isImageUrl, vehiclePricing, type IconName, type Tone } from './ui';
import { ContactModal, LocationModal, PauseChip, type Contact } from './DetailModals';
import type { Amenity } from '@stashinn/lib/services/amenities';
import { isLocationPriced } from '@stashinn/lib/services/bookingAvailability';

type LocationAction = 'approved' | 'update_required' | 'rejected' | 'suspended';
type Dialog =
  | { scope: 'info' }
  | { scope: 'partner'; status: PartnerStatus }
  | { scope: 'location'; status: LocationAction; id: string; name: string };

const IST = 'Asia/Kolkata';
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });

const BUTTON_TONES: Record<Tone, string> = {
  neutral: 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
  green: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  red: 'border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30',
  orange: 'border border-orange-200 dark:border-orange-800/60 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30',
  sky: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm',
};

function ActionButton({ icon, label, tone, onClick, disabled, hint }: { icon: IconName; label: string; tone: Tone; onClick: () => void; disabled?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      data-edit
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${BUTTON_TONES[tone]}`}
    >
      <Icon name={icon} />
      {label}
    </button>
  );
}

// Copy for each confirm dialog: what happens, whether a note to the partner is needed, and the button colour
function dialogCopy(d: Dialog, partner: any): {
  title: string; body: string; confirm: string; done: string; tone: Tone; reason: 'none' | 'optional' | 'required'; placeholder?: string; initial?: string;
} {
  if (d.scope === 'info') {
    return {
      title: partner.info_requested_at ? 'Update info request' : 'Request info from partner',
      body: 'Tick what needs attention. The partner gets an email and sees this on every page of their dashboard until you mark it resolved. For a problem with one location only, use Request info on that location instead.',
      confirm: 'Send request', done: 'Info request sent to partner', tone: 'sky', reason: 'optional',
      placeholder: 'E.g. The name on the ID proof doesn\'t match the PAN. Please update your PAN in Business profile.',
      initial: partner.info_request || '',
    };
  }
  if (d.scope === 'partner') {
    const name = partner.business_name;
    switch (d.status) {
      case 'approved':
        return partner.status === 'suspended'
          ? { title: 'Reactivate partner', body: `${name} becomes active again and their approved locations can take bookings.`, done: 'Partner reactivated', confirm: 'Reactivate', tone: 'green' as Tone, reason: 'none' as const }
          : { title: 'Approve & go live', body: `${name} is approved and gets an approval email. Their approved locations start taking bookings.`, done: 'Partner approved and live', confirm: 'Approve & go live', tone: 'green' as Tone, reason: 'none' as const };
      case 'rejected':
        return { title: 'Reject application', body: `${name} is told their application was rejected, with your note below.`, done: 'Application rejected', confirm: 'Reject application', tone: 'red' as Tone, reason: 'required' as const, placeholder: 'E.g. PAN details don\'t match the ID proof.' };
      case 'suspended':
        return { title: 'Suspend partner', body: `${name} stops taking new bookings until you reactivate them. Existing bookings are not cancelled.`, done: 'Partner suspended', confirm: 'Suspend partner', tone: 'orange' as Tone, reason: 'required' as const, placeholder: 'E.g. Repeated customer complaints about late opening.' };
      case 'pending':
        return { title: 'Reopen application', body: `${name} goes back to pending review so you can check it again.`, done: 'Application reopened', confirm: 'Reopen', tone: 'sky' as Tone, reason: 'optional' as const, placeholder: 'Optional note to the partner' };
    }
  }
  const name = d.name;
  switch (d.status) {
    case 'approved':
      return { title: 'Approve location', body: `${name} goes live and can take bookings. It needs at least one verified contact.`, done: 'Location approved', confirm: 'Approve location', tone: 'green' as Tone, reason: 'none' as const };
    case 'update_required':
      return { title: 'Request info', body: `${name} is flagged and the partner sees your note on that location, so they know exactly what to fix.`, done: 'Info request sent to partner', confirm: 'Send request', tone: 'sky' as Tone, reason: 'required' as const, placeholder: 'E.g. Photos are too dark. Please upload clear photos of the storage area.' };
    case 'rejected':
      return { title: 'Reject location', body: `${name} won't be listed. The partner sees your note.`, done: 'Location rejected', confirm: 'Reject location', tone: 'red' as Tone, reason: 'required' as const, placeholder: 'E.g. Storage area isn\'t lockable.' };
    case 'suspended':
      return { title: 'Suspend location', body: `${name} stops taking new bookings until you approve it again.`, done: 'Location suspended', confirm: 'Suspend location', tone: 'orange' as Tone, reason: 'required' as const, placeholder: 'E.g. Location temporarily closed for renovation.' };
  }
}

export default function ClientPartnerDetails({ partner, locations, pocs, kycDocs, signedRegistrationUrl, scoringRules, pauses = [], amenities }: {
  partner: any; locations: any[]; pocs: any[]; kycDocs: { name: string; url: string | null }[]; signedRegistrationUrl: string | null; scoringRules?: any; pauses?: any[]; amenities?: Amenity[];
}) {
  const [tab, setTab] = useState<'locations' | 'contacts'>('locations');
  const [drawer, setDrawer] = useState<{ type: 'location' | 'contact'; id: string; tab?: 'pricing' } | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawer(null); setDialog(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Onboarding saves the contact once per location; show each person once
  const contacts = useMemo<Contact[]>(() => {
    const byPhone = new Map<string, Contact>();
    pocs.forEach((poc: any) => {
      const key = poc.phone || poc.id;
      const c: Contact = byPhone.get(key) ?? { key, poc, ids: [], locationIds: [], verified: true };
      c.ids.push(poc.id);
      if (poc.location_id) c.locationIds.push(poc.location_id);
      c.verified = c.verified && poc.is_verified;
      byPhone.set(key, c);
    });
    return [...byPhone.values()];
  }, [pocs]);

  const owner = partner.users || {};
  const isIndividual = partner.business_type === 'Individual';
  const status = PARTNER_STATUSES[partner.status as PartnerStatus];
  const isPrimaryLocation = (loc: any) => pocs.some((p: any) => p.location_id === loc.id && p.is_primary);
  const locStatus = (loc: any) => LOCATION_STATUSES[loc.admin_status] ?? LOCATION_STATUSES.pending!;

  const approvedLocations = locations.filter(l => l.admin_status === 'approved').length;
  const infoRequested = locations.filter(l => l.admin_status === 'update_required').length;
  const unscored = locations.filter(l => !isLocationPriced(l)).length;
  const verifiedContacts = contacts.filter(c => c.verified).length;
  const allContactsVerified = contacts.length > 0 && verifiedContacts === contacts.length;
  const allLocationsApproved = locations.length > 0 && approvedLocations === locations.length;
  const gstDecided = partner.gst_applicable === true || partner.gst_applicable === false;
  const readyToApprove = allContactsVerified && allLocationsApproved && !!partner.signed_registration_doc_url && !partner.info_requested_at && gstDecided;

  const run = (id: string | null, action: () => Promise<{ error?: string | null } | void>, success: string, after?: () => void) => {
    setBusyId(id);
    startTransition(async () => {
      try {
        const res = await action();
        if (res && res.error) setToast({ ok: false, text: res.error });
        else { setToast({ ok: true, text: success }); after?.(); }
      } catch (e: any) {
        setToast({ ok: false, text: e?.message || 'Something went wrong' });
      }
      setBusyId(null);
    });
  };

  const confirmDialog = (reason: string, areas: string[]) => {
    if (!dialog) return;
    const copy = dialogCopy(dialog, partner);
    if (dialog.scope === 'info') {
      if (areas.length === 0) return setToast({ ok: false, text: 'Tick at least one area that needs attention.' });
      run('partner', () => requestPartnerInfo(partner.id, areas, reason), copy.done, () => setDialog(null));
    } else if (dialog.scope === 'partner') {
      const fd = new FormData();
      fd.set('partner_id', partner.id);
      fd.set('new_status', dialog.status);
      fd.set('reason', reason);
      run('partner', () => updatePartnerStatus(fd), copy.done, () => setDialog(null));
    } else {
      const d = dialog;
      run(d.id, () => updateLocationAdminStatus(d.id, partner.id, d.status, reason), copy.done, () => setDialog(null));
    }
  };

  const toggleContact = (c: Contact) =>
    run(c.key, () => updatePocStatus(c.ids[0]!, partner.id, !c.verified), c.verified ? 'Verification removed' : `${c.poc.name} verified`);

  const docLabel = (name: string) => {
    if (name.startsWith('poc_id')) return 'Contact ID proof';
    if (name.startsWith('poc_photo')) return 'Contact photo';
    if (name.startsWith('kyc_proof')) return isIndividual ? 'Owner ID proof' : 'Business registration';
    return name;
  };

  const locationActions = (loc: any) => {
    const open = (s: LocationAction) => () => setDialog({ scope: 'location', status: s, id: loc.id, name: loc.name });
    // Scoring sets the rates, so it has to happen before a location can be approved
    const approve = isLocationPriced(loc)
      ? open('approved')
      : () => {
          setToast({ ok: false, text: 'Apply this location\'s score and rates before approving it.' });
          setDrawer({ type: 'location', id: loc.id, tab: 'pricing' });
        };
    const busy = busyId === loc.id;
    switch (loc.admin_status) {
      case 'approved':
        return <IconButton edit icon="pause" label="Suspend location" tone="orange" onClick={open('suspended')} disabled={busy} />;
      case 'suspended':
        return <IconButton edit icon="play" label="Reactivate location" tone="green" onClick={approve} disabled={busy} />;
      case 'rejected':
        return <IconButton edit icon="refresh" label="Approve after all" tone="green" onClick={approve} disabled={busy} />;
      default:
        return (
          <>
            <IconButton edit icon="check" label={isLocationPriced(loc) ? 'Approve location' : 'Score first to approve'} tone="green" onClick={approve} disabled={busy} />
            <IconButton edit icon="flag" label={loc.admin_status === 'update_required' ? 'Update info request' : 'Request info'} tone="sky" onClick={open('update_required')} disabled={busy} />
            <IconButton edit icon="x" label="Reject location" tone="red" onClick={open('rejected')} disabled={busy} />
          </>
        );
    }
  };

  const drawerLocation = drawer?.type === 'location' ? locations.find(l => l.id === drawer.id) : null;
  const drawerContact = drawer?.type === 'contact' ? contacts.find(c => c.key === drawer.id) : null;

  const chooseGst = (applies: boolean) => {
    if (partner.gst_applicable === applies) return;
    if (partner.status !== 'pending' && !confirm(`${applies ? 'Add' : 'Remove'} GST on ${partner.business_name}'s new bookings? This changes what customers pay. Existing bookings stay as they are.`)) return;
    run('partner', () => setPartnerGstApplicable(partner.id, applies), applies ? 'GST applies to this partner' : 'No GST for this partner');
  };

  const GstChoice = () => (
    <span data-edit className="inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800">
      {([[true, 'Applies'], [false, 'Doesn\'t apply']] as const).map(([value, text]) => (
        <button
          key={text}
          type="button"
          aria-pressed={partner.gst_applicable === value}
          disabled={isPending}
          onClick={() => chooseGst(value)}
          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
            partner.gst_applicable === value ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {text}
        </button>
      ))}
    </span>
  );

  const steps: { done: boolean; title: string; detail: string; action?: () => void; actionLabel?: string }[] = [
    { done: allContactsVerified, title: 'Verify contact details', detail: contacts.length ? `${verifiedContacts} of ${contacts.length} verified` : 'No contact added', action: () => setTab('contacts'), actionLabel: 'Review contacts' },
    { done: allLocationsApproved, title: 'Score & approve locations', detail: locations.length ? `${approvedLocations} of ${locations.length} approved${unscored ? ` · ${unscored} need scoring` : ''}${infoRequested ? ` · ${infoRequested} waiting on partner` : ''}` : 'No locations added', action: () => setTab('locations'), actionLabel: 'Review locations' },
    { done: gstDecided, title: 'Decide GST', detail: gstDecided ? (partner.gst_applicable ? 'GST applies to this partner' : 'No GST for this partner') : 'Does GST apply to this partner?' },
    { done: !!partner.signed_registration_doc_url, title: 'Signed registration form', detail: partner.signed_registration_doc_url ? 'Uploaded' : allLocationsApproved ? 'Print, get it signed, upload it' : 'Available once locations are approved' },
  ];
  const currentStep = steps.findIndex(s => !s.done);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link href="/dashboard/partners" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
        <Icon name="back" /> Partners
      </Link>

      {/* Hero */}
      <section className={`${card} overflow-hidden`}>
        <div className="p-5 md:p-6 flex flex-col lg:flex-row gap-5 lg:items-start">
          <div className="flex gap-4 min-w-0 flex-1">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-sm">
              {partner.business_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white truncate">{partner.business_name}</h1>
                {status && <StatusPill {...status} />}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isIndividual ? 'Individual partner' : `Business · ${partner.business_type || 'General'}`}
                {!isIndividual && owner.full_name && <> · Owner {owner.full_name}</>}
                {' · '}Applied {fmtDate(partner.created_at)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {owner.email && (
                  <span className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 max-w-full">
                    <Icon name="mail" className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`mailto:${owner.email}`} className="truncate hover:text-orange-600 dark:hover:text-orange-400">{owner.email}</a>
                    <CopyButton value={owner.email} label="email" />
                  </span>
                )}
                {owner.phone && (
                  <span className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300">
                    <Icon name="phone" className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`tel:${owner.phone}`} className="hover:text-orange-600 dark:hover:text-orange-400">{owner.phone}</a>
                    <CopyButton value={owner.phone} label="phone" />
                  </span>
                )}
                {[['PAN', partner.pan], ['GSTIN', partner.gstin]].filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-xs">
                    <span className="font-bold text-gray-400 dark:text-gray-500">{k}</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">{v}</span>
                    <CopyButton value={v} label={k!} />
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Partner-level actions */}
          <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
            {partner.status === 'pending' && !allLocationsApproved ? (
              <IconButton icon="printer" label="Registration form (print)" onClick={() => setToast({ ok: false, text: 'Approve all locations before printing the registration form.' })} />
            ) : (
              <IconButton icon="printer" label="Registration form (print)" href={`/print/partners/${partner.id}`} />
            )}
            {partner.status !== 'rejected' && (
              <ActionButton icon="flag" label={partner.info_requested_at ? 'Edit info request' : 'Request info'} tone="neutral" onClick={() => setDialog({ scope: 'info' })} />
            )}
            {partner.status === 'pending' && (
              <>
                <ActionButton icon="x" label="Reject" tone="red" onClick={() => setDialog({ scope: 'partner', status: 'rejected' })} />
                <ActionButton
                  icon="check" label="Approve & go live" tone="green"
                  disabled={!readyToApprove}
                  hint={readyToApprove ? undefined : 'Finish the review checklist first'}
                  onClick={() => setDialog({ scope: 'partner', status: 'approved' })}
                />
              </>
            )}
            {partner.status === 'approved' && <ActionButton icon="pause" label="Suspend" tone="orange" onClick={() => setDialog({ scope: 'partner', status: 'suspended' })} />}
            {partner.status === 'suspended' && <ActionButton icon="play" label="Reactivate" tone="green" onClick={() => setDialog({ scope: 'partner', status: 'approved' })} />}
            {partner.status === 'rejected' && <ActionButton icon="refresh" label="Reopen application" tone="neutral" onClick={() => setDialog({ scope: 'partner', status: 'pending' })} />}
          </div>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800">
          {[
            { label: 'Locations live', value: `${approvedLocations}/${locations.length}`, warn: locations.length > 0 && approvedLocations < locations.length },
            { label: 'Contacts verified', value: `${verifiedContacts}/${contacts.length}`, warn: !allContactsVerified },
            { label: 'Info requested', value: String(infoRequested), warn: infoRequested > 0 },
            { label: 'Rating', value: partner.total_reviews > 0 ? `★ ${Number(partner.avg_rating).toFixed(1)}` : '—', sub: partner.total_reviews > 0 ? `${partner.total_reviews} reviews` : 'No reviews yet' },
          ].map(s => (
            <div key={s.label} className="px-5 py-3 bg-white dark:bg-gray-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`text-lg font-black tabular-nums ${s.warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {partner.info_requested_at && (
        <section className="rounded-2xl border border-sky-200 dark:border-sky-800/50 bg-sky-50 dark:bg-sky-950/30 p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-start">
          <span className="h-10 w-10 shrink-0 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 flex items-center justify-center"><Icon name="flag" className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-sky-900 dark:text-sky-200">Info requested from partner</p>
              {partner.info_responded_at ? (
                <StatusPill label={`Partner says done · ${fmtDate(partner.info_responded_at)}`} dot="bg-emerald-500" badge={PARTNER_STATUSES.approved.badge} />
              ) : (
                <StatusPill label="Waiting on partner" dot="bg-amber-500" badge={PARTNER_STATUSES.pending.badge} />
              )}
            </div>
            {infoRequestAreas(partner.info_request_items).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {infoRequestAreas(partner.info_request_items).map(a => (
                  <span key={a.key} className="px-2 py-0.5 rounded-md text-xs font-bold bg-white dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">{a.label}</span>
                ))}
              </div>
            )}
            {partner.info_request && <p className="mt-2 text-sm text-sky-900/90 dark:text-sky-100/90 whitespace-pre-line">{partner.info_request}</p>}
            <p className="mt-1 text-xs text-sky-700/80 dark:text-sky-300/70">Sent {fmtDate(partner.info_requested_at)}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <ActionButton icon="flag" label="Edit" tone="neutral" onClick={() => setDialog({ scope: 'info' })} />
            <ActionButton icon="check" label="Mark resolved" tone="green" onClick={() => run('partner', () => clearPartnerInfoRequest(partner.id), 'Info request resolved')} />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Locations & contacts */}
        <section className="xl:col-span-2 space-y-4">
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl w-fit" role="tablist">
            {([
              { id: 'locations', label: 'Locations', icon: 'pin', count: locations.length, attention: locations.some(l => l.admin_status !== 'approved') },
              { id: 'contacts', label: 'Contacts', icon: 'user', count: contacts.length, attention: !allContactsVerified },
            ] as const).map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                  tab === t.id ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon name={t.icon} />
                {t.label}
                <span className="tabular-nums text-xs text-gray-400 dark:text-gray-500">{t.count}</span>
                {t.attention && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" aria-label="needs attention" />}
              </button>
            ))}
          </div>

          {tab === 'locations' && (
            <div className="space-y-3">
              {locations.length === 0 && <div className={`${card} p-10 text-center text-sm text-gray-500 dark:text-gray-400`}>No locations added yet.</div>}
              {locations.map((loc: any) => {
                const st = locStatus(loc);
                const vp = vehiclePricing(loc);
                const isGarage = loc.location_type === 'garage';
                const locContacts = contacts.filter(c => c.locationIds.includes(loc.id));
                const primary = isPrimaryLocation(loc);
                return (
                  <article
                    key={loc.id}
                    onClick={() => setDrawer({ type: 'location', id: loc.id })}
                    className={`${card} group p-4 flex flex-col sm:flex-row gap-4 cursor-pointer hover:border-orange-300 dark:hover:border-orange-700/60 transition-colors ${busyId === loc.id ? 'opacity-60' : ''}`}
                  >
                    <div className="relative h-32 sm:h-auto sm:min-h-[7rem] sm:w-40 shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                      {loc.photos?.length ? (
                        <img src={loc.photos[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <PhotoPlaceholder garage={isGarage} />
                      )}
                      {loc.photos?.length > 1 && (
                        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">+{loc.photos.length - 1}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                        <PrimaryBadge primary={primary} />
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${isGarage ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60' : 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60'}`}>
                          <Icon name={isGarage ? 'car' : 'bag'} className="w-3.5 h-3.5" />{isGarage ? 'Vehicle' : 'Luggage'}
                        </span>
                        <StatusPill {...st} />
                        <PauseChip pauses={pauses.filter(p => p.location_id === loc.id)} />
                        {!isLocationPriced(loc) && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDrawer({ type: 'location', id: loc.id, tab: 'pricing' }); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 hover:border-amber-500"
                          >
                            <Icon name="info" className="w-3.5 h-3.5" />Needs scoring
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-1">
                        <IconButton icon="eye" label="View details" onClick={() => setDrawer({ type: 'location', id: loc.id })} />
                        {locationActions(loc)}
                      </div>
                      </div>
                      <h3 className="mt-1.5 font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-700 dark:group-hover:text-orange-400">{loc.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{[loc.address_line1, loc.city, loc.pincode].filter(Boolean).join(', ')}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{isGarage ? `${vp?.bike_capacity ?? 0} bikes · ${vp?.sedan_capacity ?? 0} cars · ${vp?.suv_capacity ?? 0} SUVs` : `${loc.max_bags} bags`}</span>
                        <span>{isGarage ? `${inr(vp?.bike_rate_hr)} / ${inr(vp?.sedan_rate_hr)} per hr` : `${inr(loc.price_per_hour)} per hr`}</span>
                        <span>{loc.commission_rate ?? partner.commission_rate ?? 15}% commission</span>
                        <span className={locContacts.some(c => c.verified) ? '' : 'text-amber-700 dark:text-amber-400'}>
                          {locContacts.length ? (locContacts.some(c => c.verified) ? 'Contact verified' : 'Contact not verified') : 'No contact'}
                        </span>
                      </div>
                      {loc.status_reason && loc.admin_status !== 'approved' && (
                        <p className="mt-2 flex gap-1.5 text-xs text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 rounded-lg px-2.5 py-1.5">
                          <Icon name="info" className="w-3.5 h-3.5 shrink-0 mt-px" />
                          <span><span className="font-bold">Note to partner:</span> {loc.status_reason}</span>
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {tab === 'contacts' && (
            <div className={`${card} divide-y divide-gray-100 dark:divide-gray-800`}>
              {contacts.length === 0 && <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">No contacts added yet.</div>}
              {contacts.map(c => (
                <div
                  key={c.key}
                  onClick={() => setDrawer({ type: 'contact', id: c.key })}
                  className={`group p-4 flex items-center gap-4 cursor-pointer hover:bg-orange-50/40 dark:hover:bg-gray-800/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${busyId === c.key ? 'opacity-60' : ''}`}
                >
                  {c.poc.signed_photo_url ? (
                    <img src={c.poc.signed_photo_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500">{c.poc.name.charAt(0)}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-700 dark:group-hover:text-orange-400">{c.poc.name}</p>
                      {c.verified
                        ? <StatusPill label="Verified" dot="bg-emerald-500" badge={PARTNER_STATUSES.approved.badge} />
                        : <StatusPill label="Not verified" dot="bg-amber-500" badge={PARTNER_STATUSES.pending.badge} />}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{[c.poc.phone, c.poc.email].filter(Boolean).join(' · ')}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      Covers {c.locationIds.length ? locations.filter(l => c.locationIds.includes(l.id)).map(l => l.location_type === 'garage' ? 'Vehicle space' : 'Luggage space').join(', ') : 'no location'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.poc.signed_id_doc_url && <IconButton icon="doc" label="Open ID proof" href={c.poc.signed_id_doc_url} />}
                    <IconButton icon="eye" label="View details" onClick={() => setDrawer({ type: 'contact', id: c.key })} />
                    <IconButton
                      edit
                      icon={c.verified ? 'shieldOff' : 'shield'}
                      label={c.verified ? 'Remove verification' : 'Mark verified'}
                      tone={c.verified ? 'red' : 'green'}
                      disabled={busyId === c.key}
                      onClick={() => toggleContact(c)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Side column */}
        <aside className="space-y-6">
          {partner.status === 'pending' && (
            <section className={`${card} p-5`}>
              <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Review checklist</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Finish these to approve the partner.</p>
              <ol className="mt-4 space-y-4">
                {steps.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                      s.done ? 'bg-emerald-500 text-white' : i === currentStep ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {s.done ? <Icon name="check" className="w-3.5 h-3.5" /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold ${s.done ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{s.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.detail}</p>
                      {!s.done && s.action && (
                        <button onClick={s.action} className="mt-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">{s.actionLabel} →</button>
                      )}
                      {s.title === 'Decide GST' && <div className="mt-2"><GstChoice /></div>}
                      {s.title === 'Signed registration form' && !s.done && allLocationsApproved && (
                        <form
                          data-edit
                          className="mt-2 space-y-2"
                          action={(fd) => {
                            const file = fd.get('signed_doc') as File;
                            if (!file || file.size === 0) return setToast({ ok: false, text: 'Choose the signed form first' });
                            if (file.size > 10 * 1024 * 1024) return setToast({ ok: false, text: 'The file is larger than 10 MB' });
                            run('partner', () => uploadSignedRegistrationDoc(partner.id, fd), 'Signed form uploaded');
                          }}
                        >
                          <a href={`/print/partners/${partner.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400">
                            <Icon name="printer" className="w-3.5 h-3.5" /> Print registration form
                          </a>
                          <input type="file" name="signed_doc" accept=".pdf,image/*" required className="block w-full text-xs text-gray-600 dark:text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-orange-50 dark:file:bg-orange-900/30 file:text-orange-700 dark:file:text-orange-400 hover:file:bg-orange-100 dark:hover:file:bg-orange-900/50" />
                          <SubmitButton defaultText="Upload signed form" loadingText="Uploading…" className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60" />
                        </form>
                      )}
                    </div>
                  </li>
                ))}
                <li className="flex gap-3">
                  <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${readyToApprove ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{steps.length + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Approve & go live</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {readyToApprove ? 'Ready. Use Approve & go live at the top.' : partner.info_requested_at ? 'Resolve the open info request first' : 'Unlocks when the steps above are done'}
                    </p>
                  </div>
                </li>
              </ol>
            </section>
          )}

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Documents</h2>
            <div className="mt-3 space-y-2">
              {kycDocs.length === 0 && !signedRegistrationUrl && <p className="text-xs text-gray-500 dark:text-gray-400">No documents uploaded.</p>}
              {[...kycDocs.map(d => ({ label: docLabel(d.name), url: d.url!, file: d.name })), ...(signedRegistrationUrl ? [{ label: 'Signed registration form', url: signedRegistrationUrl, file: 'Uploaded by admin' }] : [])].map(d => (
                <a key={d.url} href={d.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700/60 hover:bg-orange-50/40 dark:hover:bg-gray-800/40 transition-colors">
                  <span className="h-9 w-9 shrink-0 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <Icon name={isImageUrl(d.url) ? 'photo' : 'doc'} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{d.label}</span>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 truncate">{d.file}</span>
                  </span>
                  <Icon name="external" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-orange-500" />
                </a>
              ))}
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Account</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              {[
                ['Account holder', owner.full_name || '—'],
                ['KYC approved', partner.kyc_verified ? 'Yes' : 'On final approval'],
                ['Default commission', `${partner.commission_rate ?? 15}%`],
                ['Applied', fmtDate(partner.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white text-right">{v}</dd>
                </div>
              ))}
              {partner.status !== 'pending' && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">GST on bookings</dt>
                  <dd><GstChoice /></dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Partner ID</dt>
                <dd className="flex items-center gap-1.5 font-mono text-xs text-gray-700 dark:text-gray-300">{partner.id.split('-')[0]}… <CopyButton value={partner.id} label="partner ID" /></dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {/* Detail modals */}
      {drawerLocation && (
        <LocationModal
          loc={drawerLocation}
          partner={partner}
          contacts={contacts.filter(c => c.locationIds.includes(drawerLocation.id))}
          primary={isPrimaryLocation(drawerLocation)}
          status={locStatus(drawerLocation)}
          actions={locationActions(drawerLocation)}
          scoringRules={scoringRules}
          pauses={pauses.filter(p => p.location_id === drawerLocation.id)}
          amenities={amenities}
          initialTab={drawer?.tab}
          busy={busyId === drawerLocation.id}
          onPin={(fd) => run(drawerLocation.id, () => updateLocationCoordinates(fd), 'Map pin updated')}
          onCommission={(fd) => run(drawerLocation.id, () => updateLocationCommission(drawerLocation.id, partner.id, fd), 'Commission updated')}
          onToast={(ok, text) => setToast({ ok, text })}
          onOpenContact={(key) => setDrawer({ type: 'contact', id: key })}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawerContact && (
        <ContactModal
          contact={drawerContact}
          locations={locations.filter(l => drawerContact.locationIds.includes(l.id))}
          busy={busyId === drawerContact.key}
          onToggleVerified={() => toggleContact(drawerContact)}
          onOpenLocation={(id) => setDrawer({ type: 'location', id })}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* Confirm dialog */}
      {dialog && (() => {
        const copy = dialogCopy(dialog, partner);
        const confirmTone: Record<Tone, string> = {
          green: 'bg-emerald-600 hover:bg-emerald-700', red: 'bg-red-600 hover:bg-red-700', orange: 'bg-orange-600 hover:bg-orange-700',
          sky: 'bg-sky-600 hover:bg-sky-700', neutral: 'bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600',
        };
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50" onClick={() => !isPending && setDialog(null)} />
            <form
              className={`relative w-full ${dialog.scope === 'info' ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6`}
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                confirmDialog(String(fd.get('reason') || '').trim(), fd.getAll('areas').map(String));
              }}
            >
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{copy.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{copy.body}</p>
              {dialog.scope === 'info' && (
                <fieldset className="mt-4">
                  <legend className="text-xs font-bold text-gray-700 dark:text-gray-300">What needs attention?</legend>
                  <div className="mt-1.5 grid gap-2">
                    {INFO_REQUEST_AREAS.map(a => (
                      <label key={a.key} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 has-[:checked]:border-sky-400 has-[:checked]:bg-sky-50 dark:has-[:checked]:bg-sky-950/40 transition-colors">
                        <input type="checkbox" name="areas" value={a.key} defaultChecked={partner.info_request_items?.includes(a.key)} className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-sky-600 focus:ring-sky-500" />
                        <span>
                          <span className="block text-sm font-bold text-gray-900 dark:text-white">{a.label}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{a.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {copy.reason !== 'none' && (
                <label className="block mt-4">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Note to partner{copy.reason === 'optional' ? ' (optional)' : ''}</span>
                  <textarea
                    name="reason"
                    rows={3}
                    autoFocus={dialog.scope !== 'info'}
                    required={copy.reason === 'required'}
                    placeholder={copy.placeholder}
                    defaultValue={copy.initial}
                    className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                  />
                </label>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setDialog(null)} disabled={isPending} className="px-4 py-2 text-sm font-bold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                <button type="submit" disabled={isPending} className={`px-4 py-2 text-sm font-bold rounded-xl text-white disabled:opacity-60 ${confirmTone[copy.tone]}`}>
                  {isPending ? 'Working…' : copy.confirm}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* Toast */}
      {toast && (
        <div role="status" className={`fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg border ${
          toast.ok ? 'bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400'
        }`}>
          <Icon name={toast.ok ? 'check' : 'info'} />
          {toast.text}
        </div>
      )}
    </div>
  );
}
