'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateSystemConfig(formData: FormData) {
  const supabase = await createClient();
  const keys = Array.from(formData.keys()).filter(k => k !== '$ACTION_ID_1' && !k.startsWith('$ACTION_'));

  const { data: { user } } = await supabase.auth.getUser();

  for (const key of keys) {
    const value = formData.get(key) as string;
    if (value !== null) {
      // 1. Validate Business Logic Limits
      if (key === 'default_commission_rate') {
        const val = parseFloat(value);
        if (isNaN(val) || val < 0 || val > 100) {
          throw new Error('Default Commission must be between 0 and 100.');
        }
      } else if (key === 'booking_min_hours') {
        const val = parseInt(value);
        if (isNaN(val) || val < 1) {
          throw new Error('Min Booking Hours must be at least 1.');
        }
      } else if (key === 'booking_max_days') {
        const val = parseInt(value);
        if (isNaN(val) || val < 1) {
          throw new Error('Max Booking Days must be at least 1.');
        }
      } else if (key === 'cancellation_window_hours') {
        const val = parseInt(value);
        if (isNaN(val) || val < 0) {
          throw new Error('Cancellation Window Hours cannot be negative.');
        }
      } else if (key === 'support_email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error('Support Email must be a valid email address.');
        }
      }

      const { data: oldRow } = await supabase.from('system_config').select('value').eq('key', key).single();
      
      let parsedValue: any = value;
      if (!isNaN(Number(value)) && value.trim() !== '') {
        parsedValue = Number(value);
      } else if (value === 'true') {
        parsedValue = true;
      } else if (value === 'false') {
        parsedValue = false;
      }

      await supabase
        .from('system_config')
        .update({ value: parsedValue })
        .eq('key', key);

      // 2. Add Audit Log Entry
      if (user && oldRow && JSON.stringify(oldRow.value) !== JSON.stringify(parsedValue)) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'config.system_updated',
          entity_type: 'system_config',
          entity_id: key,
          old_values: { value: oldRow.value },
          new_values: { value: parsedValue }
        });
      }
    }
  }

  revalidatePath('/dashboard/config');
}

export async function updateEmailTemplate(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const subject = formData.get('subject') as string;
  const body_html = formData.get('body_html') as string;
  const is_active = formData.get('is_active') === 'true';

  const { error } = await supabase
    .from('email_templates')
    .update({ subject, body_html, is_active })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'config.template_updated',
      entity_type: 'email_templates',
      entity_id: id,
      new_values: { subject, body_html, is_active }
    });
  }

  revalidatePath('/dashboard/config');
  return { success: true };
}

export async function createEmailTemplate(formData: FormData) {
  const supabase = await createClient();
  const slug = formData.get('slug') as string;
  const subject = formData.get('subject') as string;
  const body_html = formData.get('body_html') as string;
  const variablesStr = formData.get('variables') as string;
  
  const variables = variablesStr 
    ? variablesStr.split(',').map(v => v.trim()).filter(Boolean)
    : [];

  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      slug,
      subject,
      body_html,
      variables,
      is_active: true
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'config.template_created',
      entity_type: 'email_templates',
      entity_id: data.id,
      new_values: { slug, subject, body_html, variables }
    });
  }

  revalidatePath('/dashboard/config');
  return { success: true };
}
