import { NextRequest, NextResponse } from 'next/server';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';

// Cache configuration types
interface CacheConfig {
  ttl: number; // Time to live in seconds
  staleWhileRevalidate?: number; // Stale-while-revalidate time in seconds
  tags?: string[]; // Cache tags for invalidation
  vary?: string[]; // Vary headers
  private?: boolean; // Whether cache is private or public
  mustRevalidate?: boolean; // Whether cache must revalidate
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
  etag: string;
  contentType: string;
  headers: Record<string, string>;
}

// In-memory cache implementation (for development/testing)
// In production, this should be replaced with Redis or similar
class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize = 1000; // Maximum cache entries

  async set(key: string, data: unknown, config: CacheConfig, headers: Record<string, string> = {}): Promise<void> {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const etag = await this.generateETag(data);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl * 1000, // Convert to milliseconds
      etag,
      contentType: headers['content-type'] || 'application/json',
      headers
    };

    this.cache.set(key, entry);
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for this
      entries: entries.slice(0, 20) // Return first 20 entries
    };
  }

  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private async generateETag(data: unknown): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `"${hash}"`;
  }
}

// Global cache instance
const globalCache = new MemoryCache();

// Cache statistics tracking
class CacheStats {
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private errors = 0;

  hit(): void {
    this.hits++;
  }

  miss(): void {
    this.misses++;
  }

  set(): void {
    this.sets++;
  }

  error(): void {
    this.errors++;
  }

  getStats(): {
    hits: number;
    misses: number;
    sets: number;
    errors: number;
    hitRate: number;
    totalRequests: number;
  } {
    const totalRequests = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      errors: this.errors,
      hitRate: totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0,
      totalRequests
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.errors = 0;
  }
}

const cacheStats = new CacheStats();

// Cache key generation
export function generateCacheKey(
  request: NextRequest,
  keyPrefix: string,
  includeParams: string[] = [],
  includeHeaders: string[] = []
): string {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Include specified query parameters
  const params = new URLSearchParams();
  includeParams.forEach(param => {
    const value = url.searchParams.get(param);
    if (value !== null) {
      params.set(param, value);
    }
  });

  // Include specified headers
  const headerValues = includeHeaders
    .map(header => `${header}:${request.headers.get(header) || ''}`)
    .join('|');

  const keyParts = [
    keyPrefix,
    path,
    params.toString(),
    headerValues
  ].filter(Boolean);

  return keyParts.join('::');
}

// Caching middleware wrapper
export function withCaching<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  config: CacheConfig,
  options: {
    keyPrefix: string;
    includeParams?: string[];
    includeHeaders?: string[];
    cachePredicate?: (request: NextRequest, response: NextResponse) => boolean;
  }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Only cache GET requests
      if (request.method !== 'GET') {
        return await handler(request, ...args);
      }

      const cacheKey = generateCacheKey(
        request,
        options.keyPrefix,
        options.includeParams,
        options.includeHeaders
      );

      // Check for cached response
      const cachedEntry = globalCache.get(cacheKey);
      if (cachedEntry) {
        cacheStats.hit();

        // Check if client has cached version (ETag)
        const clientETag = request.headers.get('if-none-match');
        if (clientETag === cachedEntry.etag) {
          await secureLogger.debug('Cache hit - 304 Not Modified', {
            cacheKey,
            method: request.method,
            url: request.url
          }, {
            category: LogCategory.PERFORMANCE
          });

          return new NextResponse(null, {
            status: 304,
            headers: {
              'ETag': cachedEntry.etag,
              'Cache-Control': `max-age=${config.ttl}${config.staleWhileRevalidate ? `, stale-while-revalidate=${config.staleWhileRevalidate}` : ''}`,
            }
          });
        }

        await secureLogger.debug('Cache hit - returning cached response', {
          cacheKey,
          method: request.method,
          url: request.url,
          age: Date.now() - cachedEntry.timestamp
        }, {
          category: LogCategory.PERFORMANCE
        });

        return NextResponse.json(cachedEntry.data, {
          status: 200,
          headers: {
            ...cachedEntry.headers,
            'ETag': cachedEntry.etag,
            'X-Cache': 'HIT',
            'Cache-Control': `max-age=${config.ttl}${config.staleWhileRevalidate ? `, stale-while-revalidate=${config.staleWhileRevalidate}` : ''}`,
          }
        });
      }

      // Cache miss - execute handler
      cacheStats.miss();
      const response = await handler(request, ...args);

      // Only cache successful responses
      if (response.status >= 200 && response.status < 300) {
        // Check if response should be cached
        if (!options.cachePredicate || options.cachePredicate(request, response)) {
          try {
            const responseData = await response.clone().json();
            const responseHeaders: Record<string, string> = {};
            
            response.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });

            await globalCache.set(cacheKey, responseData, config, responseHeaders);
            cacheStats.set();

            await secureLogger.debug('Response cached', {
              cacheKey,
              method: request.method,
              url: request.url,
              ttl: config.ttl,
              size: JSON.stringify(responseData).length
            }, {
              category: LogCategory.PERFORMANCE
            });

            // Add cache headers to response
            const etag = globalCache.get(cacheKey)?.etag;
            response.headers.set('ETag', etag || '');
            response.headers.set('X-Cache', 'MISS');
            response.headers.set('Cache-Control', 
              `${config.private ? 'private' : 'public'}, max-age=${config.ttl}${
                config.staleWhileRevalidate ? `, stale-while-revalidate=${config.staleWhileRevalidate}` : ''
              }${config.mustRevalidate ? ', must-revalidate' : ''}`
            );

          } catch (error) {
            cacheStats.error();
            await secureLogger.warn('Failed to cache response', {
              error: error instanceof Error ? error.message : 'Unknown error',
              cacheKey,
              method: request.method,
              url: request.url
            }, {
              category: LogCategory.PERFORMANCE
            });
          }
        }
      }

      return response;

    } catch (error) {
      cacheStats.error();
      await secureLogger.error('Cache middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: request.method,
        url: request.url
      }, {
        category: LogCategory.PERFORMANCE
      });

      // Fall back to executing handler without caching
      return await handler(request, ...args);
    }
  };
}

// Cache management functions
export const CacheManager = {
  // Invalidate cache by key pattern
  invalidate(pattern: string): number {
    const stats = globalCache.getStats();
    let invalidated = 0;

    stats.entries.forEach(entry => {
      if (entry.key.includes(pattern)) {
        globalCache.delete(entry.key);
        invalidated++;
      }
    });

    return invalidated;
  },

  // Clear all cache
  clear(): void {
    globalCache.clear();
    cacheStats.reset();
  },

  // Get cache statistics
  getStats(): {
    performance: ReturnType<typeof cacheStats.getStats>;
    storage: ReturnType<typeof globalCache.getStats>;
  } {
    return {
      performance: cacheStats.getStats(),
      storage: globalCache.getStats()
    };
  },

  // Warm cache with pre-computed responses
  async warmCache(entries: Array<{ key: string; data: unknown; config: CacheConfig }>): Promise<void> {
    await Promise.all(entries.map(async ({ key, data, config }) => {
      await globalCache.set(key, data, config);
    }));
  }
};

// Predefined cache configurations
export const CacheConfigs = {
  // Short-lived cache for frequently changing data (5 minutes)
  SHORT: {
    ttl: 300,
    staleWhileRevalidate: 60,
    private: false,
    mustRevalidate: false
  } as CacheConfig,

  // Medium cache for semi-static data (15 minutes)
  MEDIUM: {
    ttl: 900,
    staleWhileRevalidate: 300,
    private: false,
    mustRevalidate: false
  } as CacheConfig,

  // Long cache for static/rarely changing data (1 hour)
  LONG: {
    ttl: 3600,
    staleWhileRevalidate: 900,
    private: false,
    mustRevalidate: false
  } as CacheConfig,

  // User-specific cache (10 minutes, private)
  USER_SPECIFIC: {
    ttl: 600,
    staleWhileRevalidate: 120,
    private: true,
    mustRevalidate: true
  } as CacheConfig,

  // Static data cache (24 hours)
  STATIC: {
    ttl: 86400,
    staleWhileRevalidate: 3600,
    private: false,
    mustRevalidate: false
  } as CacheConfig
};

export { globalCache, cacheStats };