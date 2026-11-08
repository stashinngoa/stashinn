'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addLocation, updateLocation } from './actions';
import MapWrapper from './MapWrapper';
import Icon from '../../../components/Icon';
import { usePinAutofill } from '../../onboarding/pinLookup';
import { ONBOARDING_LIMITS, checkFiles } from '../../onboarding/validation';
import { DEFAULT_AMENITIES, type Amenity } from '@stashinn/lib/services/amenities';

const input = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm';
const fileInput = 'block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-orange-50 dark:file:bg-orange-900/30 file:text-orange-700 dark:file:text-orange-400 hover:file:bg-orange-100 dark:hover:file:bg-orange-900/50';
const label = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5';
const radio = 'h-4 w-4 text-orange-600 border-gray-300 dark:border-gray-600 focus:ring-orange-500';

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none">
      <div className="px-5 md:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-extrabold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 md:p-6 space-y-4">{children}</div>
    </section>
  );
}

function Note({ tone = 'sky', children }: { tone?: 'sky' | 'amber'; children: React.ReactNode }) {
  const cls = tone === 'amber'
    ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
    : 'border-sky-200 dark:border-sky-800/50 bg-sky-50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200';
  return <div className={`flex gap-2 rounded-xl border px-3.5 py-3 text-sm ${cls}`}><Icon name="info" className="w-4 h-4 shrink-0 mt-0.5" /><div>{children}</div></div>;
}

export default function LocationForm({ initialData, existingPocs = [], isPrimary = false, amenityCatalog = DEFAULT_AMENITIES }: { initialData?: any; existingPocs?: any[]; isPrimary?: boolean; amenityCatalog?: Amenity[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lat, setLat] = useState<number>(initialData?.latitude || 0);
  const [lng, setLng] = useState<number>(initialData?.longitude || 0);
  const [locationType, setLocationType] = useState<'luggage' | 'garage'>(initialData?.location_type || 'luggage');
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initialData?.photos || []);
  const [pin, setPin] = useState<string>(initialData?.pincode || '');
  const [city, setCity] = useState<string>(initialData?.city || '');
  const [stateName, setStateName] = useState<string>(initialData?.state || '');
  const [pinPlaced, setPinPlaced] = useState(!!initialData?.latitude); // the partner has a real pin on the map
  const [fileError, setFileError] = useState<string | null>(null);

  // A new PIN fills city and state (both stay editable); an existing location keeps its saved values
  const pinLookup = usePinAutofill(pin, pin !== (initialData?.pincode || ''), ({ city: c, state: st }) => {
    setCity(c);
    setStateName(st);
  });

  // Until the partner places the pin, centre the map on the PIN code's area
  useEffect(() => {
    if (pinPlaced || pinLookup.status !== 'found') return;
    const controller = new AbortController();
    fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pin}&country=India&format=json&limit=1`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (!data?.[0]) return;
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pin, pinLookup.status, pinPlaced]);

  // Checks picked files right away; on a problem, shows it and clears the input
  const acceptFiles = (input: HTMLInputElement, kind: 'photos' | 'photo' | 'doc', what: string) => {
    const list = Array.from(input.files ?? []);
    const rules = kind === 'doc'
      ? { maxCount: 1, maxMb: ONBOARDING_LIMITS.docMaxMb, types: ONBOARDING_LIMITS.docTypes }
      : { maxCount: kind === 'photo' ? 1 : Math.max(0, ONBOARDING_LIMITS.maxPhotos - existingPhotos.length), maxMb: ONBOARDING_LIMITS.photoMaxMb, types: ONBOARDING_LIMITS.imageTypes };
    const problem = rules.maxCount === 0 && list.length ? `You already have ${ONBOARDING_LIMITS.maxPhotos} photos. Remove one to add another.` : checkFiles(list, rules, what);
    setFileError(problem);
    if (problem) input.value = '';
  };

  const currentLocationPoc = initialData?.id ? existingPocs.find(poc => poc.location_id === initialData.id) : null;
  const isEdit = !!initialData;
  // The primary location (created at onboarding) keeps its type; the server enforces this too
  const typeLocked = isEdit && isPrimary;
  const needsChanges = isEdit && (initialData.admin_status === 'update_required' || initialData.admin_status === 'rejected');

  const getDefaultPocOption = () => {
    if (isEdit) return 'keep'; // Don't touch POC by default when editing
    if (existingPocs.length > 0) return 'existing';
    return 'new';
  };
  const [pocOption, setPocOption] = useState<'new' | 'existing' | 'keep'>(getDefaultPocOption());
  const [duplicatePocWarning, setDuplicatePocWarning] = useState<string | null>(null);
  const pocNameRef = useRef('');
  const pocPhoneRef = useRef('');
  const pocEmailRef = useRef('');

  const checkDuplicatePoc = (name: string | null, phone: string | null, email: string | null) => {
    if (name !== null) pocNameRef.current = name.trim().toLowerCase();
    if (phone !== null) pocPhoneRef.current = phone.trim();
    if (email !== null) pocEmailRef.current = email.trim().toLowerCase();

    const currentName = pocNameRef.current;
    const currentPhone = pocPhoneRef.current;
    const currentEmail = pocEmailRef.current;

    // Need at least name AND phone filled to check
    if (!currentName || !currentPhone) {
      setDuplicatePocWarning(null);
      return;
    }

    const match = existingPocs.find(poc => {
      const emailMatch = currentEmail && poc.email ? poc.email.toLowerCase() === currentEmail : true; // skip if either side is empty
      return poc.name.toLowerCase() === currentName && poc.phone === currentPhone && emailMatch;
    });

    setDuplicatePocWarning(match
      ? `${match.name} (${match.phone}) is already the contact at "${match.partner_locations?.name || 'another location'}". You can still continue if they'll be available here during opening hours.`
      : null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    let res;
    if (initialData?.id) {
      formData.append('id', initialData.id);
      res = await updateLocation(formData);
    } else {
      res = await addLocation(formData);
    }

    if (res?.error) {
      setError(res.error);
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const opHours = initialData?.operating_hours || { open: '08:00', close: '22:00' };
  const amenities: string[] = initialData?.amenities || [];
  // Amenities for this location's type: active ones, plus any it already has. Built-in parking
  // amenities are saved in their own column, everything else in the amenities list.
  const hasAmenity = (a: Amenity) => (locationType === 'garage' && a.column ? !!initialData?.[a.column] : amenities.includes(a.label));
  const amenityOptions = amenityCatalog.filter(a => a.applies_to.includes(locationType) && (a.is_active || hasAmenity(a)));
  // Stored values with no checkbox here stay on the location
  const keptAmenities = amenities.filter(v => !amenityOptions.some(a => !(locationType === 'garage' && a.column) && a.label === v));
  const vp = (Array.isArray(initialData?.vehicle_pricing) ? initialData?.vehicle_pricing[0] : initialData?.vehicle_pricing) || {};
  const uniquePocs = existingPocs.filter((poc, index, self) => index === self.findIndex(p => p.phone === poc.phone));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="flex gap-2 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          <Icon name="alert" className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      {needsChanges && initialData.status_reason && (
        <Note>
          <p className="font-bold">StashInn asked for changes</p>
          <p className="mt-0.5 whitespace-pre-line">{initialData.status_reason}</p>
          <p className="mt-1 text-xs opacity-80">Saving sends this location back for review and clears this note.</p>
        </Note>
      )}

      {/* Type & basics */}
      <Section title="Type & basics">
        <div>
          <p className={label}>What does this location store?</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'luggage', title: 'Luggage storage', sub: 'Bags and suitcases', icon: 'bag' },
              { value: 'garage', title: 'Vehicle parking', sub: 'Bikes, cars and SUVs', icon: 'car' },
            ] as const).map(opt => {
              const selected = locationType === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3.5 transition-colors ${
                    selected ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30' : 'border-gray-200 dark:border-gray-800'
                  } ${typeLocked ? (selected ? '' : 'opacity-40') + ' cursor-not-allowed' : 'cursor-pointer hover:border-orange-300 dark:hover:border-orange-700/60'}`}
                >
                  <input
                    type="radio"
                    name={typeLocked ? undefined : 'location_type'}
                    value={opt.value}
                    checked={selected}
                    disabled={typeLocked}
                    onChange={() => setLocationType(opt.value)}
                    className="sr-only"
                  />
                  <span className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${selected ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                    <Icon name={opt.icon} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{opt.title}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{opt.sub}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {typeLocked && (
            <>
              <input type="hidden" name="location_type" value={locationType} />
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Icon name="lock" className="w-3.5 h-3.5" /> This is your primary location, so its type can&apos;t be changed. Add a new location for the other type.
              </p>
            </>
          )}
        </div>

        <div>
          <label className={label} htmlFor="loc-name">Location name *</label>
          <input id="loc-name" type="text" name="name" defaultValue={initialData?.name} required className={input} placeholder="e.g. Hotel Mandovi – Luggage Room" />
        </div>

        {locationType === 'luggage' ? (
          <div className="max-w-xs">
            <label className={label} htmlFor="max-bags">Bag capacity *</label>
            <input id="max-bags" type="number" name="max_bags" defaultValue={initialData?.max_bags || 20} required min="1" className={input} />
          </div>
        ) : (
          <div>
            <p className={label}>Parking capacity</p>
            <div className="grid grid-cols-3 gap-3">
              {([['bike_capacity', 'Bikes / scooters'], ['sedan_capacity', 'Cars'], ['suv_capacity', 'SUV-size spaces']] as const).map(([name, text]) => (
                <div key={name}>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor={name}>{text}</label>
                  <input id={name} type="number" name={name} defaultValue={vp[name] || 0} min="0" className={input} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">SUV-size spaces fit an SUV or MUV. When your car spaces are full, cars can park in free SUV spaces too. Cars and SUVs pay the same rate.</p>
          </div>
        )}
      </Section>

      {/* Address */}
      <Section title="Address & map" subtitle="Start with the PIN code. City and state fill in automatically.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={label} htmlFor="pincode">PIN code *</label>
            <input
              id="pincode" type="text" name="pincode" inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" required
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="e.g. 403001" className={input}
            />
            <p className="mt-1 h-4 text-xs text-gray-500 dark:text-gray-400">
              {pinLookup.status === 'loading' ? 'Looking up…' : pinLookup.status === 'not_found' ? <span className="text-amber-700 dark:text-amber-400">PIN not found. Enter city and state yourself.</span> : ''}
            </p>
          </div>
          <div>
            <label className={label} htmlFor="city">City / town *</label>
            <input id="city" type="text" name="city" list="pin-areas" required value={city} onChange={e => setCity(e.target.value)} className={input} />
            <datalist id="pin-areas">{pinLookup.areas.map(a => <option key={a} value={a} />)}</datalist>
          </div>
          <div>
            <label className={label} htmlFor="state">State *</label>
            <input id="state" type="text" name="state" required value={stateName} onChange={e => setStateName(e.target.value)} className={input} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="addr1">Street address *</label>
          <input id="addr1" type="text" name="address_line1" defaultValue={initialData?.address_line1} required className={input} placeholder="Building / house number and street" />
        </div>
        <div>
          <label className={label} htmlFor="addr2">Landmark</label>
          <input id="addr2" type="text" name="address_line2" defaultValue={initialData?.address_line2} className={input} placeholder="Nearby landmark, floor or shop name" />
        </div>
        <div>
          <p className={label}>Map pin *</p>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <MapWrapper initialLat={lat} initialLng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); setPinPlaced(true); }} />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {pinPlaced ? 'Pin placed. Click the map again to move it.' : lat ? 'Showing your PIN code area. Click the exact entrance to place the pin.' : 'Click the map at your entrance to place the pin.'}
          </p>
          <input type="hidden" name="latitude" value={pinPlaced ? lat || '' : ''} />
          <input type="hidden" name="longitude" value={pinPlaced ? lng || '' : ''} />
        </div>
      </Section>

      {/* Hours */}
      <Section title="Opening hours" subtitle="Customers can only drop off and pick up while you're open.">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className={label} htmlFor="open-time">Opens *</label>
            <input id="open-time" type="time" name="open_time" defaultValue={opHours.open} required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="close-time">Closes *</label>
            <input id="close-time" type="time" name="close_time" defaultValue={opHours.close} required className={input} />
          </div>
        </div>
        <Note>Rates for {locationType === 'garage' ? 'vehicles' : 'luggage'} are set by StashInn based on your location and amenities.</Note>
      </Section>

      {/* Contact */}
      <Section title="Point of contact" subtitle={isEdit ? 'The person customers meet at this location.' : 'Required. The person customers meet at this location.'}>
        <input type="hidden" name="poc_option" value={pocOption} />

        {isEdit && currentLocationPoc && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 flex items-center justify-center font-bold">
              {currentLocationPoc.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{currentLocationPoc.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentLocationPoc.phone}{currentLocationPoc.email ? ` · ${currentLocationPoc.email}` : ''}</p>
            </div>
            <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold ${
              currentLocationPoc.is_verified
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
            }`}>
              {currentLocationPoc.is_verified ? 'Verified' : 'Awaiting verification'}
            </span>
          </div>
        )}
        {isEdit && !currentLocationPoc && <Note tone="amber"><span className="font-bold">No contact assigned.</span> Choose one below.</Note>}

        {isEdit ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-5">
              {currentLocationPoc && (
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <input type="radio" name="poc_option_radio" checked={pocOption === 'keep'} onChange={() => { setPocOption('keep'); setDuplicatePocWarning(null); }} className={radio} />
                  Keep current contact
                </label>
              )}
              {existingPocs.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <input type="radio" name="poc_option_radio" checked={pocOption === 'existing'} onChange={() => { setPocOption('existing'); setDuplicatePocWarning(null); }} className={radio} />
                  Change to another contact
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">New staff member? Add them in <Link href="/dashboard/pocs" className="font-bold text-orange-600 dark:text-orange-400 hover:underline">Staff &amp; contacts</Link> first, then assign them here.</p>
          </div>
        ) : existingPocs.length > 0 && (
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">
              <input type="radio" name="poc_option_radio" checked={pocOption === 'existing'} onChange={() => { setPocOption('existing'); setDuplicatePocWarning(null); }} className={radio} />
              Choose an existing contact
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">
              <input type="radio" name="poc_option_radio" checked={pocOption === 'new'} onChange={() => setPocOption('new')} className={radio} />
              Add a new contact
            </label>
          </div>
        )}

        {pocOption === 'existing' && existingPocs.length > 0 && (
          <div>
            <label className={label} htmlFor="existing-poc">Staff member *</label>
            <select id="existing-poc" name="existing_poc_id" required className={input}>
              <option value="">Choose a contact</option>
              {uniquePocs.map(poc => (
                <option key={poc.id} value={poc.id}>{poc.name} ({poc.phone}){poc.is_verified ? '' : ' · awaiting verification'}</option>
              ))}
            </select>
            {existingPocs.some(p => !p.is_verified) && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5">A contact awaiting verification keeps the location offline until StashInn verifies them.</p>
            )}
          </div>
        )}

        {pocOption === 'new' && (
          <div className="space-y-4 rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/40 dark:bg-orange-950/20 p-4">
            <Note tone="amber">New contacts are verified by StashInn. The location stays offline until then.</Note>
            <div>
              <label className={label} htmlFor="poc-name">Full name *</label>
              <input id="poc-name" type="text" name="poc_name" required className={input} placeholder="As on their ID" onChange={(e) => checkDuplicatePoc(e.target.value, null, null)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="poc-phone">Mobile *</label>
                <input id="poc-phone" type="tel" name="poc_phone" required className={input} placeholder="10-digit mobile" onChange={(e) => checkDuplicatePoc(null, e.target.value, null)} />
              </div>
              <div>
                <label className={label} htmlFor="poc-email">Email</label>
                <input id="poc-email" type="email" name="poc_email" className={input} onChange={(e) => checkDuplicatePoc(null, null, e.target.value)} />
              </div>
            </div>
            {duplicatePocWarning && <Note tone="amber"><span className="font-bold">Already a contact elsewhere.</span> {duplicatePocWarning}</Note>}
            {!isEdit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={label} htmlFor="poc-id">ID proof (PDF or image, max 5 MB) *</label>
                  <input id="poc-id" type="file" name="poc_id_document" accept=".pdf,image/jpeg,image/png,image/webp" required className={fileInput} onChange={e => acceptFiles(e.currentTarget, 'doc', 'ID proof')} />
                </div>
                <div>
                  <label className={label} htmlFor="poc-photo">Contact photo (max 5 MB) *</label>
                  <input id="poc-photo" type="file" name="poc_photo" accept="image/jpeg,image/png,image/webp" required className={fileInput} onChange={e => acceptFiles(e.currentTarget, 'photo', 'Contact photo')} />
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Amenities & photos */}
      <Section title="Amenities & photos" subtitle="Clear photos and amenities help customers choose you, and affect your rates.">
        <div className="flex flex-wrap gap-2">
          {amenityOptions.map(a => (
            <label key={a.key} className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:border-orange-300 dark:hover:border-orange-700/60 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 dark:has-[:checked]:bg-orange-950/30 transition-colors">
              {locationType === 'garage' && a.column
                ? <input type="checkbox" name={a.column} defaultChecked={hasAmenity(a)} className="h-4 w-4 rounded text-orange-600 border-gray-300 dark:border-gray-600 focus:ring-orange-500" />
                : <input type="checkbox" name="amenities" value={a.label} defaultChecked={hasAmenity(a)} className="h-4 w-4 rounded text-orange-600 border-gray-300 dark:border-gray-600 focus:ring-orange-500" />}
              {a.label}
            </label>
          ))}
          {keptAmenities.map(v => <input key={v} type="hidden" name="amenities" value={v} />)}
        </div>

        <div>
          <p className={label}>Photos</p>
          {existingPhotos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
              {existingPhotos.map((photoUrl) => (
                <div key={photoUrl} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 group">
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setExistingPhotos(prev => prev.filter(p => p !== photoUrl))}
                    className="absolute top-1.5 right-1.5 rounded-full bg-black/60 hover:bg-red-600 p-1 text-white transition-colors"
                    aria-label="Remove photo"
                    title="Remove photo"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                  <input type="hidden" name="existing_photos" value={photoUrl} />
                </div>
              ))}
            </div>
          )}
          <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" className={fileInput} onChange={e => acceptFiles(e.currentTarget, 'photos', 'Location photos')} />
          {fileError && <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">{fileError}</p>}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Up to 5 photos in total. JPG, PNG or WebP, max 5 MB each. New photos are added to the ones above.</p>
        </div>
      </Section>

      <div className="flex justify-end gap-3 pt-2">
        <Link href={isEdit ? `/dashboard/locations/${initialData.id}` : '/dashboard/locations'} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          Cancel
        </Link>
        <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 min-w-[160px] px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm disabled:opacity-60 transition-colors">
          {isSubmitting ? 'Saving…' : isEdit ? (needsChanges ? 'Save & resubmit' : 'Save changes') : 'Add location'}
        </button>
      </div>
    </form>
  );
}
