import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const publicPaths = ['/login', '/api/auth/login', '/docs'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token) as any;

  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    return response;
  }

  const projectId = request.nextUrl.searchParams.get('project_id');
  if (projectId && projectId !== 'ALL') {
    const isGlobalAdmin = payload.role === "ADMIN";
    const hasProjectRole = payload.projectRoles && payload.projectRoles[projectId];

    if (!isGlobalAdmin && !hasProjectRole) {
      const unauthorizedUrl = new URL('/', request.url);
      unauthorizedUrl.searchParams.set('error', 'unauthorized_project');
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
