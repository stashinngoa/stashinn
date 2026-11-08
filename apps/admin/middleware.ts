import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@stashinn/lib/supabase/middleware';
import { logger } from '@stashinn/lib/services/logger';
import {
  ACTIVITY_COOKIE,
  ACTIVITY_COOKIE_OPTIONS,
  IDLE_TIMEOUT_MS,
  MAX_SESSION_MS,
  SERVER_IDLE_GRACE_MS,
  encodeActivity,
  parseActivity,
  type SignOutReason,
} from './lib/sessionPolicy';
import { accessFor } from './lib/permissions';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { supabase, supabaseResponse } = await updateSession(request);
  const path = request.nextUrl.pathname;
  // /auth/* handles invite links, where the session only exists once the page has run
  const isPublicRoute = path === '/login' || path === '/' || path.startsWith('/auth/');

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
    // Session expiry: hard limit from the real sign-in time, plus idle timeout from the
    // last activity the browser reported (see lib/sessionPolicy.ts)
    const now = Date.now();
    const signedInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : now;
    const lastActive = parseActivity(request.cookies.get(ACTIVITY_COOKIE)?.value, user.id);
    const reason: SignOutReason | null =
      now - signedInAt > MAX_SESSION_MS ? 'expired'
      : lastActive && now - lastActive > IDLE_TIMEOUT_MS + SERVER_IDLE_GRACE_MS ? 'idle'
      : null;

    if (reason) {
      logger.info('Admin session expired', { userId: user.id, reason, path });
      await supabase.auth.signOut({ scope: 'local' });
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('reason', reason);
      if (path !== '/login' && path !== '/' && !path.startsWith('/api/')) url.searchParams.set('next', path);
      const res = NextResponse.redirect(url);
      // Clear the auth cookies on the redirect itself so the browser is signed out immediately
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-')) res.cookies.delete(name);
      });
      res.cookies.delete(ACTIVITY_COOKIE);
      return res;
    }

    // New sessions (fresh invite sign-in, old or other-account cookie) start their idle clock now
    if (!lastActive) {
      supabaseResponse.cookies.set(ACTIVITY_COOKIE, encodeActivity(user.id, now), ACTIVITY_COOKIE_OPTIONS);
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, admin_role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('Auth Error: Failed to fetch admin profile role', {
        userId: user.id,
        error: profileError.message,
      });
    }

    const role = profile?.role;

    // Admin app strictly for admins
    if (role && role !== 'admin' && !path.startsWith('/403')) {
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
    
    // Staff roles only see the areas they work in (see lib/permissions.ts)
    if (role === 'admin' && !accessFor(profile?.admin_role, path)) {
      logger.warn('Admin role access denied', { userId: user.id, adminRole: profile?.admin_role, requestedPath: path });
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Your role doesn’t have access to this.' }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      url.searchParams.set('denied', path.split('/')[2] || 'page');
      return NextResponse.redirect(url);
    }

    if (path === '/login' && role === 'admin') {
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
