// Where to send someone after they sign in. Only a path on this site is accepted, so a link like
// /login?next=https://evil.example (or //evil.example, /\evil.example, @evil.example) can't send a
// freshly signed-in customer to another website.
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  const value = (next ?? '').trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  // Control characters (tabs, newlines) can be stripped by browsers and turn a path into a host
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
