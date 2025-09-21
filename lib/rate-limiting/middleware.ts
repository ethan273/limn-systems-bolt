import { NextRequest, NextResponse } from 'next/server'
import { 
  createRateLimiter, 
  getClientIdentifier, 
  rateLimitConfigs,
  type RateLimitConfig,
  type RateLimitResult 
} from './core'

// Re-export rateLimitConfigs for convenience
export { rateLimitConfigs } from './core'

// Rate limit middleware result
export interface RateLimitMiddlewareResult {
  success: boolean
  response?: NextResponse
  rateLimitData?: RateLimitResult
}

// Rate limiting middleware function
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  options: {
    identifier?: string
    skipCondition?: (request: NextRequest) => boolean
    customErrorResponse?: (result: RateLimitResult) => NextResponse
  } = {}
): Promise<RateLimitMiddlewareResult> {
  try {
    // Check if we should skip rate limiting
    if (options.skipCondition && options.skipCondition(request)) {
      return { success: true }
    }

    // Get client identifier
    const identifier = options.identifier || getClientIdentifier(request, true)
    
    // Create rate limiter
    const rateLimiter = createRateLimiter(config)
    
    // Check rate limit
    const result = await rateLimiter.checkLimit(identifier)
    
    if (result.success) {
      // Add rate limit headers to successful response
      return { 
        success: true, 
        rateLimitData: result 
      }
    }

    // Rate limit exceeded
    const response = options.customErrorResponse 
      ? options.customErrorResponse(result)
      : createRateLimitErrorResponse(result)

    return { 
      success: false, 
      response, 
      rateLimitData: result 
    }

  } catch (error) {
    console.error('Rate limiting error:', error)
    // Don't block requests if rate limiting fails
    return { success: true }
  }
}

// Create standardized rate limit error response
export function createRateLimitErrorResponse(result: RateLimitResult): NextResponse {
  const response = NextResponse.json({
    success: false,
    error: 'Rate limit exceeded',
    message: `Too many requests. Limit: ${result.limit} per ${result.strategy} window.`,
    rateLimitInfo: {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.retryAfter
    }
  }, { 
    status: 429,
    statusText: 'Too Many Requests'
  })

  // Add standard rate limiting headers
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  
  if (result.retryAfter) {
    response.headers.set('Retry-After', result.retryAfter.toString())
  }

  return response
}

// Add rate limit headers to successful responses
export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}

// Higher-order function to wrap API handlers with rate limiting
export function rateLimit(
  config: RateLimitConfig,
  options: {
    identifier?: (request: NextRequest) => string
    skipCondition?: (request: NextRequest) => boolean
    customErrorResponse?: (result: RateLimitResult) => NextResponse
  } = {}
) {
  return function <T extends (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (request: NextRequest, ...args: unknown[]) => {
      // Apply rate limiting
      const identifier = options.identifier 
        ? options.identifier(request)
        : getClientIdentifier(request, true)

      const rateLimitResult = await withRateLimit(request, config, {
        identifier,
        skipCondition: options.skipCondition,
        customErrorResponse: options.customErrorResponse
      })

      // Return rate limit error response if blocked
      if (!rateLimitResult.success && rateLimitResult.response) {
        return rateLimitResult.response
      }

      // Execute original handler
      const response = await handler(request, ...args)

      // Add rate limit headers to successful response
      if (rateLimitResult.rateLimitData) {
        return addRateLimitHeaders(response, rateLimitResult.rateLimitData)
      }

      return response
    }) as T
  }
}

// Predefined middleware functions for common use cases
export const authRateLimit = rateLimit(rateLimitConfigs.auth_login, {
  identifier: (request) => {
    // Use IP + User-Agent for auth requests
    return getClientIdentifier(request, true)
  },
  customErrorResponse: (result) => {
    const response = NextResponse.json({
      success: false,
      error: 'Authentication rate limit exceeded',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: result.retryAfter
    }, { status: 429 })

    response.headers.set('Retry-After', (result.retryAfter || 900).toString())
    return response
  }
})

export const apiStrictRateLimit = rateLimit(rateLimitConfigs.api_strict, {
  skipCondition: (request) => {
    // Skip for health checks and monitoring
    const url = new URL(request.url)
    return url.pathname.includes('/health') || url.pathname.includes('/status')
  }
})

export const apiModerateRateLimit = rateLimit(rateLimitConfigs.api_moderate)

export const adminRateLimit = rateLimit(rateLimitConfigs.admin_config, {
  identifier: (request) => {
    // Use user ID if available, otherwise IP
    const userId = request.headers.get('x-user-id')
    return userId || getClientIdentifier(request, false)
  },
  customErrorResponse: (result) => {
    return NextResponse.json({
      success: false,
      error: 'Admin operation rate limit exceeded',
      message: 'Too many administrative operations. Please wait before retrying.',
      retryAfter: result.retryAfter
    }, { status: 429 })
  }
})

export const financialReadRateLimit = rateLimit(rateLimitConfigs.financial_read, {
  identifier: (request) => {
    // Use user ID for financial operations
    const userId = request.headers.get('x-user-id')
    return userId || getClientIdentifier(request, false)
  }
})

export const financialWriteRateLimit = rateLimit(rateLimitConfigs.financial_write, {
  identifier: (request) => {
    const userId = request.headers.get('x-user-id')
    return userId || getClientIdentifier(request, false)
  },
  customErrorResponse: (result) => {
    return NextResponse.json({
      success: false,
      error: 'Financial operation rate limit exceeded',
      message: 'Too many financial operations. Please wait before making changes.',
      retryAfter: result.retryAfter
    }, { status: 429 })
  }
})

// Global rate limiting middleware (for use in Next.js middleware.ts)
export async function applyGlobalRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request, false)
  
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.global_per_ip, {
    identifier,
    skipCondition: (req) => {
      const url = new URL(req.url)
      // Skip for static assets and health checks
      return (
        url.pathname.startsWith('/_next/') ||
        url.pathname.startsWith('/favicon') ||
        url.pathname.includes('/health') ||
        url.pathname.includes('/status')
      )
    }
  })

  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response
  }

  return null
}

// Burst protection - additional layer for handling sudden traffic spikes
export async function burstProtection(
  request: NextRequest,
  config: {
    burstLimit: number
    burstWindow: number // in milliseconds
    identifier?: string
  }
): Promise<NextResponse | null> {
  const burstConfig: RateLimitConfig = {
    strategy: 'sliding_window',
    requests: config.burstLimit,
    window: config.burstWindow,
    identifier: 'burst_protection'
  }

  const identifier = config.identifier || getClientIdentifier(request, true)
  
  const rateLimitResult = await withRateLimit(request, burstConfig, {
    identifier,
    customErrorResponse: () => {
      return NextResponse.json({
        success: false,
        error: 'Burst limit exceeded',
        message: 'Too many requests in a short time. Please slow down.',
        retryAfter: Math.ceil(config.burstWindow / 1000)
      }, { status: 429 })
    }
  })

  return rateLimitResult.success ? null : (rateLimitResult.response ?? null)
}

// IP-based rate limiting with whitelist support
export async function ipRateLimit(
  request: NextRequest,
  options: {
    whitelist?: string[]
    config?: RateLimitConfig
  } = {}
): Promise<NextResponse | null> {
  const ip = getClientIdentifier(request, false)
  
  // Check IP whitelist
  if (options.whitelist && options.whitelist.includes(ip)) {
    return null
  }

  const config = options.config || rateLimitConfigs.global_per_ip
  
  const rateLimitResult = await withRateLimit(request, config, {
    identifier: ip,
    customErrorResponse: (result) => {
      return NextResponse.json({
        success: false,
        error: 'IP rate limit exceeded',
        message: `Too many requests from IP ${ip}. Please try again later.`,
        retryAfter: result.retryAfter
      }, { status: 429 })
    }
  })

  return rateLimitResult.success ? null : (rateLimitResult.response ?? null)
}

// User-based rate limiting
export async function userRateLimit(
  request: NextRequest,
  userId: string,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  const rateLimitConfig = config || rateLimitConfigs.global_per_user
  
  const rateLimitResult = await withRateLimit(request, rateLimitConfig, {
    identifier: userId,
    customErrorResponse: (result) => {
      return NextResponse.json({
        success: false,
        error: 'User rate limit exceeded',
        message: 'Too many requests. Please wait before making more requests.',
        retryAfter: result.retryAfter
      }, { status: 429 })
    }
  })

  return rateLimitResult.success ? null : (rateLimitResult.response ?? null)
}

// Compose multiple rate limiting layers
export function composeLimits(...limitFunctions: Array<(request: NextRequest) => Promise<NextResponse | null>>) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    for (const limitFunction of limitFunctions) {
      const result = await limitFunction(request)
      if (result) {
        return result // Return first rate limit that triggers
      }
    }
    return null
  }
}