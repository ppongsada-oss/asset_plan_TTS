import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

// Paths that don't require authentication
const publicPaths = ['/login', '/api/auth/login', '/docs'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public path
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('token')?.value;

  if (!token) {
    // If no token and requesting a protected path, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the token
  const payload = await verifyToken(token) as any;

  if (!payload) {
    // If token is invalid/expired, clear cookie and redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    return response;
  }

  // --- Project Security Check ---
  const projectId = request.nextUrl.searchParams.get('project_id');
  if (projectId && projectId !== 'ALL') {
    const isGlobalAdmin = payload.role === "ADMIN";
    const hasProjectRole = payload.projectRoles && payload.projectRoles[projectId];
    
    if (!isGlobalAdmin && !hasProjectRole) {
      // Redirect to home or dashboard if unauthorized for this project
      const unauthorizedUrl = new URL('/', request.url);
      unauthorizedUrl.searchParams.set('error', 'unauthorized_project');
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication API)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
