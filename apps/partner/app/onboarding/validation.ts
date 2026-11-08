// Shared by the onboarding form (instant feedback) and its server action (enforcement).

export const ONBOARDING_LIMITS = {
  maxPhotos: 5,
  photoMaxMb: 5,
  docMaxMb: 5,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  docTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
};

export const isValidPan = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase());
export const isValidPhone = (phone: string) => /^\d{10}$/.test(phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''));
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const isValidPin = (pin: string) => /^[1-9]\d{5}$/.test(pin);
/** 15-character GSTIN: state code, PAN, entity number, 'Z', checksum. */
export const isValidGstin = (gst: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst.toUpperCase());

/** Returns a readable problem with a set of uploaded files, or null when they're fine. */
export function checkFiles(
  list: File[],
  { maxCount, maxMb, types }: { maxCount: number; maxMb: number; types: string[] },
  label: string
): string | null {
  if (list.length > maxCount) return `${label}: upload at most ${maxCount} file${maxCount === 1 ? '' : 's'}.`;
  for (const f of list) {
    if (f.size > maxMb * 1024 * 1024) return `${label}: “${f.name}” is larger than ${maxMb} MB.`;
    if (f.type && !types.includes(f.type)) return `${label}: “${f.name}” isn’t a supported file type.`;
  }
  return null;
}
