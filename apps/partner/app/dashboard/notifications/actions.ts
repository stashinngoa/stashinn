'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@stashinn/lib/supabase/server';

export type NotificationFilters = { search?: string; category?: string; status?: string; range?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORIES = ['booking', 'payment', 'damage', 'system'];

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** The signed-in partner's notifications. Day ranges are India time. */
export async function getNotifications(f: NotificationFilters) {
  const { supabase, user } = await me();
  if (!user) return [];

  let query = supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  // Characters that would break the or() filter are dropped
  const search = String(f.search || '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 60);
  if (search) query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
  if (f.category && CATEGORIES.includes(f.category)) query = query.eq('category', f.category);

  if (f.status === 'unread') query = query.eq('is_read', false).eq('is_archived', false);
  else if (f.status === 'archived') query = query.eq('is_archived', true);
  else query = query.eq('is_archived', false);

  if (f.range === 'today' || f.range === 'week' || f.range === 'month') {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const start = Date.parse(`${today}T00:00:00+05:30`) - (f.range === 'week' ? 6 : f.range === 'month' ? 29 : 0) * 864e5;
    query = query.gte('created_at', new Date(start).toISOString());
  }

  const { data, error } = await query.limit(500);
  if (error) {
    console.error('[NOTIFICATIONS] load failed:', error.message);
    return [];
  }
  return data || [];
}

async function update(ids: string[] | 'all', changes: Record<string, boolean>) {
  const { supabase, user } = await me();
  if (!user) return;
  let q = supabase.from('notifications').update(changes).eq('user_id', user.id);
  if (ids !== 'all') {
    const clean = ids.filter(id => UUID.test(id));
    if (!clean.length) return;
    q = q.in('id', clean);
  } else {
    q = q.eq('is_read', false).eq('is_archived', false);
  }
  await q;
  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard', 'layout');
}

export async function markAsRead(id: string) { await update([id], { is_read: true }); }
export async function markMultipleAsRead(ids: string[]) { await update(ids, { is_read: true }); }
export async function markMultipleAsUnread(ids: string[]) { await update(ids, { is_read: false }); }
export async function archiveMultiple(ids: string[]) { await update(ids, { is_archived: true, is_read: true }); }
export async function restoreMultiple(ids: string[]) { await update(ids, { is_archived: false }); }
export async function markAllAsRead() { await update('all', { is_read: true }); }
