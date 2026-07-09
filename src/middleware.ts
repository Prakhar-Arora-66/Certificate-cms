import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('knuth_admin_auth');
  const path = request.nextUrl.pathname;

  if (path.startsWith('/api/')) {
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (path === '/') {
    if (!authCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (path === '/login') {
    if (authCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/api/:path*'],
};