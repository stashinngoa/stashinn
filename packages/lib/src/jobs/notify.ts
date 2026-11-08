import type { Db } from '../services/bookingLifecycle';
import { ExternalNotificationService } from '../services/notifications';
import { bookingRef, emailLayout, emailTime, renderBookingEmail } from '../services/bookingEmails';
import { vehicleLabel } from '../services/bookingAvailability';

/** Booking columns the jobs read, with the location, partner and customer. */
export const BOOKING_FIELDS = `
  id, status, booking_type, num_bags, vehicle_type, start_time, end_time, created_at, confirmed_at,
  actual_checkin, actual_checkout, total_amount, checkin_otp, checkout_otp, customer_id, partner_id, location_id,
  partner_locations ( name, address_line1, address_line2, city, state, pincode, latitude, longitude ),
  partners ( id, business_name, user_id ),
  users!bookings_customer_id_fkey ( id, full_name, email, phone )`;

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const customerUrl = () => process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3000';
const partnerUrl = () => process.env.NEXT_PUBLIC_PARTNER_URL || 'http://localhost:3001';
const adminUrl = () => process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002';

export type JobBooking = Record<string, any>;

export const parts = (b: JobBooking) => ({
  location: one(b.partner_locations) as any,
  partner: one(b.partners) as any,
  customer: one(b.users) as any,
});

/** The location's main contact (primary first), for messages that need a phone number. */
export async function locationContacts(db: Db, locationId: string): Promise<{ name: string; phone: string; email: string | null; is_primary: boolean }[]> {
  const { data } = await db.from('partner_pocs').select('name, phone, email, is_primary').eq('location_id', locationId);
  return [...(data || [])].sort((a: any, b: any) => Number(!!b.is_primary) - Number(!!a.is_primary));
}

/** Template variables shared by the booking emails. */
export function bookingVars(b: JobBooking, contact?: { name: string; phone: string } | null) {
  const { location: loc, customer, partner } = parts(b);
  return {
    booking_ref: bookingRef(b.id),
    customer_name: (customer?.full_name || '').split(' ')[0] || 'there',
    partner_name: partner?.business_name || 'there',
    location_name: loc?.name || 'your StashInn location',
    address: [loc?.address_line1, loc?.address_line2, loc?.city, loc?.state, loc?.pincode].filter(Boolean).join(', '),
    directions_url: loc?.latitude && loc?.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}` : '',
    contact_name: contact?.name || loc?.name || 'The location',
    contact_phone: contact?.phone || '',
    drop_off: emailTime(b.start_time),
    pick_up: emailTime(b.end_time),
    items: b.booking_type === 'garage' ? vehicleLabel(b.vehicle_type) : `${b.num_bags} bag${b.num_bags === 1 ? '' : 's'}`,
    checkin_otp: b.checkin_otp || '',
    checkout_otp: b.checkout_otp || '',
    dashboard_url: `${customerUrl()}/dashboard`,
    search_url: `${customerUrl()}/search`,
  };
}

async function wantsEmail(db: Db, userId: string): Promise<boolean> {
  const { data } = await db.from('notification_preferences').select('email').eq('user_id', userId).maybeSingle();
  return data?.email !== false;
}

/**
 * In-app notice + templated email to one user. `urgent` sends the email even if the person
 * switched email off (the booking is happening now). Returns what was sent, for the ledger.
 */
export async function notifyUser(db: Db, user: { id: string; email?: string | null } | null, msg: {
  title: string;
  message: string;
  category: 'booking' | 'payment' | 'damage' | 'system';
  actionUrl?: string;
  email?: { slug: string; vars: Record<string, string> };
  urgent?: boolean;
}): Promise<Record<string, string>> {
  if (!user?.id) return { inApp: 'no user' };
  const out: Record<string, string> = {};
  const { error } = await db.from('notifications').insert({ user_id: user.id, title: msg.title, message: msg.message, category: msg.category, action_url: msg.actionUrl ?? null });
  out.inApp = error ? `failed: ${error.message}` : 'sent';

  if (msg.email && user.email) {
    if (!msg.urgent && !(await wantsEmail(db, user.id))) {
      out.email = 'off';
    } else {
      const rendered = await renderBookingEmail(msg.email.slug, msg.email.vars);
      if (!rendered) out.email = 'template off';
      else {
        const r = await ExternalNotificationService.sendEmail(user.email, rendered.subject, rendered.html);
        out.email = r.success ? 'sent' : `failed: ${r.error || 'unknown'}`;
      }
    }
  }
  return out;
}

/** The partner's account user (for in-app + email). */
export async function partnerUser(db: Db, partnerId: string): Promise<{ id: string; email: string | null } | null> {
  const { data } = await db.from('partners').select('user_id, users!partners_user_id_fkey(email)').eq('id', partnerId).maybeSingle();
  if (!data?.user_id) return null;
  return { id: data.user_id, email: (one(data.users) as any)?.email ?? null };
}

/**
 * Alert to admin staff by role (superadmins and admins without a role always get it):
 * in-app, plus an email when `email` is set.
 */
export async function alertAdmins(db: Db, roles: ('ops' | 'support' | 'finance')[], alert: {
  title: string;
  lines: string[];
  actionPath: string;
  category?: 'booking' | 'payment' | 'damage' | 'system';
  email?: boolean;
}): Promise<Record<string, string>> {
  const { data: admins } = await db.from('users').select('id, email, admin_role').eq('role', 'admin');
  const targets = (admins || []).filter((a: any) => !a.admin_role || a.admin_role === 'superadmin' || roles.includes(a.admin_role));
  if (!targets.length) return { admins: 'none' };

  await db.from('notifications').insert(targets.map((a: any) => ({
    user_id: a.id, title: alert.title, message: alert.lines.join(' '), category: alert.category || 'booking', action_url: alert.actionPath,
  })));

  let emailed = 0;
  if (alert.email) {
    const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = emailLayout(
      `<h2 style="margin:0 0 12px;font-size:20px;color:#111827;">${esc(alert.title)}</h2>` +
      alert.lines.map(l => `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#374151;">${esc(l)}</p>`).join('') +
      `<p style="margin:20px 0 0;"><a href="${adminUrl()}${alert.actionPath}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;">Open in admin</a></p>`,
    );
    for (const a of targets) {
      if (!a.email) continue;
      const r = await ExternalNotificationService.sendEmail(a.email, `[StashInn ops] ${alert.title}`, html);
      if (r.success) emailed++;
    }
  }
  return { admins: String(targets.length), adminEmails: String(emailed) };
}

export const urls = { customer: customerUrl, partner: partnerUrl, admin: adminUrl };

export const escapeHtml = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A small bordered table for emails; every cell is escaped. Rows may have 2+ columns. */
export function emailTable(rows: string[][], head?: string[]): string {
  const cell = (v: string, i: number, th = false) =>
    `<${th ? 'th' : 'td'} style="padding:9px 12px;font-size:13px;text-align:${i === 0 ? 'left' : 'right'};${th ? 'color:#6b7280;font-weight:700;background:#f9fafb;' : 'color:#111827;'}border-top:1px solid #f3f4f6;">${escapeHtml(v)}</${th ? 'th' : 'td'}>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:6px 0 18px;border:1px solid #e5e7eb;border-radius:12px;">` +
    (head ? `<tr>${head.map((h, i) => cell(h, i, true)).join('')}</tr>` : '') +
    rows.map(r => `<tr>${r.map((v, i) => cell(v, i)).join('')}</tr>`).join('') +
    `</table>`;
}

/** Sends a templated email to an address that isn't a user (e.g. a location contact). */
export async function emailAddress(to: string, slug: string, vars: Record<string, string>): Promise<string> {
  const rendered = await renderBookingEmail(slug, vars);
  if (!rendered) return 'template off';
  const r = await ExternalNotificationService.sendEmail(to, rendered.subject, rendered.html);
  return r.success ? 'sent' : `failed: ${r.error || 'unknown'}`;
}
