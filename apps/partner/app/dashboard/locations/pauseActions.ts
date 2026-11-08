'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { notifyAdmins } from '@stashinn/lib/services/notifications';
import { revalidatePath } from 'next/cache';
import { PAUSE_REASONS } from './pauseReasons';

const IST = 'Asia/Kolkata';
const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: IST });
const MAX_DAYS = 90;

async function ownLocation(locationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: 'Please sign in again.' } as const;
  const { data: partner } = await supabase.from('partners').select('id, business_name').eq('user_id', user.id).single();
  if (!partner) return { supabase, error: 'Partner profile not found.' } as const;
  const { data: location } = await supabase.from('partner_locations').select('id, name').eq('id', locationId).eq('partner_id', partner.id).maybeSingle();
  if (!location) return { supabase, error: 'Location not found.' } as const;
  return { supabase, user, partner, location } as const;
}

/** Bookings still active (pending, confirmed or stored) that overlap a planned pause. */
export async function getPauseConflicts(locationId: string, startsAt: string, endsAt: string) {
  const ctx = await ownLocation(locationId);
  if ('error' in ctx) return { error: ctx.error, bookings: [] };
  const { data } = await ctx.supabase
    .from('bookings')
    .select('id, status, start_time, end_time')
    .eq('location_id', locationId)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .lt('start_time', endsAt)
    .gt('end_time', startsAt)
    .order('start_time');
  return { error: null, bookings: data || [] };
}

export async function createPause(input: { locationId: string; startsAt: string; endsAt: string; reason: string; details: string }) {
  const ctx = await ownLocation(input.locationId);
  if ('error' in ctx) return { error: ctx.error };
  const { supabase, user, partner, location } = ctx;

  const start = new Date(input.startsAt);
  const end = new Date(input.endsAt);
  const reason = PAUSE_REASONS.find(r => r.value === input.reason);
  const details = input.details.trim();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: 'Choose a start and end time.' };
  if (end <= start) return { error: 'The pause must end after it starts.' };
  if (end.getTime() <= Date.now()) return { error: 'The pause must end in the future.' };
  if (start.getTime() < Date.now() - 10 * 60_000) return { error: 'The pause can\'t start in the past. Use "now" to pause straight away.' };
  if (end.getTime() - start.getTime() > MAX_DAYS * 86_400_000) return { error: `A pause can last at most ${MAX_DAYS} days.` };
  if (!reason) return { error: 'Choose a reason.' };
  if (reason.value === 'other' && !details) return { error: 'Tell us briefly why bookings are paused.' };

  const { data: clash } = await supabase
    .from('location_pauses')
    .select('starts_at, ends_at')
    .eq('location_id', location.id)
    .is('cancelled_at', null)
    .lt('starts_at', end.toISOString())
    .gt('ends_at', start.toISOString())
    .limit(1);
  if (clash?.length) return { error: `Bookings are already paused from ${fmt(clash[0]!.starts_at)} to ${fmt(clash[0]!.ends_at)}. Change that pause instead.` };

  const { error } = await supabase.from('location_pauses').insert({
    location_id: location.id,
    partner_id: partner.id,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    reason: reason.value,
    details: details || null,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  const { bookings } = await getPauseConflicts(location.id, start.toISOString(), end.toISOString());
  await notifyAdmins({
    title: 'Location bookings paused',
    message: `${partner.business_name} paused bookings at "${location.name}" from ${fmt(start.toISOString())} to ${fmt(end.toISOString())}. Reason: ${reason.label}${details ? ` (${details})` : ''}.${bookings.length ? ` ${bookings.length} existing booking${bookings.length === 1 ? '' : 's'} overlap this period.` : ''}`,
    category: 'system',
    targetRoles: ['ops'],
    action_url: `/dashboard/partners/${partner.id}`,
  });

  revalidatePath('/dashboard', 'layout');
  return { error: null };
}

/** Ends a running pause now, or cancels one that hasn't started. */
export async function endPause(pauseId: string) {
  const supabase = await createClient();
  const { data: pause } = await supabase
    .from('location_pauses')
    .select('id, location_id, starts_at, ends_at, partner_locations(name), partners(id, business_name)')
    .eq('id', pauseId)
    .is('cancelled_at', null)
    .maybeSingle();
  if (!pause) return { error: 'Pause not found.' };

  const now = new Date();
  const started = new Date(pause.starts_at) <= now;
  const { error } = await supabase
    .from('location_pauses')
    .update(started ? { ends_at: now.toISOString() } : { cancelled_at: now.toISOString() })
    .eq('id', pause.id);
  if (error) return { error: error.message };

  const partner = pause.partners as any;
  await notifyAdmins({
    title: started ? 'Location bookings resumed' : 'Planned pause cancelled',
    message: started
      ? `${partner?.business_name} resumed bookings at "${(pause.partner_locations as any)?.name}" early (paused until ${fmt(pause.ends_at)}).`
      : `${partner?.business_name} cancelled the pause planned at "${(pause.partner_locations as any)?.name}" for ${fmt(pause.starts_at)} – ${fmt(pause.ends_at)}.`,
    category: 'system',
    targetRoles: ['ops'],
    action_url: `/dashboard/partners/${partner?.id}`,
  });

  revalidatePath('/dashboard', 'layout');
  return { error: null };
}
