'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const pan = formData.get('pan') as string;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (pan && !panRegex.test(pan.toUpperCase())) {
    return { error: 'Invalid PAN format.' };
  }

  const { data: oldPartner } = await supabase.from('partners').select('gstin, pan').eq('user_id', user.id).single();
  
  const newGstin = (formData.get('gstin') as string)?.toUpperCase() || null;
  const newPan = pan.toUpperCase();
  
  const isFinancialChange = oldPartner && (oldPartner.gstin !== newGstin || oldPartner.pan !== newPan);

  const updatePayload: any = {
    business_name: formData.get('business_name') as string,
    business_type: formData.get('business_type') as string,
    gstin: newGstin,
    pan: newPan,
  };

  if (isFinancialChange) {
    updatePayload.status = 'pending';
    updatePayload.kyc_verified = false;
  }

  const { error } = await supabase
    .from('partners')
    .update(updatePayload)
    .eq('user_id', user.id);

  if (error) {
    console.error('Update Profile Error:', error);
    return { error: error.message };
  }
  
  // Insert Audit Log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'partner.profile_updated',
    entity_type: 'partners',
    entity_id: user.id, // technically this should be partner_id, but user_id works if schema allows
    old_values: { gstin: oldPartner?.gstin, pan: oldPartner?.pan },
    new_values: { gstin: newGstin, pan: newPan, status: updatePayload.status }
  });

  if (isFinancialChange) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabaseService.from('notifications').insert({
      user_id: user.id,
      title: 'Profile Under Review',
      message: 'Because you changed your GSTIN or PAN, your profile is temporarily under review again.',
      category: 'system'
    });
  }

  revalidatePath('/dashboard/profile');
  return { success: true };
}

export async function updateNotificationPreferences(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const in_app = formData.get('in_app') === 'on';
  const email = formData.get('email') === 'on';
  const whatsapp = formData.get('whatsapp') === 'on';
  const sms = formData.get('sms') === 'on';
  const push = formData.get('push') === 'on';

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        in_app,
        email,
        whatsapp,
        sms,
        push
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/profile');
  return { success: true };
}
