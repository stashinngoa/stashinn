import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@stashinn/lib/supabase/middleware';

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
    path.startsWith('/locations');
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
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    // If a logged-in user is NOT a customer, they shouldn't be using this portal
    if (role && role !== 'customer' && !path.startsWith('/403')) {
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
