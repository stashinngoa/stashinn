/**
 * Booking emails: the request the customer gets, the request the partner gets, and the
 * confirmation (with the exact address and partner contact) once the partner accepts.
 *
 * Wording lives in email_templates (Admin → Configuration → Email templates) under the slugs
 * below. Until those rows exist, or if one is missing, the built-in copy here is used. An
 * admin can switch a template off, which stops that email.
 */

import { createAdminClient } from '../supabase/server';

export const BOOKING_EMAIL_SLUGS = {
  customerRequest: 'booking_requested',
  partnerRequest: 'partner_booking_request',
  customerConfirmed: 'booking_confirmed',
} as const;

const p = (s: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${s}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:22px 0 6px;"><a href="${href}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:10px;">${label}</a></p>`;
const rows = (pairs: [string, string][]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:6px 0 18px;border:1px solid #e5e7eb;border-radius:12px;">${pairs
    .map(([k, v], i) => `<tr><td style="padding:11px 14px;font-size:13px;color:#6b7280;width:38%;${i ? 'border-top:1px solid #f3f4f6;' : ''}">${k}</td><td style="padding:11px 14px;font-size:14px;font-weight:600;color:#111827;${i ? 'border-top:1px solid #f3f4f6;' : ''}">${v}</td></tr>`)
    .join('')}</table>`;

/** Built-in copies of the templates (the migration inserts the same text for admins to edit). */
export const BOOKING_EMAIL_DEFAULTS: Record<string, { subject: string; body_html: string; variables: string[] }> = {
  [BOOKING_EMAIL_SLUGS.customerRequest]: {
    subject: 'Booking request received · #{{booking_ref}}',
    variables: ['customer_name', 'booking_ref', 'location_name', 'location_area', 'drop_off', 'pick_up', 'items', 'total', 'payment_method', 'dashboard_url'],
    body_html:
      `<h2 style="margin:0 0 12px;font-size:22px;color:#111827;">Hi {{customer_name}}, we've got your request</h2>` +
      p(`Your booking request at <strong>{{location_name}}</strong> has been sent to the partner. We'll email you as soon as they confirm it.`) +
      rows([['Booking', '#{{booking_ref}}'], ['Location', '{{location_name}}<br/><span style="font-weight:400;color:#6b7280;">{{location_area}}</span>'], ['Drop-off', '{{drop_off}}'], ['Pick-up', '{{pick_up}}'], ['Storing', '{{items}}'], ['Total', '₹{{total}}'], ['Payment', '{{payment_method}}']]) +
      p(`The exact address, directions and the partner's contact details are shared with you once the booking is confirmed.`) +
      button('{{dashboard_url}}', 'View my booking'),
  },
  [BOOKING_EMAIL_SLUGS.partnerRequest]: {
    subject: 'New booking request · {{location_name}}',
    variables: ['partner_name', 'booking_ref', 'location_name', 'customer_name', 'drop_off', 'pick_up', 'items', 'total', 'partner_amount', 'payment_method', 'dashboard_url'],
    body_html:
      `<h2 style="margin:0 0 12px;font-size:22px;color:#111827;">New booking request, {{partner_name}}</h2>` +
      p(`A customer wants to store with you at <strong>{{location_name}}</strong>. Please accept or decline it soon so they can plan their day.`) +
      rows([['Booking', '#{{booking_ref}}'], ['Customer', '{{customer_name}}'], ['Drop-off', '{{drop_off}}'], ['Pick-up', '{{pick_up}}'], ['Storing', '{{items}}'], ['Booking total', '₹{{total}}'], ['Your earnings', '₹{{partner_amount}}'], ['Payment', '{{payment_method}}']]) +
      button('{{dashboard_url}}', 'Accept or decline'),
  },
  [BOOKING_EMAIL_SLUGS.customerConfirmed]: {
    subject: 'Booking confirmed · {{location_name}}',
    variables: ['customer_name', 'booking_ref', 'location_name', 'address', 'directions_url', 'contact_name', 'contact_phone', 'drop_off', 'pick_up', 'items', 'total', 'checkin_otp', 'dashboard_url'],
    body_html:
      `<h2 style="margin:0 0 12px;font-size:22px;color:#111827;">You're all set, {{customer_name}}</h2>` +
      p(`<strong>{{location_name}}</strong> has confirmed your booking. Here's everything you need for drop-off.`) +
      `<div style="margin:6px 0 18px;padding:16px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;text-align:center;"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9a3412;">Check-in code</div><div style="font-size:32px;font-weight:900;letter-spacing:.25em;color:#111827;margin-top:4px;">{{checkin_otp}}</div><div style="font-size:13px;color:#6b7280;margin-top:4px;">Give this code to the partner when you drop off.</div></div>` +
      rows([['Booking', '#{{booking_ref}}'], ['Address', '{{address}}<br/><a href="{{directions_url}}" style="color:#ea580c;font-weight:700;">Get directions</a>'], ['Contact', '{{contact_name}}<br/><a href="tel:{{contact_phone}}" style="color:#ea580c;font-weight:700;">{{contact_phone}}</a>'], ['Drop-off', '{{drop_off}}'], ['Pick-up', '{{pick_up}}'], ['Storing', '{{items}}'], ['Total', '₹{{total}}']]) +
      button('{{dashboard_url}}', 'View my booking'),
  },
};

/** Wraps an email body in the StashInn header and footer. */
export function emailLayout(bodyHtml: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Inter,Segoe UI,Arial,sans-serif;">
<tr><td style="padding:20px 28px;border-bottom:1px solid #f3f4f6;"><span style="font-size:22px;font-weight:900;letter-spacing:-.02em;color:#111827;">Stash<span style="color:#f97316;">Inn</span></span></td></tr>
<tr><td style="padding:28px;">${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px;background:#f9fafb;font-size:12px;line-height:1.5;color:#6b7280;">You're receiving this because of a booking on StashInn. Need help? Reply to this email or visit the Help Centre.</td></tr>
</table></td></tr></table></body></html>`;
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Subject and full HTML for a booking email, or null when an admin has switched the template
 * off. Values are HTML-escaped; keys ending in _url are inserted as given.
 */
export async function renderBookingEmail(slug: string, vars: Record<string, string>): Promise<{ subject: string; html: string } | null> {
  let template: { subject: string; body_html: string; is_active?: boolean } | undefined;
  try {
    // Templates are admin-only under RLS, so read them with the service role
    const { data } = await createAdminClient().from('email_templates').select('subject, body_html, is_active').eq('slug', slug).maybeSingle();
    template = data ?? undefined;
  } catch {
    template = undefined;
  }
  if (template && template.is_active === false) return null;
  const t = template ?? BOOKING_EMAIL_DEFAULTS[slug];
  if (!t) return null;

  const fill = (text: string, html: boolean) =>
    text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
      const value = vars[key] ?? '';
      return html && !key.endsWith('_url') ? esc(value) : value;
    });
  return { subject: fill(t.subject, false), html: emailLayout(fill(t.body_html, true)) };
}

/** "Mon, 9 Nov, 11:00 am" in India time. */
export const emailTime = (d: Date | string) =>
  new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

/** The short reference customers and partners see ("#584583AE"). */
export const bookingRef = (id: string) => id.split('-')[0]!.toUpperCase();
