// A simple in-memory rate limiter for demo purposes.
// In a real application, this should be backed by Redis (e.g. Upstash) or the Database.

interface RateLimitEntry {
  attempts: number;
  blockedUntil: number;
}

const store = new Map<string, RateLimitEntry>();

export async function checkRateLimit(key: string, maxAttempts: number = 5, blockDurationMs: number = 15 * 60 * 1000) {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { attempts: 0, blockedUntil: 0 };
    store.set(key, entry);
  }

  if (now < entry.blockedUntil) {
    const remainingMinutes = Math.ceil((entry.blockedUntil - now) / 60000);
    throw new Error(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`);
  }

  return {
    recordFailure: () => {
      entry.attempts += 1;
      if (entry.attempts >= maxAttempts) {
        entry.blockedUntil = Date.now() + blockDurationMs;
        entry.attempts = 0; // Reset after blocking
      }
    },
    reset: () => {
      entry.attempts = 0;
      entry.blockedUntil = 0;
    }
  };
}
