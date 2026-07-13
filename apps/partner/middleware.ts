import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@stashinn/lib/supabase/middleware';
import { logger } from '@stashinn/lib/services/logger';

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
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('Auth Error: Failed to fetch partner profile role', {
        userId: user.id,
        error: profileError.message,
      });
    }

    const role = profile?.role;

    if (role && role !== 'partner' && !path.startsWith('/403')) {
      logger.warn('Suspicious activity: Mismatched role access attempt', {
        userId: user.id,
        userRole: role,
        requestedPath: path,
        ip: request.headers.get('x-forwarding-for') || request.headers.get('x-real-ip') || 'unknown',
      });
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
