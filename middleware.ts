import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  console.log('Middleware: Processing path:', path)
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/_next',
    '/favicon.ico',
    '/api/auth/callback',
    '/auth',
    '/portal/login'
  ]
  
  // Allow public routes
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route))
  if (isPublicRoute) {
    console.log('Middleware: Allowing public route:', path)
    return NextResponse.next()
  }
  
  // Allow API routes to handle their own authentication
  if (path.startsWith('/api/')) {
    console.log('Middleware: Allowing API route to handle auth:', path)
    return NextResponse.next()
  }
  
  // Simple dashboard protection - check for auth cookie
  if (path.startsWith('/dashboard')) {
    console.log('Middleware: Checking dashboard route:', path)
    
    // Get the auth cookie
    const token = request.cookies.get('sb-auth-token')
    
    // If no token, redirect to login
    if (!token) {
      console.log('Middleware: No auth token, redirecting to login')
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }
  
  // Simple portal protection - check for portal auth cookie
  if (path.startsWith('/portal') && !path.startsWith('/portal/login')) {
    console.log('Middleware: Checking portal route:', path)
    
    // Get the portal auth cookie
    const portalToken = request.cookies.get('sb-portal-token')
    
    // If no token, redirect to portal login
    if (!portalToken) {
      console.log('Middleware: No portal token, redirecting to portal login')
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
  }
  
  // For root path, allow through
  if (path === '/') {
    return NextResponse.next()
  }
  
  console.log('Middleware: Allowing route:', path)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}