'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Partner tells the admin team they've made the changes asked for in the info request
export async function markInfoRequestDone() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: partner, error } = await supabase
    .from('partners')
    .update({ info_responded_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .not('info_requested_at', 'is', null)
    .select('id')
    .maybeSingle();
  if (error) return { error: error.message };
  if (!partner) return { error: 'There is no open request.' };

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'partner.info_request_answered',
    entity_type: 'partner',
    entity_id: partner.id,
  });

  revalidatePath('/dashboard', 'layout');
  return { error: null };
}
