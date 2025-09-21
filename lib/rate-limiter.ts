/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

export function createRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest) => {
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    
    // Create a unique key for this IP and endpoint
    const key = `${ip}-${request.nextUrl.pathname}`
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)
    
    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + config.windowMs
      }
      rateLimitStore.set(key, entry)
    } else {
      // Increment count
      entry.count++
    }
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const resetTime = Math.ceil((entry.resetTime - now) / 1000)
      
      return new NextResponse(
        JSON.stringify({
          error: config.message || 'Too many requests',
          resetIn: resetTime
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': resetTime.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
          }
        }
      )
    }
    
    // Add rate limit headers to successful requests
    const remaining = config.maxRequests - entry.count
    const resetTime = Math.ceil(entry.resetTime / 1000)
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    })
  }
}

// Pre-configured rate limiters for different use cases
export const apiLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  message: 'Too many API requests from this IP, please try again later.'
})

export const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per window
  message: 'Too many authentication attempts, please try again later.'
})

export const strictLimiter = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Rate limit exceeded for sensitive endpoint.'
})

// Helper function to apply rate limiting in API routes
export async function withRateLimit<T>(
  request: NextRequest,
  limiter: (req: NextRequest) => Promise<NextResponse>,
  handler: () => Promise<T>
): Promise<NextResponse | T> {
  const rateLimitResult = await limiter(request)
  
  if (rateLimitResult.status === 429) {
    return rateLimitResult
  }
  
  return handler()
}