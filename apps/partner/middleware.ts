import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@stashinn/lib/supabase/middleware';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { supabase, supabaseResponse } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const isPublicRoute = path === '/login' || path === '/register' || path === '/';

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    if (role && role !== 'partner' && !path.startsWith('/403')) {
      const url = request.nextUrl.clone();
      url.pathname = '/403';
      return NextResponse.rewrite(url);
    }
    
    if ((path === '/login' || path === '/register') && role === 'partner') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
