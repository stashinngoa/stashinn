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
  customerDroppedOff: 'booking_dropped_off',
  customerPickedUp: 'booking_picked_up',
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
  [BOOKING_EMAIL_SLUGS.customerDroppedOff]: {
    subject: 'Dropped off at {{location_name}} · #{{booking_ref}}',
    variables: ['customer_name', 'booking_ref', 'location_name', 'dropped_off', 'pick_up', 'items', 'checkout_otp', 'dashboard_url'],
    body_html:
      `<h2 style="margin:0 0 12px;font-size:22px;color:#111827;">Your things are safe, {{customer_name}}</h2>` +
      p(`<strong>{{location_name}}</strong> has checked in your {{items}}. Keep the pick-up code below handy.`) +
      `<div style="margin:6px 0 18px;padding:16px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;text-align:center;"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9a3412;">Pick-up code</div><div style="font-size:32px;font-weight:900;letter-spacing:.25em;color:#111827;margin-top:4px;">{{checkout_otp}}</div><div style="font-size:13px;color:#6b7280;margin-top:4px;">Give this code to the partner when you collect your things.</div></div>` +
      rows([['Booking', '#{{booking_ref}}'], ['Dropped off', '{{dropped_off}}'], ['Pick up by', '{{pick_up}}'], ['Storing', '{{items}}']]) +
      button('{{dashboard_url}}', 'View my booking'),
  },
  [BOOKING_EMAIL_SLUGS.customerPickedUp]: {
    subject: 'Picked up · #{{booking_ref}}',
    variables: ['customer_name', 'booking_ref', 'location_name', 'dropped_off', 'picked_up', 'items', 'total', 'dashboard_url'],
    body_html:
      `<h2 style="margin:0 0 12px;font-size:22px;color:#111827;">All done, {{customer_name}}</h2>` +
      p(`You've collected your {{items}} from <strong>{{location_name}}</strong>. Thanks for storing with StashInn.`) +
      rows([['Booking', '#{{booking_ref}}'], ['Dropped off', '{{dropped_off}}'], ['Picked up', '{{picked_up}}'], ['Total', '₹{{total}}']]) +
      p(`Something not right with your items? Reply to this email within 48 hours and we'll look into it.`) +
      button('{{dashboard_url}}', 'View my bookings'),
  },
};

/** Emails sent by the scheduled jobs (packages/lib/src/jobs). Same override rules as above. */
export const JOB_EMAIL_SLUGS = {
  partnerReminder: 'partner_response_reminder',
  customerDelay: 'booking_partner_delay',
  customerAutoCancelled: 'booking_auto_cancelled',
  partnerAutoCancelled: 'partner_booking_auto_cancelled',
  dropoffReminder: 'dropoff_reminder',
  pickupReminder: 'pickup_reminder',
  noShowNudge: 'no_show_nudge',
  noShow: 'booking_no_show',
  pickupOverdue: 'pickup_overdue',
  reviewRequest: 'review_request',
  partnerInfoRequest: 'partner_info_request_reminder',
  partnerPauseEnding: 'partner_pause_ending',
  partnerDayPlan: 'partner_day_plan',
  partnerCashDues: 'partner_cash_dues',
  partnerStatement: 'partner_monthly_statement',
} as const;

const codeBox = (label: string, code: string, note: string) =>
  `<div style="margin:6px 0 18px;padding:16px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;text-align:center;"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9a3412;">${label}</div><div style="font-size:32px;font-weight:900;letter-spacing:.25em;color:#111827;margin-top:4px;">${code}</div><div style="font-size:13px;color:#6b7280;margin-top:4px;">${note}</div></div>`;
const h2 = (s: string) => `<h2 style="margin:0 0 12px;font-size:22px;color:#111827;">${s}</h2>`;
const placeRows = rows([
  ['Booking', '#{{booking_ref}}'],
  ['Address', '{{address}}<br/><a href="{{directions_url}}" style="color:#ea580c;font-weight:700;">Get directions</a>'],
  ['Contact', '{{contact_name}}<br/><a href="tel:{{contact_phone}}" style="color:#ea580c;font-weight:700;">{{contact_phone}}</a>'],
  ['Drop-off', '{{drop_off}}'],
  ['Pick-up', '{{pick_up}}'],
  ['Storing', '{{items}}'],
]);

Object.assign(BOOKING_EMAIL_DEFAULTS, {
  [JOB_EMAIL_SLUGS.partnerReminder]: {
    subject: 'Please respond: booking #{{booking_ref}} is waiting',
    variables: ['partner_name', 'booking_ref', 'location_name', 'drop_off', 'pick_up', 'items', 'deadline', 'dashboard_url'],
    body_html:
      h2('A customer is waiting for your answer') +
      p(`Hi {{partner_name}}, booking <strong>#{{booking_ref}}</strong> at <strong>{{location_name}}</strong> hasn't been accepted or declined yet.`) +
      rows([['Drop-off', '{{drop_off}}'], ['Pick-up', '{{pick_up}}'], ['Storing', '{{items}}']]) +
      p(`If there's no answer by <strong>{{deadline}}</strong>, StashInn will cancel it and refund the customer.`) +
      button('{{dashboard_url}}', 'Accept or decline'),
  },
  [JOB_EMAIL_SLUGS.customerDelay]: {
    subject: `We're chasing your booking #{{booking_ref}}`,
    variables: ['customer_name', 'booking_ref', 'location_name', 'drop_off', 'deadline', 'dashboard_url'],
    body_html:
      h2(`Your booking isn't confirmed yet`) +
      p(`Hi {{customer_name}}, <strong>{{location_name}}</strong> hasn't confirmed your booking for {{drop_off}} yet. Our team is contacting them now.`) +
      p(`If it isn't confirmed by <strong>{{deadline}}</strong>, we'll cancel it and refund anything you paid, so you can book somewhere else.`) +
      button('{{dashboard_url}}', 'View my booking'),
  },
  [JOB_EMAIL_SLUGS.customerAutoCancelled]: {
    subject: `Booking #{{booking_ref}} cancelled: the location didn't confirm`,
    variables: ['customer_name', 'booking_ref', 'location_name', 'drop_off', 'refund_line', 'search_url'],
    body_html:
      h2(`We're sorry, {{customer_name}}`) +
      p(`<strong>{{location_name}}</strong> didn't confirm your booking for {{drop_off}} in time, so we've cancelled it.`) +
      p('{{refund_line}}') +
      p('There may be other locations nearby with space for you.') +
      button('{{search_url}}', 'Find another location'),
  },
  [JOB_EMAIL_SLUGS.partnerAutoCancelled]: {
    subject: 'Booking #{{booking_ref}} was cancelled: no response',
    variables: ['partner_name', 'booking_ref', 'location_name', 'drop_off', 'dashboard_url'],
    body_html:
      h2(`A booking was cancelled because it wasn't answered`) +
      p(`Hi {{partner_name}}, booking <strong>#{{booking_ref}}</strong> at <strong>{{location_name}}</strong> for {{drop_off}} wasn't accepted or declined in time, so StashInn cancelled it and refunded the customer.`) +
      p('Please answer booking requests quickly. Repeated missed requests may pause your listing.') +
      button('{{dashboard_url}}', 'Open my bookings'),
  },
  [JOB_EMAIL_SLUGS.dropoffReminder]: {
    subject: 'Reminder: drop-off at {{location_name}}, {{drop_off}}',
    variables: ['customer_name', 'booking_ref', 'location_name', 'address', 'directions_url', 'contact_name', 'contact_phone', 'drop_off', 'pick_up', 'items', 'checkin_otp', 'dashboard_url'],
    body_html:
      h2('See you soon, {{customer_name}}') +
      p(`Your drop-off at <strong>{{location_name}}</strong> is coming up. Here's everything you need.`) +
      codeBox('Check-in code', '{{checkin_otp}}', 'Give this code to the partner when you drop off.') +
      placeRows +
      button('{{dashboard_url}}', 'View my booking'),
  },
  [JOB_EMAIL_SLUGS.pickupReminder]: {
    subject: 'Reminder: pick up by {{pick_up}}',
    variables: ['customer_name', 'booking_ref', 'location_name', 'address', 'directions_url', 'contact_name', 'contact_phone', 'drop_off', 'pick_up', 'items', 'checkout_otp', 'dashboard_url'],
    body_html:
      h2('Time to collect soon, {{customer_name}}') +
      p(`Your booking at <strong>{{location_name}}</strong> ends at <strong>{{pick_up}}</strong>. Extra time may be charged at the location's hourly price.`) +
      codeBox('Pick-up code', '{{checkout_otp}}', 'Give this code to the partner when you collect.') +
      placeRows +
      button('{{dashboard_url}}', 'View my booking'),
  },
  [JOB_EMAIL_SLUGS.noShowNudge]: {
    subject: 'Are you still coming? Booking #{{booking_ref}}',
    variables: ['customer_name', 'booking_ref', 'location_name', 'drop_off', 'pick_up', 'contact_phone', 'dashboard_url'],
    body_html:
      h2(`We haven't seen you yet, {{customer_name}}`) +
      p(`Your drop-off at <strong>{{location_name}}</strong> was booked for {{drop_off}}. If you're running late, call the location on <a href="tel:{{contact_phone}}" style="color:#ea580c;font-weight:700;">{{contact_phone}}</a>.`) +
      p(`If you don't drop off by {{pick_up}}, the booking will be marked as a no-show, which isn't refunded.`) +
      button('{{dashboard_url}}', 'View my booking'),
  },
  [JOB_EMAIL_SLUGS.noShow]: {
    subject: 'Booking #{{booking_ref}} marked as a no-show',
    variables: ['customer_name', 'booking_ref', 'location_name', 'drop_off', 'support_email'],
    body_html:
      h2('We missed you, {{customer_name}}') +
      p(`Nothing was dropped off for your booking at <strong>{{location_name}}</strong> on {{drop_off}}, so it has been marked as a no-show. As set out in our terms, no-shows aren't refunded.`) +
      p('If something went wrong, reply to this email or write to {{support_email}} within 48 hours.'),
  },
  [JOB_EMAIL_SLUGS.pickupOverdue]: {
    subject: 'Your pick-up time has passed · #{{booking_ref}}',
    variables: ['customer_name', 'booking_ref', 'location_name', 'pick_up', 'contact_name', 'contact_phone', 'dashboard_url'],
    body_html:
      h2('Your items are still with us, {{customer_name}}') +
      p(`Your booking at <strong>{{location_name}}</strong> ended at {{pick_up}}. Please collect your items as soon as you can; extra time may be charged at the location's hourly price.`) +
      p(`Need more time? Call {{contact_name}} on <a href="tel:{{contact_phone}}" style="color:#ea580c;font-weight:700;">{{contact_phone}}</a>.`) +
      button('{{dashboard_url}}', 'View my booking'),
  },
});

Object.assign(BOOKING_EMAIL_DEFAULTS, {
  [JOB_EMAIL_SLUGS.reviewRequest]: {
    subject: 'How was {{location_name}}?',
    variables: ['customer_name', 'booking_ref', 'location_name', 'review_url'],
    body_html:
      h2('Thanks for storing with us, {{customer_name}}') +
      p(`How was your experience at <strong>{{location_name}}</strong>? A quick rating helps other travellers choose, and helps the partner improve.`) +
      button('{{review_url}}', 'Rate your stay'),
  },
  [JOB_EMAIL_SLUGS.partnerInfoRequest]: {
    subject: 'Reminder: StashInn needs a few details from you',
    variables: ['partner_name', 'request', 'requested_on', 'dashboard_url'],
    body_html:
      h2('We\'re still waiting on some details') +
      p(`Hi {{partner_name}}, on {{requested_on}} we asked you to update some details on your StashInn account:`) +
      `<div style="margin:6px 0 18px;padding:14px 16px;background:#f9fafb;border-left:3px solid #f97316;border-radius:8px;font-size:14px;line-height:1.6;color:#374151;">{{request}}</div>` +
      p('Please update them in your dashboard, so we can keep your listing live.') +
      button('{{dashboard_url}}', 'Open my dashboard'),
  },
  [JOB_EMAIL_SLUGS.partnerPauseEnding]: {
    subject: '{{location_name}} reopens for bookings {{reopens}}',
    variables: ['partner_name', 'location_name', 'reopens', 'dashboard_url'],
    body_html:
      h2('Your pause is ending') +
      p(`Hi {{partner_name}}, <strong>{{location_name}}</strong> starts taking bookings again on <strong>{{reopens}}</strong>.`) +
      p('If you need more time, extend the pause in your dashboard before then.') +
      button('{{dashboard_url}}', 'Manage my locations'),
  },
  [JOB_EMAIL_SLUGS.partnerDayPlan]: {
    subject: 'Today at StashInn: {{summary}}',
    variables: ['partner_name', 'date', 'summary', 'plan_html', 'dashboard_url'],
    body_html:
      h2('Your day, {{date}}') +
      p(`Good morning {{partner_name}}. Here's what's booked at your locations today.`) +
      '{{plan_html}}' +
      button('{{dashboard_url}}', 'Open my bookings'),
  },
  [JOB_EMAIL_SLUGS.partnerCashDues]: {
    subject: 'Reminder: ₹{{total}} to settle with StashInn',
    variables: ['partner_name', 'total', 'count', 'dues_html', 'dashboard_url'],
    body_html:
      h2('Please settle your cash bookings') +
      p(`Hi {{partner_name}}, you collected payment at your location for {{count}} completed booking(s). StashInn's share (commission and GST) is <strong>₹{{total}}</strong> and hasn't been settled yet.`) +
      '{{dues_html}}' +
      p('Pay it to StashInn and upload the proof in your dashboard.') +
      button('{{dashboard_url}}', 'Settle now'),
  },
  [JOB_EMAIL_SLUGS.partnerStatement]: {
    subject: 'Your StashInn statement for {{month_label}}',
    variables: ['partner_name', 'month_label', 'statement_html', 'dashboard_url'],
    body_html:
      h2('Your statement for {{month_label}}') +
      p(`Hi {{partner_name}}, here's a summary of your completed StashInn bookings in {{month_label}}.`) +
      '{{statement_html}}' +
      p('Questions about any figure? Reply to this email.') +
      button('{{dashboard_url}}', 'View earnings'),
  },
});

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
 * off. Values are HTML-escaped; keys ending in _url or _html are inserted as given.
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
      // _url values are links; _html values are blocks the code built and escaped itself
      return html && !key.endsWith('_url') && !key.endsWith('_html') ? esc(value) : value;
    });
  return { subject: fill(t.subject, false), html: emailLayout(fill(t.body_html, true)) };
}

/** "Mon, 9 Nov, 11:00 am" in India time. */
export const emailTime = (d: Date | string) =>
  new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

/** The short reference customers and partners see ("#584583AE"). */
export const bookingRef = (id: string) => id.split('-')[0]!.toUpperCase();
