import { NextResponse, type NextRequest } from 'next/server';

import { updateSession, type UserRole } from '@/lib/supabase/middleware';

/**
 * Route protection middleware for Next.js
 * 
 * This middleware implements a robust authentication system:
 * 1. Refreshes the Supabase session on every request
 * 2. Protects admin routes - only accessible by ADMIN users
 * 3. Protects client routes - only accessible by CLIENT users
 * 4. Redirects unauthenticated users to login
 * 5. Redirects authenticated users away from auth pages to their appropriate dashboard
 * 6. Handles role-based access control
 */

// Route configurations
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
const ADMIN_ROUTES = ['/admin'];
const CLIENT_ROUTES = ['/client'];
const PUBLIC_ROUTES = ['/auth/callback'];

// Helper to check if pathname starts with any of the routes
const matchesRoute = (pathname: string, routes: string[]) =>
  routes.some(route => pathname === route || pathname.startsWith(`${route}/`));

// Get the appropriate dashboard based on user role
const getDashboardByRole = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'CLIENT':
      return '/client/panel';
    default:
      return '/login';
  }
};

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, role } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return supabaseResponse;
  }

  // Allow callback route to process
  if (pathname === '/auth/callback') {
    return supabaseResponse;
  }

  const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);
  const isAdminRoute = matchesRoute(pathname, ADMIN_ROUTES);
  const isClientRoute = matchesRoute(pathname, CLIENT_ROUTES);
  const isProtectedRoute = isAdminRoute || isClientRoute;

  // ============================================
  // CASE 1: User is NOT authenticated
  // ============================================
  if (!user) {
    // Allow access to auth routes (login, register, etc.)
    if (isAuthRoute) {
      return supabaseResponse;
    }

    // Redirect to login for any other route (including root "/")
    const loginUrl = new URL('/login', request.url);

    // Save the intended destination for redirect after login
    if (isProtectedRoute) {
      loginUrl.searchParams.set('redirectTo', pathname);
    }

    return NextResponse.redirect(loginUrl);
  }

  // ============================================
  // CASE 2: User IS authenticated
  // ============================================

  // Root path "/" - redirect to appropriate dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL(getDashboardByRole(role), request.url));
  }

  // Trying to access auth routes while logged in - redirect to dashboard
  if (isAuthRoute) {
    return NextResponse.redirect(new URL(getDashboardByRole(role), request.url));
  }

  // ============================================
  // CASE 3: Role-based route protection
  // ============================================

  // Admin routes - only ADMIN users can access
  if (isAdminRoute && role !== 'ADMIN') {
    // If user is a client, redirect to client panel
    if (role === 'CLIENT') {
      return NextResponse.redirect(new URL('/client/panel', request.url));
    }
    // No role or unknown role - redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Client routes - only CLIENT users can access
  if (isClientRoute && role !== 'CLIENT') {
    // If user is an admin, redirect to admin dashboard
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    // No role or unknown role - redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // All checks passed - allow the request
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
