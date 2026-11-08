/**
 * Categories a partner picks when filing a claim (apps/partner/app/dashboard/damage).
 * Saved in damage_reports.description as "[Category] details", the same way customer
 * complaints are, so admin Disputes can tell who filed it and what it's about.
 */
export const PARTNER_CLAIM_CATEGORIES = [
  'Damage to our property',
  'Unpaid or extra charges',
  'Items left behind',
  'Prohibited or unsafe items',
  'Customer behaviour',
  'Something else',
] as const;

export type PartnerClaimCategory = (typeof PARTNER_CLAIM_CATEGORIES)[number];
