import { headers } from 'next/headers';

/**
 * Resolves the base URL for the Customer application across all environments.
 *
 * Priority order:
 * 1. Explicit production/staging environment variables:
 *    - NEXT_PUBLIC_CUSTOMER_URL (project standard)
 *    - NEXT_PUBLIC_SITE_URL (supported alias)
 * 2. Dynamic host detection from incoming HTTP request headers (x-forwarded-host / host + x-forwarded-proto),
 *    which automatically matches the live site domain even if env vars were not configured in Vercel.
 * 3. Fallback to env variable if set (including localhost in local dev).
 * 4. Vercel deployment system variables (VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL).
 * 5. Default fallback for local development: http://localhost:3000
 */
export async function getCustomerBaseUrl(): Promise<string> {
  // 1. Check explicit environment variable (if pointing to a remote host / non-localhost)
  const envUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/$/, '');
  }

  // 2. Dynamic host detection from incoming HTTP headers
  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host');
    if (host) {
      const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  } catch {
    // headers() might throw outside request context
  }

  // 3. Fallback to configured envUrl if defined (e.g. http://localhost:3000 in dev)
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // 4. Vercel system environment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  // 5. Default fallback for local development
  return 'http://localhost:3000';
}
