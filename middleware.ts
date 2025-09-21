import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { protectDashboardRoute } from '@/middleware/auth'

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
    '/auth'
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
  
  // Protect dashboard routes
  if (path.startsWith('/dashboard')) {
    console.log('Middleware: Checking dashboard route protection:', path)
    const protectionResult = await protectDashboardRoute(request, path)
    if (protectionResult) {
      return protectionResult // Redirect to login or access denied
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
  runtime: 'nodejs',
}