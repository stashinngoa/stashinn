'use client';

import { useEffect, useState } from 'react';

type PostOffice = { Name: string; BranchType: string; Block: string; District: string; State: string };

// "Panaji H.O" / "Calangute S.O" -> "Panaji" / "Calangute"
const clean = (name: string) => name.replace(/\s+[HSB]\.?O\.?$/i, '').trim();
const blockName = (b: string) => (b && b !== 'NA' ? b : '');

/**
 * Best guess at the town for an Indian PIN code (India Post data):
 * the head post office's town, else the only sub office's town, else the taluka/block.
 * The district (e.g. "North Goa") is a last resort, since it's rarely what people call their city.
 */
function pickCity(offices: PostOffice[]) {
  const head = offices.find(o => o.BranchType === 'Head Post Office');
  if (head) return clean(head.Name);
  const subs = offices.filter(o => o.BranchType === 'Sub Post Office');
  if (subs.length === 1) return clean(subs[0]!.Name);
  return blockName(offices[0]!.Block) || offices[0]!.District;
}

/**
 * When `pin` becomes a valid 6-digit code, looks it up and calls onResult with the state and
 * best-guess city. Returns the area names for that PIN, to offer as suggestions.
 */
export function usePinAutofill(pin: string, enabled: boolean, onResult: (r: { city: string; state: string }) => void) {
  const [areas, setAreas] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');

  useEffect(() => {
    if (!enabled || !/^[1-9]\d{5}$/.test(pin)) {
      setStatus('idle');
      setAreas([]);
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        const offices: PostOffice[] = data?.[0]?.Status === 'Success' ? data[0].PostOffice ?? [] : [];
        if (!offices.length) return setStatus('not_found');
        const city = pickCity(offices);
        onResult({ city, state: offices[0]!.State });
        // Suggestions: the chosen city first, then each area and the taluka
        setAreas([...new Set([city, ...offices.map(o => clean(o.Name)), blockName(offices[0]!.Block)].filter(Boolean))]);
        setStatus('found');
      })
      .catch(err => { if (err?.name !== 'AbortError') setStatus('not_found'); });
    return () => controller.abort();
    // onResult is a fresh closure each render; the lookup should only re-run for a new PIN
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, enabled]);

  return { areas, status };
}
