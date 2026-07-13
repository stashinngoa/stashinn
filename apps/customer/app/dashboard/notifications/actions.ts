'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getNotifications(filters: {
  search?: string;
  category?: string;
  status?: string;
  dateRange?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
  }

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  if (filters.status === 'unread') {
    query = query.eq('is_read', false).eq('is_archived', false);
  } else if (filters.status === 'read') {
    query = query.eq('is_read', true).eq('is_archived', false);
  } else if (filters.status === 'archived') {
    query = query.eq('is_archived', true);
  } else {
    query = query.eq('is_archived', false);
  }

  if (filters.dateRange && filters.dateRange !== 'all') {
    const now = new Date();
    let startDate = new Date();
    
    if (filters.dateRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (filters.dateRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (filters.dateRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    }
    
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data, error } = await query.limit(500);
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data || [];
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
    
  revalidatePath('/dashboard/notifications');
}

export async function markMultipleAsRead(ids: string[]) {
  if (!ids.length) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('id', ids);
      
    revalidatePath('/dashboard/notifications');
  }
}

export async function archiveMultiple(ids: string[]) {
  if (!ids.length) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase
      .from('notifications')
      .update({ is_archived: true })
      .eq('user_id', user.id)
      .in('id', ids);
      
    revalidatePath('/dashboard/notifications');
  }
}

export async function markAllAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('is_archived', false);
      
    revalidatePath('/dashboard/notifications');
  }
}
