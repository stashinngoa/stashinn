'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { notifyAdmins } from '@stashinn/lib/services/notifications';
import { markInfoRequestAnswered } from '../../../lib/infoRequest';
import { isValidGstin, isValidPan, isValidPhone } from '../../onboarding/validation';
import { BUSINESS_TYPES } from './profileShared';

export type ProfileResult = { success: true; message: string; error?: undefined } | { success?: undefined; error: string };

const text = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session has expired. Please sign in again.' };

  const { data: old } = await supabase.from('partners').select('id, business_name, business_type, gstin, pan, status').eq('user_id', user.id).single();
  if (!old) return { error: 'Partner account not found.' };

  const businessName = text(formData, 'business_name').replace(/\s+/g, ' ');
  const businessType = text(formData, 'business_type');
  const pan = text(formData, 'pan').toUpperCase().replace(/\s/g, '');
  const individual = businessType === 'Individual';
  // Individuals have no GSTIN field; keep one already on file rather than silently deleting it
  const gstin = individual ? old.gstin : (text(formData, 'gstin').toUpperCase().replace(/\s/g, '') || null);

  if (businessName.length < 2 || businessName.length > 120) return { error: individual ? 'Enter your full name.' : 'Enter your business name.' };
  if (!BUSINESS_TYPES.some(t => t.value === businessType)) return { error: 'Choose a business type.' };
  if (!isValidPan(pan)) return { error: 'Enter a valid PAN, like ABCDE1234F.' };
  if (gstin && !isValidGstin(gstin)) return { error: 'Enter a valid 15-character GSTIN, or leave it blank.' };
  if (gstin && gstin.slice(2, 12) !== pan) return { error: 'The GSTIN doesn’t match the PAN (characters 3–12 of a GSTIN are the PAN).' };

  const taxChange = (old.gstin || null) !== gstin || (old.pan || '') !== pan;
  const payload: Record<string, unknown> = { business_name: businessName, business_type: businessType, gstin, pan };
  if (taxChange) {
    // A live partner goes back to review; suspended or rejected partners keep their status
    if (old.status === 'approved') payload.status = 'pending';
    payload.kyc_verified = false;
  }

  const { error } = await supabase.from('partners').update(payload).eq('id', old.id);
  if (error) return { error: `Couldn’t save: ${error.message}` };

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'partner.profile_updated',
    entity_type: 'partners',
    entity_id: old.id,
    old_values: { business_name: old.business_name, business_type: old.business_type, gstin: old.gstin, pan: old.pan, status: old.status },
    new_values: { business_name: businessName, business_type: businessType, gstin, pan, status: payload.status ?? old.status },
  });

  if (taxChange) {
    await createServiceClient().from('notifications').insert({
      user_id: user.id,
      title: 'Tax details under review',
      message: old.status === 'approved'
        ? 'You changed your PAN or GSTIN, so your account is back under review. Your locations take new bookings again once StashInn re-checks it.'
        : 'You changed your PAN or GSTIN. StashInn will check the new details.',
      category: 'system',
      action_url: '/dashboard/profile',
    });
    await notifyAdmins({
      title: 'Partner changed tax details',
      message: `${businessName} changed their ${[(old.pan || '') !== pan ? 'PAN' : '', (old.gstin || null) !== gstin ? 'GSTIN' : ''].filter(Boolean).join(' and ')}${old.status === 'approved' ? '; the account is back under review' : ''}.`,
      category: 'system',
      targetRoles: ['ops'],
      action_url: `/dashboard/partners/${old.id}`,
    }).catch(() => null);
  }

  await markInfoRequestAnswered(supabase, old.id, 'business_details');
  revalidatePath('/dashboard', 'layout');
  return {
    success: true,
    message: taxChange && old.status === 'approved' ? 'Saved. Your account is back under review until StashInn checks the new tax details.' : 'Business details saved.',
  };
}

/** The signed-in person's own name and mobile (used for SMS and WhatsApp alerts). */
export async function updateAccount(formData: FormData): Promise<ProfileResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session has expired. Please sign in again.' };
  const fullName = text(formData, 'full_name').replace(/\s+/g, ' ');
  const phone = text(formData, 'phone');
  if (fullName.length < 2 || fullName.length > 80) return { error: 'Enter your full name.' };
  if (phone && !isValidPhone(phone)) return { error: 'Enter a valid 10-digit mobile number, or leave it blank.' };
  const digits = phone.replace(/\D/g, '').slice(-10);
  const { error } = await supabase.from('users').update({ full_name: fullName, phone: digits ? `+91${digits}` : null }).eq('id', user.id);
  if (error) return { error: `Couldn’t save: ${error.message}` };
  revalidatePath('/dashboard/profile');
  return { success: true, message: 'Your details are saved.' };
}

export async function updateNotificationPreferences(formData: FormData): Promise<ProfileResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session has expired. Please sign in again.' };

  const on = (k: string) => formData.get(k) === 'on';
  const next = { in_app: on('in_app'), email: on('email'), whatsapp: on('whatsapp'), sms: on('sms'), daily_plan: on('daily_plan') };
  if (next.sms || next.whatsapp) {
    const { data: me } = await supabase.from('users').select('phone').eq('id', user.id).maybeSingle();
    if (!me?.phone) return { error: 'Add your mobile number under “Your account” first, so we know where to send SMS and WhatsApp alerts.' };
  }

  const { data: oldPrefs } = await supabase.from('notification_preferences').select('in_app, email, whatsapp, sms, daily_plan').eq('user_id', user.id).maybeSingle();
  const { error } = await supabase.from('notification_preferences').upsert({ user_id: user.id, ...next }, { onConflict: 'user_id' });
  if (error) return { error: `Couldn’t save: ${error.message}` };

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'partner.notifications_preferences_updated',
    entity_type: 'notification_preferences',
    entity_id: user.id,
    old_values: oldPrefs || {},
    new_values: next,
  });
  revalidatePath('/dashboard/profile');
  return { success: true, message: 'Notification settings saved.' };
}
