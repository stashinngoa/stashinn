'use client';

import { useState } from 'react';
import { REPUTATION_MAX } from '@stashinn/lib/services/reputation';
import Link from 'next/link';
import type { Amenity } from '@stashinn/lib/services/amenities';
import { updateScoringRules } from './actions';
import { fromFields, toFields } from './scoringPayload';

const TRANSIT = [
  { key: 'under_1km', label: 'Under 1 km', hint: 'High' },
  { key: '1_to_3km', label: '1 to 3 km', hint: 'Medium' },
  { key: 'over_3km', label: 'Over 3 km', hint: 'Low' },
];

const scopeText = (a: Amenity) => [a.applies_to.includes('luggage') && 'Luggage', a.applies_to.includes('garage') && 'Parking'].filter(Boolean).join(' & ');

// Reputation comes from each location's reviews: 15 with none, up to 30 (services/reputation.ts)
const REPUTATION_POINTS = REPUTATION_MAX;

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
// A field with a fixed unit inside its border. min-w-0 lets it shrink to fit narrow cards.
const fieldBox = 'flex items-center gap-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500';
const fieldInput = 'min-w-0 w-full py-2 bg-transparent border-0 p-0 text-sm text-right tabular-nums text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0';
const fieldUnit = 'shrink-0 text-xs font-semibold text-gray-400 dark:text-gray-500';

function SectionHeader({ title, subtitle, aside }: { title: string; subtitle: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div>
        <h2 className="font-extrabold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {aside}
    </div>
  );
}

function PointsRow({ id, label, hint, value, onChange }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{label}</span>
        {hint && <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
      </label>
      <div className={`${fieldBox} w-24 shrink-0`}>
        <input id={id} type="number" step="any" value={value} onChange={e => onChange(e.target.value)} placeholder="0" className={fieldInput} />
        <span className={fieldUnit}>pts</span>
      </div>
    </div>
  );
}

function RateCard({ title, stored, onChange, fields }: { title: string; stored: Record<string, string>; onChange: (key: string, v: string) => void; fields: string }) {
  const min = Number(stored.min_hr);
  const max = Number(stored.max_hr);
  const inverted = stored.min_hr !== '' && stored.max_hr !== '' && min > max;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {([['min_hr', 'Score 0'], ['max_hr', 'Score 100']] as const).map(([key, text]) => (
          <div key={key} className="min-w-0">
            <label htmlFor={`${fields}-${key}`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{text}</label>
            <div className={fieldBox}>
              <span className={fieldUnit}>₹</span>
              <input id={`${fields}-${key}`} type="number" step="any" min="0" required value={stored[key]} onChange={e => onChange(key, e.target.value)} className={fieldInput} />
            </div>
          </div>
        ))}
      </div>
      {inverted && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">The score 0 rate is above the score 100 rate, so better locations would cost less.</p>}
    </div>
  );
}

export default function ScoringForm({ initialRules, amenities: catalog }: { initialRules: any; amenities: Amenity[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [amenities, setAmenities] = useState(() => toFields(initialRules.amenity_weights, catalog.filter(a => a.is_active).map(a => a.key)));
  const [transit, setTransit] = useState(() => toFields(initialRules.transit_weights, TRANSIT.map(t => t.key)));
  const [luggage, setLuggage] = useState(() => toFields(initialRules.luggage_rates, ['min_hr', 'max_hr']));
  const [bike, setBike] = useState(() => toFields(initialRules.garage_bike_rates, ['min_hr', 'max_hr']));
  const [car, setCar] = useState(() => toFields(initialRules.garage_car_rates, ['min_hr', 'max_hr']));

  const set = (setter: React.Dispatch<React.SetStateAction<Record<string, string>>>) => (key: string, value: string) => {
    setMessage(null);
    setter(prev => ({ ...prev, [key]: value }));
  };

  const pts = (v: string | undefined) => Number(v) || 0;
  const amenityMax = Object.values(amenities).reduce((sum, v) => sum + Math.max(0, pts(v)), 0);
  const transitMax = Math.max(0, ...Object.values(transit).map(pts));
  const bestPossible = amenityMax + transitMax + REPUTATION_POINTS;

  // Keys in the saved rules that this form has no label for still show up, and are kept
  const activeAmenities = catalog.filter(a => a.is_active);
  const otherAmenities = Object.keys(amenities).filter(k => !activeAmenities.some(a => a.key === k));
  const otherTransit = Object.keys(transit).filter(k => !TRANSIT.some(t => t.key === k));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateScoringRules(formData);

    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      setMessage({ type: 'success', text: 'Scoring rules updated successfully.' });
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* The server action receives these rule groups as JSON */}
      <input type="hidden" name="amenity_weights" value={JSON.stringify(fromFields(amenities, initialRules.amenity_weights))} />
      <input type="hidden" name="transit_weights" value={JSON.stringify(fromFields(transit, initialRules.transit_weights))} />
      <input type="hidden" name="luggage_rates" value={JSON.stringify(fromFields(luggage, initialRules.luggage_rates))} />
      <input type="hidden" name="garage_bike_rates" value={JSON.stringify(fromFields(bike, initialRules.garage_bike_rates))} />
      <input type="hidden" name="garage_car_rates" value={JSON.stringify(fromFields(car, initialRules.garage_car_rates))} />

      {/* How it adds up */}
      <section className={`${card} grid grid-cols-3 sm:grid-cols-4 gap-px overflow-hidden bg-gray-100 dark:bg-gray-800`}>
        {[
          { label: 'Amenities', value: amenityMax },
          { label: 'Transit', value: transitMax },
          { label: 'Reputation', value: REPUTATION_POINTS },
        ].map(s => (
          <div key={s.label} className="flex items-baseline justify-between gap-2 px-4 py-3 bg-white dark:bg-gray-900">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">{s.label}</span>
            <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">+{s.value}</span>
          </div>
        ))}
        <div
          className="col-span-3 sm:col-span-1 flex items-baseline justify-between gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-950/30"
          title={bestPossible > 100 ? `${bestPossible} points, capped at 100` : 'Before any manual adjustment'}
        >
          <span className="text-xs font-bold text-orange-800 dark:text-orange-300 truncate">Best possible</span>
          <span className="text-lg font-black text-orange-700 dark:text-orange-400 tabular-nums">{Math.min(100, bestPossible)}<span className="text-xs font-bold">/100</span></span>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <section className={card}>
          <SectionHeader
            title="Amenity points"
            subtitle="Added once for each amenity a location offers. Leave blank for no points."
            aside={<Link href="/dashboard/config" className="shrink-0 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">Manage amenities →</Link>}
          />
          <div className="py-2 divide-y divide-gray-50 dark:divide-gray-800/60">
            {activeAmenities.map(a => (
              <PointsRow key={a.key} id={`am-${a.key}`} label={a.label} hint={scopeText(a)} value={amenities[a.key] ?? ''} onChange={v => set(setAmenities)(a.key, v)} />
            ))}
            {otherAmenities.map(k => {
              const known = catalog.find(a => a.key === k);
              return <PointsRow key={k} id={`am-${k}`} label={known?.label ?? k} hint={known ? `${scopeText(known)} · Inactive` : 'Custom key'} value={amenities[k] ?? ''} onChange={v => set(setAmenities)(k, v)} />;
            })}
          </div>
        </section>

        <div className="space-y-6">
          <section className={card}>
            <SectionHeader title="Transit points" subtitle="Based on the distance to transit an admin picks for each location." />
            <div className="py-2 divide-y divide-gray-50 dark:divide-gray-800/60">
              {TRANSIT.map(t => (
                <PointsRow key={t.key} id={`tr-${t.key}`} label={t.label} hint={t.hint} value={transit[t.key] ?? ''} onChange={v => set(setTransit)(t.key, v)} />
              ))}
              {otherTransit.map(k => (
                <PointsRow key={k} id={`tr-${k}`} label={k} hint="Custom key" value={transit[k] ?? ''} onChange={v => set(setTransit)(k, v)} />
              ))}
            </div>
          </section>

          <section className={card}>
            <SectionHeader title="Tax" subtitle="Added once to every location's rate. This is what customers pay at checkout." />
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <label htmlFor="gst-rate" className="text-sm font-semibold text-gray-900 dark:text-gray-100">GST rate</label>
              <div className={`${fieldBox} w-24`}>
                <input id="gst-rate" type="number" step="0.01" name="gst_rate" required defaultValue={initialRules.gst_rate} className={fieldInput} />
                <span className={fieldUnit}>%</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className={card}>
        <SectionHeader title="Hourly rate range" subtitle="A location's rate sits between these, in line with its score. Rates are before GST. SUVs use the car rate." />
        <div className="p-5 grid md:grid-cols-3 gap-4">
          <RateCard title="Luggage (per bag)" fields="luggage" stored={luggage} onChange={set(setLuggage)} />
          <RateCard title="Bike / scooter" fields="bike" stored={bike} onChange={set(setBike)} />
          <RateCard title="Car & SUV" fields="car" stored={car} onChange={set(setCar)} />
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
        {message && (
          <p role="status" className={`text-sm font-semibold ${message.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
