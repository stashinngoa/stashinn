import { NextResponse } from 'next/server';
import { safeNext } from '../../../lib/safeNext';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Only a path on this site (e.g. ?next=@evil.example would otherwise make origin@evil.example)
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const { createClient: createServerClient } = await import('@stashinn/lib/supabase/server');
    const supabase = await createServerClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    } else {
      console.error("EXCHANGE ERROR:", error);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Authentication+failed`);
}
