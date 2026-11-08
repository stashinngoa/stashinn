'use client';

import { COLLECTION_METHODS, type CollectedVia } from '@stashinn/lib/services/dropoffPayment';

export type Collect = { total: string; owe: string; share: string };

/** Pay at drop-off: who received the customer's money. Decides whether the partner owes StashInn. */
export default function CollectionChoice({ collect, value, onChange, reference, onReference }: {
  collect: Collect;
  value: CollectedVia | '';
  onChange: (v: CollectedVia) => void;
  reference: string;
  onReference: (v: string) => void;
}) {
  const result = (v: CollectedVia) =>
    v === 'stashinn_qr'
      ? `StashInn pays you ${collect.share} once the QR payment is confirmed.`
      : `You keep ${collect.total} and send StashInn ${collect.owe} (commission + GST) after pick-up.`;

  return (
    <fieldset className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-3.5">
      <legend className="sr-only">How did the customer pay?</legend>
      <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Collect {collect.total}. How did the customer pay?</p>
      <div className="mt-2 space-y-1.5">
        {COLLECTION_METHODS.map(m => (
          <label key={m.value} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
            value === m.value ? 'border-orange-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white' : 'border-amber-200/80 dark:border-amber-800/50 bg-white/60 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:border-amber-300'}`}>
            <input type="radio" name="collected_via" value={m.value} checked={value === m.value} onChange={() => onChange(m.value)} className="mt-0.5 accent-orange-600" />
            <span className="min-w-0">
              <span className="block font-semibold">{m.label}</span>
              {value === m.value && <span className="block text-xs text-gray-600 dark:text-gray-400">{result(m.value)}</span>}
            </span>
          </label>
        ))}
      </div>
      {value === 'stashinn_qr' && (
        <label className="mt-2 block">
          <span className="text-xs font-bold text-amber-900 dark:text-amber-200">UPI reference from the customer’s payment screen <span className="font-normal">(optional, helps us confirm it faster)</span></span>
          <input value={reference} onChange={e => onReference(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 40))} placeholder="e.g. 412345678901"
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 font-mono text-sm text-gray-900 dark:text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
        </label>
      )}
      {!value && <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-300">Check the money has arrived before you continue. You owe StashInn its share only when the customer paid you.</p>}
    </fieldset>
  );
}
