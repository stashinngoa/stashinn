'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateSystemConfig(formData: FormData) {
  const supabase = await createClient();
  const keys = Array.from(formData.keys()).filter(k => k !== '$ACTION_ID_1');

  for (const key of keys) {
    const value = formData.get(key);
    if (value) {
      await supabase
        .from('system_config')
        .update({ value: JSON.parse(value as string) }) // The values are stored as JSONB
        .eq('key', key);
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

  await supabase
    .from('email_templates')
    .update({ subject, body_html, is_active })
    .eq('id', id);

  revalidatePath('/dashboard/config');
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

  const { error } = await supabase
    .from('email_templates')
    .insert({
      slug,
      subject,
      body_html,
      variables,
      is_active: true
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/config');
}
