// ===================================
// Middleware - Route Protection
// TEMPORARILY DISABLED FOR DEMO/DEVELOPMENT
// ===================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporarily allow all routes for demo purposes
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};

// ===================================
// ORIGINAL AUTH MIDDLEWARE (COMMENTED OUT)
// Uncomment when database and auth are configured
// ===================================

/*
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
    const isShopPage = req.nextUrl.pathname.startsWith('/shop');
    const isCheckoutPage = req.nextUrl.pathname.startsWith('/shop/checkout');
    const isOrderSuccessPage = req.nextUrl.pathname.startsWith('/shop/order-success');
    const isDashboardPage = ['/', '/driver-performance', '/analytics', '/route-optimization'].includes(req.nextUrl.pathname);
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');

    // Public shop pages - allow without login (except checkout and order-success)
    if (isShopPage && !isCheckoutPage && !isOrderSuccessPage) {
      return NextResponse.next();
    }

    // Checkout and order-success require login
    if ((isCheckoutPage || isOrderSuccessPage) && !isAuth) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Redirect to login if not authenticated
    if (!isAuth && !isAuthPage) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Redirect to appropriate page if already authenticated and trying to access auth pages
    if (isAuth && isAuthPage) {
      if (token?.role === 'user') {
        return NextResponse.redirect(new URL('/shop', req.url));
      }
      return NextResponse.redirect(new URL('/', req.url));
    }

    // User role restrictions - only allow shopping pages
    if (isAuth && token?.role === 'user') {
      if (isDashboardPage || isAdminRoute) {
        return NextResponse.redirect(new URL('/shop', req.url));
      }
    }

    // Admin-only routes
    if (isAdminRoute && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/shop', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => true,
    },
  }
);
*/
