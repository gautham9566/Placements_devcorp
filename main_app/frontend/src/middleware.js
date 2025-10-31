import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl.clone();
  const role = request.cookies.get('role')?.value;

  // Allow unauthenticated access only to /login and /signup
  const publicPaths = ['/login', '/signup'];
  if (!role && !publicPaths.includes(url.pathname)) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Only log in development and reduce verbosity
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] ${url.pathname} - Role: ${role || 'None'}`);
  }

  // For testing purposes, you can uncomment the following:
  // const role = 'ADMIN'; // or 'STUDENT'

  // Redirect profile URLs based on role
  if (url.pathname === '/profile' && role === 'ADMIN') {
    url.pathname = '/admin/profile';
    return NextResponse.redirect(url);
  }

  // Handle settings redirects based on role
  if (url.pathname === '/settings' && role === 'ADMIN') {
    url.pathname = '/admin/settings';
    return NextResponse.redirect(url);
  }

  // Block /profile unless logged in as student or admin
  if (url.pathname.startsWith('/profile') && role !== 'STUDENT' && role !== 'ADMIN') {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Admin-only access
  if (url.pathname.startsWith('/admin') && role !== 'ADMIN') {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Block student pages unless logged in as student or admin
  if ((url.pathname.startsWith('/myjobs') || 
       url.pathname.startsWith('/jobpostings') || 
       url.pathname.startsWith('/companies') || 
       url.pathname.startsWith('/company/') )&& 
      role !== 'STUDENT' && role !== 'ADMIN') {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Handle root path redirects based on role
  if (url.pathname === '/') {
    if (!role) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    } else if (role === 'STUDENT') {
      url.pathname = '/students';
      return NextResponse.redirect(url);
    } else if (role === 'ADMIN') {
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Otherwise allow the request
  return NextResponse.next();
}

// 🔁 Apply middleware to selected routes - optimized for performance
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
