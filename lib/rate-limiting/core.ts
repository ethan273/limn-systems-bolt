/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'

// Rate limiting strategy types
export type RateLimitStrategy = 
  | 'fixed_window'     // Fixed time windows
  | 'sliding_window'   // Sliding time windows  
  | 'token_bucket'     // Token bucket algorithm
  | 'leaky_bucket'     // Leaky bucket algorithm

// Rate limiting configuration
export interface RateLimitConfig {
  strategy: RateLimitStrategy
  requests: number      // Number of requests allowed
  window: number        // Time window in milliseconds
  identifier: string    // Unique identifier for the rate limit
  skipSuccessful?: boolean  // Only count failed requests
  skipOnSuccess?: string[]  // Skip counting for specific success statuses
}

// Rate limiting result
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number        // Timestamp when window resets
  retryAfter?: number  // Seconds to wait before retry
  strategy: RateLimitStrategy
}

// Rate limiting store interface
export interface RateLimitStore {
  get(key: string): Promise<RateLimitData | null>
  set(key: string, data: RateLimitData, ttl: number): Promise<void>
  increment(key: string, ttl: number): Promise<number>
  delete(key: string): Promise<void>
}

// Internal rate limit data structure
export interface RateLimitData {
  count: number
  windowStart: number
  tokens?: number       // For token bucket
  lastRefill?: number   // For token bucket
  queue?: number[]      // For sliding window
}

// In-memory store implementation (for development/simple deployments)
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { data: RateLimitData; expires: number }>()

  async get(key: string): Promise<RateLimitData | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expires) {
      this.store.delete(key)
      return null
    }
    
    return entry.data
  }

  async set(key: string, data: RateLimitData, ttl: number): Promise<void> {
    this.store.set(key, {
      data,
      expires: Date.now() + ttl
    })
  }

  async increment(key: string, ttl: number): Promise<number> {
    const existing = await this.get(key)
    const newCount = (existing?.count || 0) + 1
    
    await this.set(key, {
      ...existing,
      count: newCount,
      windowStart: existing?.windowStart || Date.now()
    }, ttl)
    
    return newCount
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  // Cleanup expired entries periodically
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expires) {
        this.store.delete(key)
      }
    }
  }
}

// Global store instance
const globalStore = new MemoryRateLimitStore()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  globalStore.cleanup()
}, 5 * 60 * 1000)

// Rate limiting implementations by strategy
export class RateLimiter {
  constructor(
    private store: RateLimitStore = globalStore,
    private config: RateLimitConfig
  ) {}

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `rate_limit:${this.config.identifier}:${identifier}`
    
    switch (this.config.strategy) {
      case 'fixed_window':
        return this.fixedWindow(key)
      case 'sliding_window':
        return this.slidingWindow(key)
      case 'token_bucket':
        return this.tokenBucket(key)
      case 'leaky_bucket':
        return this.leakyBucket(key)
      default:
        throw new Error(`Unknown rate limiting strategy: ${this.config.strategy}`)
    }
  }

  private async fixedWindow(key: string): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = Math.floor(now / this.config.window) * this.config.window
    const existing = await this.store.get(key)
    
    // Reset window if it's a new window
    if (!existing || existing.windowStart !== windowStart) {
      await this.store.set(key, {
        count: 1,
        windowStart
      }, this.config.window)
      
      return {
        success: true,
        limit: this.config.requests,
        remaining: this.config.requests - 1,
        reset: windowStart + this.config.window,
        strategy: this.config.strategy
      }
    }
    
    // Check if limit exceeded
    if (existing.count >= this.config.requests) {
      return {
        success: false,
        limit: this.config.requests,
        remaining: 0,
        reset: windowStart + this.config.window,
        retryAfter: Math.ceil((windowStart + this.config.window - now) / 1000),
        strategy: this.config.strategy
      }
    }
    
    // Increment count
    const newCount = await this.store.increment(key, this.config.window)
    
    return {
      success: true,
      limit: this.config.requests,
      remaining: Math.max(0, this.config.requests - newCount),
      reset: windowStart + this.config.window,
      strategy: this.config.strategy
    }
  }

  private async slidingWindow(key: string): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - this.config.window
    const existing = await this.store.get(key)
    
    // Clean up old requests and add current one
    const queue = (existing?.queue || []).filter(timestamp => timestamp > windowStart)
    queue.push(now)
    
    await this.store.set(key, {
      count: queue.length,
      windowStart: now,
      queue
    }, this.config.window)
    
    const remaining = Math.max(0, this.config.requests - queue.length)
    const success = queue.length <= this.config.requests
    
    return {
      success,
      limit: this.config.requests,
      remaining,
      reset: now + this.config.window,
      retryAfter: success ? undefined : Math.ceil(this.config.window / 1000),
      strategy: this.config.strategy
    }
  }

  private async tokenBucket(key: string): Promise<RateLimitResult> {
    const now = Date.now()
    const existing = await this.store.get(key)
    
    // Initialize bucket
    if (!existing) {
      await this.store.set(key, {
        count: 0,
        windowStart: now,
        tokens: this.config.requests - 1, // Take one token
        lastRefill: now
      }, this.config.window * 2) // Keep data longer than window
      
      return {
        success: true,
        limit: this.config.requests,
        remaining: this.config.requests - 1,
        reset: now + this.config.window,
        strategy: this.config.strategy
      }
    }
    
    // Calculate tokens to add based on time passed
    const timePassed = now - (existing.lastRefill || now)
    const tokensToAdd = Math.floor(timePassed / (this.config.window / this.config.requests))
    const currentTokens = Math.min(this.config.requests, (existing.tokens || 0) + tokensToAdd)
    
    // Check if we have tokens available
    if (currentTokens <= 0) {
      return {
        success: false,
        limit: this.config.requests,
        remaining: 0,
        reset: now + this.config.window,
        retryAfter: Math.ceil((this.config.window / this.config.requests) / 1000),
        strategy: this.config.strategy
      }
    }
    
    // Use a token
    await this.store.set(key, {
      count: existing.count + 1,
      windowStart: existing.windowStart,
      tokens: currentTokens - 1,
      lastRefill: now
    }, this.config.window * 2)
    
    return {
      success: true,
      limit: this.config.requests,
      remaining: currentTokens - 1,
      reset: now + (this.config.window / this.config.requests),
      strategy: this.config.strategy
    }
  }

  private async leakyBucket(key: string): Promise<RateLimitResult> {
    const now = Date.now()
    const existing = await this.store.get(key)
    
    // Calculate how many requests should have "leaked" out
    const leakRate = this.config.requests / this.config.window // requests per ms
    const timePassed = existing ? now - existing.windowStart : 0
    const leaked = Math.floor(timePassed * leakRate)
    
    const currentCount = Math.max(0, (existing?.count || 0) - leaked)
    
    // Check if bucket is full
    if (currentCount >= this.config.requests) {
      return {
        success: false,
        limit: this.config.requests,
        remaining: 0,
        reset: now + (this.config.requests - currentCount) / leakRate,
        retryAfter: Math.ceil(1 / leakRate / 1000),
        strategy: this.config.strategy
      }
    }
    
    // Add request to bucket
    await this.store.set(key, {
      count: currentCount + 1,
      windowStart: now
    }, this.config.window * 2)
    
    return {
      success: true,
      limit: this.config.requests,
      remaining: this.config.requests - currentCount - 1,
      reset: now + (this.config.requests - currentCount - 1) / leakRate,
      strategy: this.config.strategy
    }
  }

  async reset(identifier: string): Promise<void> {
    const key = `rate_limit:${this.config.identifier}:${identifier}`
    await this.store.delete(key)
  }
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // API endpoint limits
  api_strict: {
    strategy: 'fixed_window' as const,
    requests: 100,
    window: 60 * 1000, // 1 minute
    identifier: 'api_strict'
  },
  api_moderate: {
    strategy: 'sliding_window' as const,
    requests: 1000,
    window: 60 * 1000, // 1 minute
    identifier: 'api_moderate'
  },
  api_lenient: {
    strategy: 'token_bucket' as const,
    requests: 5000,
    window: 60 * 1000, // 1 minute
    identifier: 'api_lenient'
  },
  
  // Authentication limits
  auth_login: {
    strategy: 'fixed_window' as const,
    requests: 5,
    window: 15 * 60 * 1000, // 15 minutes
    identifier: 'auth_login'
  },
  auth_signup: {
    strategy: 'fixed_window' as const,
    requests: 3,
    window: 60 * 60 * 1000, // 1 hour
    identifier: 'auth_signup'
  },
  auth_reset: {
    strategy: 'fixed_window' as const,
    requests: 3,
    window: 60 * 60 * 1000, // 1 hour
    identifier: 'auth_reset'
  },
  
  // Admin operations
  admin_config: {
    strategy: 'fixed_window' as const,
    requests: 10,
    window: 60 * 1000, // 1 minute
    identifier: 'admin_config'
  },
  admin_users: {
    strategy: 'sliding_window' as const,
    requests: 50,
    window: 60 * 1000, // 1 minute
    identifier: 'admin_users'
  },
  
  // Financial operations
  financial_read: {
    strategy: 'token_bucket' as const,
    requests: 200,
    window: 60 * 1000, // 1 minute
    identifier: 'financial_read'
  },
  financial_write: {
    strategy: 'fixed_window' as const,
    requests: 20,
    window: 60 * 1000, // 1 minute
    identifier: 'financial_write'
  },
  
  // New security-focused rate limits
  auth_strict: {
    strategy: 'fixed_window' as const,
    requests: 5,
    window: 15 * 60 * 1000, // 15 minutes
    identifier: 'auth_strict'
  },
  admin_moderate: {
    strategy: 'fixed_window' as const,
    requests: 10,
    window: 60 * 1000, // 1 minute
    identifier: 'admin_moderate'
  },
  write_operations: {
    strategy: 'fixed_window' as const,
    requests: 30,
    window: 60 * 1000, // 1 minute
    identifier: 'write_operations'
  },
  read_operations: {
    strategy: 'sliding_window' as const,
    requests: 100,
    window: 60 * 1000, // 1 minute
    identifier: 'read_operations'
  },
  public_search: {
    strategy: 'token_bucket' as const,
    requests: 200,
    window: 60 * 1000, // 1 minute
    identifier: 'public_search'
  },
  financial_read_secure: {
    strategy: 'sliding_window' as const,
    requests: 60,
    window: 60 * 1000, // 1 minute
    identifier: 'financial_read_secure'
  },
  
  // Global limits
  global_per_ip: {
    strategy: 'sliding_window' as const,
    requests: 10000,
    window: 60 * 1000, // 1 minute
    identifier: 'global_per_ip'
  },
  global_per_user: {
    strategy: 'token_bucket' as const,
    requests: 5000,
    window: 60 * 1000, // 1 minute
    identifier: 'global_per_user'
  }
}

// Utility function to get client identifier from request
export function getClientIdentifier(request: NextRequest, includeUserAgent: boolean = false): string {
  const ip = (request as any).ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  
  if (!includeUserAgent) {
    return ip
  }
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `${ip}:${Buffer.from(userAgent).toString('base64').substring(0, 16)}`
}

// Create rate limiter instances
export function createRateLimiter(config: RateLimitConfig, store?: RateLimitStore): RateLimiter {
  return new RateLimiter(store, config)
}