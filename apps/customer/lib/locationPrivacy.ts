/**
 * Before booking, customers don't see a location's street address or PIN code; map pins
 * are shown as they are. The full address and the partner's contact details are shown with
 * the booking (customer dashboard).
 *
 * Use publicLocation on the server before handing a location to any page or client
 * component, so the hidden fields never reach the browser.
 */

const HIDDEN = ['address_line1', 'address_line2', 'pincode'] as const;

/** The location without its street address or PIN code, plus its area ("Ponda, Goa"). */
export function publicLocation<T extends Record<string, any>>(loc: T): T & { area: string } {
  const copy: Record<string, any> = { ...loc };
  for (const key of HIDDEN) delete copy[key];
  copy.area = [loc.city, loc.state].filter(Boolean).join(', ');
  return copy as T & { area: string };
}
