/**
 * Areas an admin can flag when asking a partner for more information
 * (partners.info_request_items). Shared by the admin dialog, the partner banner and the email.
 */
export const INFO_REQUEST_AREAS = [
  { key: 'business_details', label: 'Business details', hint: 'Name, business type, PAN or GSTIN', fixHref: '/dashboard/profile', fixLabel: 'Business profile' },
  { key: 'documents', label: 'KYC documents', hint: 'Owner ID proof or business registration', fixHref: null, fixLabel: 'Reply to our email with a clear copy' },
  { key: 'contact', label: 'Contact person', hint: 'Name, phone, ID proof or photo', fixHref: '/dashboard/pocs', fixLabel: 'Contacts' },
  { key: 'locations', label: 'Locations', hint: 'Address, map pin, photos, capacity or pricing', fixHref: '/dashboard/locations', fixLabel: 'Locations' },
  { key: 'missing', label: 'Missing information', hint: 'Something required was left out', fixHref: null, fixLabel: null },
] as const;

export type InfoRequestArea = (typeof INFO_REQUEST_AREAS)[number]['key'];

export const infoRequestAreas = (keys: readonly string[] | null | undefined) =>
  INFO_REQUEST_AREAS.filter(a => keys?.includes(a.key));
