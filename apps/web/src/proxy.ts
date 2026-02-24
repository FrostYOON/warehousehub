import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ACCESS_COOKIE_NAME, LOGIN_PATH } from '@/features/auth/model/constants';

const PUBLIC_PATHS = [LOGIN_PATH];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const hasAccessToken = Boolean(req.cookies.get(ACCESS_COOKIE_NAME)?.value);
  const onPublicPath = isPublicPath(pathname);

  if (!hasAccessToken && !onPublicPath) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasAccessToken && onPublicPath) {
    const homeUrl = new URL('/', req.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
