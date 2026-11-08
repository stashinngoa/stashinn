'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/** Marks the signed-in customer's notifications as read (all of them when no ids are given). */
export async function markRead(ids?: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  let q = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  if (ids) {
    if (!ids.length) return;
    q = q.in('id', ids);
  }
  await q;
  revalidatePath('/dashboard', 'layout'); // bell and menu badge
}

/** Archives (or restores) the signed-in customer's notifications. */
export async function setArchived(ids: string[], archived: boolean) {
  if (!ids.length) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('notifications').update({ is_archived: archived, ...(archived ? { is_read: true } : {}) }).eq('user_id', user.id).in('id', ids);
  revalidatePath('/dashboard', 'layout');
}
