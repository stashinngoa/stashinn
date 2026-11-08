'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@stashinn/lib/supabase/server';
import { notifyAdmins } from '@stashinn/lib/services/notifications';
import { markInfoRequestAnswered } from '../../../lib/infoRequest';
import { ONBOARDING_LIMITS, checkFiles, isValidEmail, isValidPhone } from '../../onboarding/validation';
import { phoneKey } from './contactShared';

export type PocResult = { ok: true; message: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const file = (fd: FormData, k: string) => { const f = fd.get(k); return f && typeof f !== 'string' && f.size > 0 ? f : null; };
const extOf = (f: File) => ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[f.type] || 'bin';

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session has expired. Please sign in again.' } as const;
  const { data: partner } = await supabase.from('partners').select('id, status, business_name').eq('user_id', user.id).maybeSingle();
  if (!partner) return { error: 'Partner account not found.' } as const;
  return { supabase, user, partner };
}
type Ctx = Exclude<Awaited<ReturnType<typeof context>>, { error: string }>;

/** All rows for one person (they're stored once per assigned location). */
async function personRows(ctx: Ctx, ids: string[]) {
  const clean = ids.filter(id => UUID.test(id));
  if (!clean.length) return null;
  const { data } = await ctx.supabase.from('partner_pocs').select('*').eq('partner_id', ctx.partner.id).in('id', clean);
  if (!data?.length || data.length !== clean.length) return null;
  const key = phoneKey(data[0]!.phone);
  if (data.some(r => phoneKey(r.phone) !== key)) return null;
  // Include any rows for the same person the page didn't know about
  const { data: all } = await ctx.supabase.from('partner_pocs').select('*').eq('partner_id', ctx.partner.id);
  return (all || []).filter(r => phoneKey(r.phone) === key);
}

async function upload(ctx: Ctx, f: File, kind: 'id' | 'photo') {
  const path = `${ctx.partner.id}/poc_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${extOf(f)}`;
  const { error } = await ctx.supabase.storage.from('kyc-documents').upload(path, f, { contentType: f.type });
  if (error) throw new Error(`Couldn’t upload the ${kind === 'id' ? 'ID document' : 'photo'}: ${error.message}`);
  return path;
}

function refresh() {
  revalidatePath('/dashboard/pocs');
  revalidatePath('/dashboard/locations', 'layout');
  revalidatePath('/dashboard');
}

/** Add a contact, or edit one (when poc_ids is set). */
export async function savePoc(formData: FormData): Promise<PocResult> {
  const ctx = await context();
  if ('error' in ctx) return { ok: false, error: ctx.error! };
  const approved = ctx.partner.status === 'approved';

  const ids = text(formData, 'poc_ids').split(',').filter(Boolean);
  const editing = ids.length > 0;
  const name = text(formData, 'name').replace(/\s+/g, ' ');
  const phone = text(formData, 'phone');
  const email = text(formData, 'email').toLowerCase();
  const idDoc = file(formData, 'poc_id_document');
  const photo = file(formData, 'poc_photo');

  if (name.length < 2 || name.length > 80) return { ok: false, error: 'Enter the contact’s full name.' };
  if (!isValidPhone(phone)) return { ok: false, error: 'Enter a valid 10-digit mobile number.' };
  if (email && !isValidEmail(email)) return { ok: false, error: 'Enter a valid email address, or leave it blank.' };
  const docRule = { maxCount: 1, maxMb: ONBOARDING_LIMITS.docMaxMb, types: ONBOARDING_LIMITS.docTypes };
  const photoRule = { maxCount: 1, maxMb: ONBOARDING_LIMITS.photoMaxMb, types: ONBOARDING_LIMITS.imageTypes };
  const fileError = (idDoc && checkFiles([idDoc], docRule, 'ID document')) || (photo && checkFiles([photo], photoRule, 'Photo'));
  if (fileError) return { ok: false, error: fileError };

  // Locations must be this partner's
  const { data: locations } = await ctx.supabase.from('partner_locations').select('id, name, is_active, admin_status').eq('partner_id', ctx.partner.id);
  const valid = new Map((locations || []).map(l => [l.id, l]));
  const locIds = [...new Set(formData.getAll('location_id').map(String))].filter(id => valid.has(id));

  // Same person can't be added twice
  const { data: everyone } = await ctx.supabase.from('partner_pocs').select('id, phone, is_primary').eq('partner_id', ctx.partner.id);
  const clash = (everyone || []).find(r => phoneKey(r.phone) === phoneKey(phone) && !ids.includes(r.id));

  try {
    if (!editing) {
      if (clash) return { ok: false, error: 'Someone with this phone number is already a contact. Edit them instead.' };
      if (!idDoc || !photo) return { ok: false, error: 'Add an ID document and a photo so StashInn can verify this contact.' };
      const [idPath, photoPath] = [await upload(ctx, idDoc, 'id'), await upload(ctx, photo, 'photo')];
      const makePrimary = !(everyone || []).some(r => r.is_primary);
      const base = { partner_id: ctx.partner.id, name, phone, email: email || null, is_primary: makePrimary, is_verified: false, id_document_url: idPath, photo_url: photoPath };
      const { error } = await ctx.supabase.from('partner_pocs').insert((locIds.length ? locIds : [null]).map(location_id => ({ ...base, location_id })));
      if (error) return { ok: false, error: `Couldn’t add the contact: ${error.message}` };
      await markInfoRequestAnswered(ctx.supabase, ctx.partner.id, 'contact');
      refresh();
      return { ok: true, message: `${name} added. StashInn will verify their ID, usually within a working day.` };
    }

    const rows = await personRows(ctx, ids);
    if (!rows) return { ok: false, error: 'Contact not found. Refresh and try again.' };
    if (clash) return { ok: false, error: 'Another contact already uses this phone number.' };
    const current = rows[0]!;
    const identityChange = name !== current.name || phoneKey(phone) !== phoneKey(current.phone) || !!idDoc || !!photo;
    if (approved && identityChange) {
      return { ok: false, error: 'Your account is live, so a name, phone or document change has to be checked by StashInn. Use “Request a change” instead.' };
    }

    const before = new Set(rows.map(r => r.location_id).filter(Boolean) as string[]);
    const removed = [...before].filter(id => !locIds.includes(id));
    // A live location must keep at least one verified contact, or it stops taking bookings
    if (approved && removed.length) {
      const { data: others } = await ctx.supabase.from('partner_pocs').select('location_id, phone, is_verified').eq('partner_id', ctx.partner.id).in('location_id', removed);
      const orphan = removed.find(id => {
        const loc = valid.get(id);
        if (!loc || !loc.is_active || loc.admin_status !== 'approved') return false;
        return !(others || []).some(o => o.location_id === id && o.is_verified && phoneKey(o.phone) !== phoneKey(current.phone));
      });
      if (orphan) return { ok: false, error: `${valid.get(orphan)!.name} would have no verified contact left and would stop taking bookings. Assign another verified contact there first.` };
    }

    // 1. Shared details on every row (changing name, phone or documents needs verifying again)
    const shared: Record<string, unknown> = { name, phone, email: email || null };
    if (idDoc) shared.id_document_url = await upload(ctx, idDoc, 'id');
    if (photo) shared.photo_url = await upload(ctx, photo, 'photo');
    const { data: updated, error: upErr } = await ctx.supabase.from('partner_pocs').update(shared).in('id', rows.map(r => r.id)).select('*');
    if (upErr) return { ok: false, error: `Couldn’t save: ${upErr.message}` };
    const person = updated?.[0] ?? { ...current, ...shared };

    // 2. Newly assigned locations first, then remove the old ones (so a location is never left without anyone)
    const added = locIds.filter(id => !before.has(id));
    const template = { partner_id: ctx.partner.id, name: person.name, phone: person.phone, email: person.email, is_primary: person.is_primary, is_verified: person.is_verified, id_document_url: person.id_document_url, photo_url: person.photo_url };
    const unassigned = rows.find(r => !r.location_id);
    if (added.length) {
      if (unassigned) {
        // Reuse the "not assigned" row for the first location
        const { error } = await ctx.supabase.from('partner_pocs').update({ location_id: added[0] }).eq('id', unassigned.id);
        if (error) return { ok: false, error: `Couldn’t assign the location: ${error.message}` };
      }
      const rest = unassigned ? added.slice(1) : added;
      if (rest.length) {
        const { error } = await ctx.supabase.from('partner_pocs').insert(rest.map(location_id => ({ ...template, location_id })));
        if (error) return { ok: false, error: `Couldn’t assign the locations: ${error.message}` };
      }
    }
    if (removed.length) {
      const removeRows = rows.filter(r => r.location_id && removed.includes(r.location_id));
      if (!locIds.length && !unassigned && removeRows.length) {
        // Keep the person on file, just not assigned anywhere
        const [keep, ...drop] = removeRows;
        await ctx.supabase.from('partner_pocs').update({ location_id: null }).eq('id', keep!.id);
        if (drop.length) await ctx.supabase.from('partner_pocs').delete().in('id', drop.map(r => r.id));
      } else if (removeRows.length) {
        await ctx.supabase.from('partner_pocs').delete().in('id', removeRows.map(r => r.id));
      }
    }

    await markInfoRequestAnswered(ctx.supabase, ctx.partner.id, 'contact');
    refresh();
    return { ok: true, message: identityChange && current.is_verified ? `${name} saved. They need verifying again before their locations go live.` : `${name} saved.` };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Something went wrong. Please try again.' };
  }
}

export async function deletePoc(idsCsv: string): Promise<PocResult> {
  const ctx = await context();
  if ('error' in ctx) return { ok: false, error: ctx.error! };
  if (ctx.partner.status === 'approved') return { ok: false, error: 'Your account is live, so removing a contact has to go through StashInn. Use “Request a change”.' };
  const rows = await personRows(ctx, idsCsv.split(','));
  if (!rows) return { ok: false, error: 'Contact not found. Refresh and try again.' };
  if (rows.some(r => r.is_primary)) return { ok: false, error: 'This is your primary contact. Make someone else primary first.' };
  const { error } = await ctx.supabase.from('partner_pocs').delete().in('id', rows.map(r => r.id));
  if (error) return { ok: false, error: `Couldn’t remove the contact: ${error.message}` };
  refresh();
  return { ok: true, message: `${rows[0]!.name} removed.` };
}

export async function makePrimary(idsCsv: string): Promise<PocResult> {
  const ctx = await context();
  if ('error' in ctx) return { ok: false, error: ctx.error! };
  const rows = await personRows(ctx, idsCsv.split(','));
  if (!rows) return { ok: false, error: 'Contact not found. Refresh and try again.' };
  const ids = rows.map(r => r.id);
  // Set the new primary first so there's never a moment without one
  const { error } = await ctx.supabase.from('partner_pocs').update({ is_primary: true }).in('id', ids);
  if (error) return { ok: false, error: `Couldn’t update: ${error.message}` };
  const { data: others } = await ctx.supabase.from('partner_pocs').select('id').eq('partner_id', ctx.partner.id).eq('is_primary', true);
  const clear = (others || []).map(o => o.id).filter(id => !ids.includes(id));
  if (clear.length) await ctx.supabase.from('partner_pocs').update({ is_primary: false }).in('id', clear);
  refresh();
  return { ok: true, message: `${rows[0]!.name} is now your primary contact.` };
}

/** Live partners can't change a verified contact's identity themselves; this asks the StashInn team. */
export async function requestPocChange(formData: FormData): Promise<PocResult> {
  const ctx = await context();
  if ('error' in ctx) return { ok: false, error: ctx.error! };
  const rows = await personRows(ctx, text(formData, 'poc_ids').split(','));
  if (!rows) return { ok: false, error: 'Contact not found. Refresh and try again.' };
  const kind = text(formData, 'kind') === 'remove' ? 'remove' : 'change';
  const description = text(formData, 'description').slice(0, 1000);
  if (description.length < 10) return { ok: false, error: 'Please describe what should change (at least a few words).' };

  const subject = `Contact ${kind === 'remove' ? 'removal' : 'change'}: ${rows[0]!.name}`;
  const { data: open } = await ctx.supabase.from('support_tickets').select('id').eq('partner_id', ctx.partner.id).eq('subject', subject).in('status', ['open', 'in_progress']).limit(1);
  if (open?.length) return { ok: false, error: 'You already have an open request for this contact. We’ll be in touch about it.' };

  const { error } = await ctx.supabase.from('support_tickets').insert({ partner_id: ctx.partner.id, subject, description, status: 'open' });
  if (error) return { ok: false, error: `Couldn’t send the request: ${error.message}` };
  await notifyAdmins({
    title: 'Partner contact change request',
    message: `${ctx.partner.business_name} asked for a contact ${kind === 'remove' ? 'removal' : 'change'} (${rows[0]!.name}): ${description.slice(0, 160)}`,
    category: 'system',
    targetRoles: ['ops'],
    action_url: `/dashboard/partners/${ctx.partner.id}/pocs`,
  }).catch(() => null);
  refresh();
  return { ok: true, message: 'Request sent. The StashInn team will contact you, usually within a working day.' };
}
