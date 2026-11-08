import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@stashinn/lib/supabase/middleware';
import { logger } from '@stashinn/lib/services/logger';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Update the session using the shared supabase setup
  const { supabase, supabaseResponse } = await updateSession(request);
  
  // Get the path
  const path = request.nextUrl.pathname;
  
  // Define public routes
  const isPublicRoute = 
    path === '/' || 
    path === '/login' || 
    path === '/register' || 
    path.startsWith('/search') || 
    path.startsWith('/checkout') ||
    path.startsWith('/locations') ||
    path.startsWith('/help') ||
    path.startsWith('/safety') ||
    path.startsWith('/cancellation') ||
    path.startsWith('/report-concern') ||
    path.startsWith('/hosting-resources') ||
    path.startsWith('/community-forum') ||
    path.startsWith('/hosting-responsibly') ||
    path.startsWith('/newsroom') ||
    path.startsWith('/new-features') ||
    path.startsWith('/careers') ||
    path.startsWith('/investors') ||
    path === '/terms' ||
    path === '/privacy';
  // Check auth state
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not logged in and tries to access a protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    const fullPath = request.nextUrl.search ? `${path}${request.nextUrl.search}` : path;
    url.pathname = '/login';
    url.searchParams.set('next', fullPath);
    return NextResponse.redirect(url);
  }

  // Check role authorization for the Customer app
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, is_blocked')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('Auth Error: Failed to fetch user profile role', {
        userId: user.id,
        error: profileError.message,
      });
    }

    const role = profile?.role;

    // A customer blocked by StashInn staff is signed out and can't come back in
    if (role === 'customer' && profile?.is_blocked) {
      logger.warn('Blocked customer signed out', { userId: user.id, requestedPath: path });
      await supabase.auth.signOut({ scope: 'local' });
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('error', 'This account has been suspended. If you think this is a mistake, contact support@stashinn.in.');
      const res = NextResponse.redirect(url);
      request.cookies.getAll().forEach(({ name }) => { if (name.startsWith('sb-')) res.cookies.delete(name); });
      return res;
    }

    // If a logged-in user is NOT a customer, they shouldn't be using this portal
    if (role && role !== 'customer' && !path.startsWith('/403')) {
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
    
    // If logged in and trying to access auth pages, redirect to dashboard
    if ((path === '/login' || path === '/register') && role === 'customer') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks (webhook endpoints need raw requests)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
