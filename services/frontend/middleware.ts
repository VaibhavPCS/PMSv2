import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// All unauthenticated-accessible routes. These match the ported auth pages
// (the canonical sign-in is /sign-in; /login is a redirect alias).
const PUBLIC_PATHS = [
  '/sign-in', '/sign-up', '/login', '/register',
  '/forgot-password', '/reset-password', '/verify-otp', '/verify-email',
  '/invite',
];

export function middleware(request: NextRequest) {
  // SuperTokens stores the access token in the `sAccessToken` cookie.
  const token = request.cookies.get('sAccessToken')?.value;
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  if (token && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip API, Next internals, the favicon, the /assets static dir, and ANY request
  // with a file extension (images/fonts in public/ are served at the ROOT path, not
  // under /public — without this the middleware 307-redirects them and they break).
  matcher: ['/((?!api|auth|_next/static|_next/image|favicon.ico|assets/|.*\\.[\\w]+$).*)'],
};