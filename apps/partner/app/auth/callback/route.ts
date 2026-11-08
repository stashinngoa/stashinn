import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@stashinn/lib/supabase/server';

// Landing point for Supabase email links (sign-up confirmation). Exchanges the link's code or
// token for a session, then continues to `next` (e.g. /onboarding).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/onboarding';

  const supabase = await createClient();
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('This link is missing its sign-in code.') };

  if (error) {
    const message = /code verifier|both auth code/i.test(error.message)
      ? 'Please open the confirmation link in the same browser you signed up with, or sign in below.'
      : 'This link is invalid or has expired. Sign in below, or register again.';
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}#login-section`);
  }
  return NextResponse.redirect(`${origin}${safeNext}`);
}
