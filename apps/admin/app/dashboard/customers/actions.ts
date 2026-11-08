'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getAdminContext, requireAccess } from '../../../lib/adminAccess';

const CUSTOMERS_PAGE_SIZE = 25;

export type CustomerFilters = { q?: string; status?: string; sort?: string; page?: number };

// Characters that would break PostgREST's or()/ilike filter syntax
const cleanSearch = (q: string) => q.replace(/[,()*%\\]/g, ' ').trim();

/**
 * One page of customers plus per-customer booking totals. Read with the service role after
 * the access check (bookings and disputes of every customer).
 */
export async function getCustomers(filters: CustomerFilters = {}, opts: { all?: boolean } = {}) {
  await requireAccess('/dashboard/customers', 'view');
  const db = createServiceClient();
  const q = cleanSearch(filters.q || '');
  const page = Math.max(1, filters.page || 1);

  let query = db.from('users').select('id, full_name, email, phone, is_blocked, created_at', { count: 'exact' }).eq('role', 'customer');
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (filters.status === 'blocked') query = query.eq('is_blocked', true);
  if (filters.status === 'active') query = query.eq('is_blocked', false);
  query = filters.sort === 'oldest' ? query.order('created_at', { ascending: true })
    : filters.sort === 'name' ? query.order('full_name', { ascending: true, nullsFirst: false })
    : query.order('created_at', { ascending: false });
  query = opts.all ? query.limit(5000) : query.range((page - 1) * CUSTOMERS_PAGE_SIZE, page * CUSTOMERS_PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) return { error: error.message, customers: [], total: 0 };

  const ids = (data || []).map(c => c.id);
  const [{ data: bookings }, { data: disputes }] = ids.length
    ? await Promise.all([
        db.from('bookings').select('customer_id, status, total_amount, start_time, created_at').in('customer_id', ids),
        db.from('damage_reports').select('customer_id').in('customer_id', ids).in('status', ['submitted', 'under_review', 'escalated']),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }];

  const customers = (data || []).map(c => {
    const mine = (bookings || []).filter((b: any) => b.customer_id === c.id);
    const done = mine.filter((b: any) => b.status === 'checked_out');
    const upcoming = mine.filter((b: any) => ['pending', 'confirmed', 'checked_in'].includes(b.status));
    const last = mine.reduce<string | null>((m, b: any) => (!m || b.start_time > m ? b.start_time : m), null);
    return {
      ...c,
      bookings: mine.length,
      completed: done.length,
      upcoming: upcoming.length,
      spend: Math.round(done.reduce((s, b: any) => s + (Number(b.total_amount) || 0), 0) * 100) / 100,
      lastBooking: last,
      openDisputes: (disputes || []).filter((d: any) => d.customer_id === c.id).length,
    };
  });
  return { customers, total: count || 0 };
}

export type BlockResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Blocks or unblocks a customer. A blocked customer is signed out of the customer app on
 * their next page load and can't book (see apps/customer/middleware.ts and checkout).
 */
export async function setCustomerBlocked(userId: string, blocked: boolean, reason: string): Promise<BlockResult> {
  try {
    await requireAccess('/dashboard/customers');
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
  const note = reason.trim();
  if (blocked && note.length < 5) return { ok: false, error: 'Add a short reason for blocking (at least 5 characters).' };

  const db = createServiceClient();
  const { data: customer } = await db.from('users').select('id, role, is_blocked, full_name, email').eq('id', userId).maybeSingle();
  if (!customer || customer.role !== 'customer') return { ok: false, error: 'Customer not found.' };
  if (customer.is_blocked === blocked) return { ok: true, message: blocked ? 'Already blocked.' : 'Already active.' };

  const { error } = await db.from('users').update({ is_blocked: blocked, updated_at: new Date().toISOString() }).eq('id', userId);
  if (error) return { ok: false, error: error.message };

  const { user: admin } = await getAdminContext();
  await db.from('audit_logs').insert({
    user_id: admin?.id ?? null,
    action: blocked ? 'customer.blocked' : 'customer.unblocked',
    entity_type: 'users',
    entity_id: userId,
    old_values: { is_blocked: customer.is_blocked },
    new_values: { is_blocked: blocked, reason: note || null },
  });

  revalidatePath('/dashboard/customers');
  revalidatePath(`/dashboard/customers/${userId}`);
  return { ok: true, message: blocked ? `${customer.full_name || customer.email} is blocked. They'll be signed out and can't book.` : `${customer.full_name || customer.email} can use StashInn again.` };
}
