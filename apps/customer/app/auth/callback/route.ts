import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  
  if (code) {
    const { createClient: createServerClient } = await import('@stashinn/lib/supabase/server');
    const supabase = await createServerClient();
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("EXCHANGE ERROR:", error);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Authentication+failed`);
}
