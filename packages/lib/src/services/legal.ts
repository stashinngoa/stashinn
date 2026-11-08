/**
 * Legal documents (Admin → Configuration → Legal documents).
 *
 * Each document is stored as text in system_config under its key and written in a small
 * Markdown subset: "#", "##" and "###" headings, paragraphs, "- " bullets, "1. " numbered
 * items, "> " notes, "| a | b |" tables and **bold**. {{placeholders}} are filled from the
 * business details saved alongside them (and a few live platform settings) when shown.
 */

import { BOOKING_DEFAULTS } from '../constants';
import { LEGAL_DEFAULT_TEXT } from './legalDrafts';

export type LegalDocKey =
  | 'partner_terms_and_conditions'
  | 'partner_privacy_policy'
  | 'customer_terms_and_conditions'
  | 'customer_privacy_policy';

export interface LegalDocMeta {
  key: LegalDocKey;
  audience: 'partner' | 'customer';
  title: string;
  /** Where the document is shown today. */
  usedIn: string;
}

export const LEGAL_DOCS: LegalDocMeta[] = [
  { key: 'partner_terms_and_conditions', audience: 'partner', title: 'Partner Terms & Conditions', usedIn: 'Partner sign-up and the printable partner registration form' },
  { key: 'partner_privacy_policy', audience: 'partner', title: 'Partner Privacy Policy', usedIn: 'Partner sign-up' },
  { key: 'customer_terms_and_conditions', audience: 'customer', title: 'Customer Terms & Conditions', usedIn: 'Not linked from the customer site yet' },
  { key: 'customer_privacy_policy', audience: 'customer', title: 'Customer Privacy Policy', usedIn: 'Not linked from the customer site yet' },
];

export const LEGAL_DOC_KEYS = LEGAL_DOCS.map(d => d.key);

/** The StashInn draft (from the October 2026 legal research document) for each document. */
export const legalDefaultText = (key: LegalDocKey) => LEGAL_DEFAULT_TEXT[key];

/** system_config key holding the business details used to fill placeholders. */
export const LEGAL_DETAILS_KEY = 'legal_business_details';

export interface LegalField {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  /** Prefilled for a new setup. */
  initial?: string;
  multiline?: boolean;
}

export const LEGAL_FIELD_GROUPS: { title: string; fields: LegalField[] }[] = [
  {
    title: 'Company',
    fields: [
      { key: 'legal_name', label: 'Registered company name', placeholder: 'StashInn Technologies Pvt. Ltd.' },
      { key: 'registered_address', label: 'Registered address', multiline: true },
      { key: 'cin', label: 'CIN / registration no.' },
      { key: 'gstin', label: 'StashInn GSTIN' },
      { key: 'website', label: 'Website', initial: 'https://www.stashinn.com' },
      { key: 'jurisdiction_city', label: 'Courts and arbitration city', placeholder: 'Panaji, Goa' },
    ],
  },
  {
    title: 'Contacts',
    fields: [
      { key: 'support_email', label: 'Customer support email', initial: 'support@stashinn.com' },
      { key: 'partner_email', label: 'Partner enquiries email', initial: 'partners@stashinn.com' },
      { key: 'legal_email', label: 'Legal / privacy email', initial: 'legal@stashinn.com' },
      { key: 'grievance_officer_name', label: 'Grievance Officer name', hint: 'Required under the IT Act and the DPDP Act.' },
      { key: 'grievance_officer_designation', label: 'Grievance Officer designation' },
    ],
  },
  {
    title: 'Commercial terms',
    fields: [
      { key: 'payout_schedule', label: 'Partner payout schedule', initial: 'monthly, on or around the 10th day of the month after the storage was provided' },
      { key: 'stashguard_max_booking', label: 'StashGuard limit per booking (₹)', placeholder: '50,000' },
      { key: 'stashguard_max_item', label: 'StashGuard limit per bag or item (₹)', placeholder: '10,000' },
      { key: 'max_item_value', label: 'Highest value allowed per item (₹)', placeholder: '25,000' },
      { key: 'effective_date', label: 'Effective date', hint: 'Leave blank to use the date the document was last saved.', placeholder: '1 December 2026' },
    ],
  },
  {
    title: 'Partner settlements',
    fields: [
      { key: 'settlement_upi_id', label: 'UPI ID partners pay StashInn’s share to', placeholder: 'stashinn@okicici', hint: 'Shown on the partner Settlements page for pay-at-drop-off bookings.' },
      { key: 'settlement_bank_details', label: 'Bank account for partner settlements', multiline: true, placeholder: 'StashInn Technologies Pvt. Ltd.\nA/c 1234567890 · IFSC HDFC0001234', hint: 'Account name, number and IFSC, for partners who pay by bank transfer.' },
    ],
  },
];

export const LEGAL_FIELDS = LEGAL_FIELD_GROUPS.flatMap(g => g.fields);

export type LegalDetails = Record<string, string>;

export const initialLegalDetails = (): LegalDetails =>
  Object.fromEntries(LEGAL_FIELDS.map(f => [f.key, f.initial ?? '']));

/** Values taken from the platform settings rather than typed on the legal page. */
export const LEGAL_LIVE_FIELDS: { key: string; label: string }[] = [
  { key: 'default_commission_rate', label: 'Default commission %' },
  { key: 'cancellation_window_hours', label: 'Free cancellation window (hours)' },
  { key: 'booking_max_days', label: 'Longest booking (days)' },
  { key: 'last_updated', label: 'Date the document was last saved' },
];

const plain = (v: unknown) => (v === null || v === undefined ? '' : String(v).replace(/^"|"$/g, '').trim());

export interface LegalContext {
  details: LegalDetails;
  live: Record<string, string>;
}

/**
 * Everything a page needs to show legal documents: the stored texts (or the draft when
 * none is saved yet), the business details, live settings and when each was saved.
 * Pass a service-role client when the viewer may be signed out.
 */
export async function loadLegal(supabase: { from: (table: string) => any }) {
  const { data } = await supabase
    .from('system_config')
    .select('key, value, updated_at')
    .in('key', [...LEGAL_DOC_KEYS, LEGAL_DETAILS_KEY, 'default_commission_rate', 'cancellation_window_hours', 'booking_max_days']);
  const rows = new Map<string, { value: unknown; updated_at: string | null }>(
    ((data as { key: string; value: unknown; updated_at: string | null }[]) || []).map(r => [r.key, r]),
  );

  const docs = {} as Record<LegalDocKey, { text: string; updatedAt: string | null; isDraft: boolean }>;
  for (const key of LEGAL_DOC_KEYS) {
    const row = rows.get(key);
    const text = typeof row?.value === 'string' ? row.value : '';
    // Older setups stored a one-line "Enter … here..." placeholder; treat that as not written yet
    const missing = !text.trim() || /^Enter .* here\.{3}$/.test(text.trim());
    docs[key] = { text: missing ? legalDefaultText(key) : text, updatedAt: missing ? null : row?.updated_at ?? null, isDraft: missing };
  }

  const stored = rows.get(LEGAL_DETAILS_KEY)?.value;
  const details: LegalDetails = { ...initialLegalDetails(), ...(stored && typeof stored === 'object' ? (stored as LegalDetails) : {}) };

  const live: Record<string, string> = {
    default_commission_rate: plain(rows.get('default_commission_rate')?.value) || '15',
    cancellation_window_hours: plain(rows.get('cancellation_window_hours')?.value) || String(BOOKING_DEFAULTS.cancellationWindowHours),
    booking_max_days: plain(rows.get('booking_max_days')?.value) || String(BOOKING_DEFAULTS.maxDays),
  };

  return { docs, details, live, detailsUpdatedAt: rows.get(LEGAL_DETAILS_KEY)?.updated_at ?? null };
}

export const formatLegalDate = (iso: string | null | undefined) =>
  (iso ? new Date(iso) : new Date()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Placeholders used in a text, in order of first use. */
export const legalPlaceholders = (text: string) => [...new Set([...text.matchAll(PLACEHOLDER)].map(m => m[1]!))];

const fieldLabel = (key: string) => LEGAL_FIELDS.find(f => f.key === key)?.label ?? LEGAL_LIVE_FIELDS.find(f => f.key === key)?.label ?? key.replace(/_/g, ' ');

/** Placeholders in a text that have no value yet, with their labels. */
export function missingLegalValues(text: string, ctx: LegalContext, updatedAt?: string | null) {
  return legalPlaceholders(text)
    .filter(key => !valueFor(key, ctx, updatedAt))
    .map(key => ({ key, label: fieldLabel(key) }));
}

function valueFor(key: string, ctx: LegalContext, updatedAt?: string | null): string {
  if (key === 'last_updated') return formatLegalDate(updatedAt);
  if (key === 'effective_date') return plain(ctx.details.effective_date) || formatLegalDate(updatedAt);
  return plain(ctx.details[key]) || plain(ctx.live[key]);
}

/**
 * Fills {{placeholders}}. A value that hasn't been set becomes "[[Label]]", which
 * LegalDocument shows highlighted so it can't be mistaken for final wording.
 */
export function fillLegal(text: string, ctx: LegalContext, updatedAt?: string | null): string {
  return text.replace(PLACEHOLDER, (_, key: string) => valueFor(key, ctx, updatedAt) || `[[${fieldLabel(key)}]]`);
}

// ---------------------------------------------------------------- parsing

export type LegalInline = { text: string; bold?: boolean; missing?: boolean };
export type LegalBlock =
  | { type: 'h1' | 'h2' | 'h3' | 'p' | 'note'; id?: string; content: LegalInline[] }
  | { type: 'ul' | 'ol'; items: LegalInline[][] }
  | { type: 'table'; head: LegalInline[][]; rows: LegalInline[][][] };

/** **bold** and [[missing value]] runs. */
export function parseInline(text: string): LegalInline[] {
  const out: LegalInline[] = [];
  const re = /\*\*(.+?)\*\*|\[\[(.+?)\]\]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push(...parseInline(m[1]).map(r => ({ ...r, bold: true })));
    else out.push({ text: m[2]!, missing: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

const slug = (s: string) => s.toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => parseInline(c.trim()));

export function parseLegal(text: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const t = line.trim();
    if (!t) { i++; continue; }

    const heading = /^(#{1,3})\s+(.*)$/.exec(t);
    if (heading) {
      const level = heading[1]!.length as 1 | 2 | 3;
      blocks.push({ type: `h${level}`, id: slug(heading[2]!), content: parseInline(heading[2]!) });
      i++;
      continue;
    }
    if (t.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('|')) rows.push(lines[i++]!);
      const body = rows.filter(r => !/^\|?\s*:?-{2,}/.test(r.trim()));
      blocks.push({ type: 'table', head: cells(body[0] ?? ''), rows: body.slice(1).map(cells) });
      continue;
    }
    if (/^[-*]\s+/.test(t) || /^\d+[.)]\s+/.test(t)) {
      const ordered = /^\d+[.)]\s+/.test(t);
      const pattern = ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/;
      const items: LegalInline[][] = [];
      while (i < lines.length && pattern.test(lines[i]!.trim())) {
        items.push(parseInline(lines[i]!.trim().replace(pattern, '')));
        i++;
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items });
      continue;
    }
    if (t.startsWith('>')) {
      const parts: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('>')) parts.push(lines[i++]!.trim().replace(/^>\s?/, ''));
      blocks.push({ type: 'note', content: parseInline(parts.join(' ')) });
      continue;
    }
    // Paragraph: consecutive plain lines
    const parts: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,3}\s|[-*]\s|\d+[.)]\s|\||>)/.test(lines[i]!.trim())) parts.push(lines[i++]!.trim());
    blocks.push({ type: 'p', content: parseInline(parts.join('\n')) }); // line breaks within a paragraph are kept
  }
  return blocks;
}

/** Second-level headings, for a table of contents. */
export const legalOutline = (blocks: LegalBlock[]) =>
  blocks.flatMap(b => (b.type === 'h2' ? [{ id: b.id!, title: b.content.map(c => c.text).join('') }] : []));
