// Shared by the contacts page, its client components and actions (no server-only imports).

/** Last 10 digits: how one person is recognised across their per-location rows. */
export const phoneKey = (phone: string | null | undefined) => String(phone || '').replace(/\D/g, '').slice(-10);

/** "98765 43210" */
export const formatPhone = (phone: string | null | undefined) => {
  const d = phoneKey(phone);
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : String(phone || '');
};

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?';

export type Person = {
  key: string;
  ids: string[];
  name: string;
  phone: string;
  email: string | null;
  isPrimary: boolean;
  /** Every row for this person is verified */
  verified: boolean;
  locationIds: string[];
  idDocUrl: string | null;
  idDocIsPdf: boolean;
  photoUrl: string | null;
  addedAt: string;
  openRequest: string | null;
};

export type LocationLite = { id: string; name: string; live: boolean; type: string };
