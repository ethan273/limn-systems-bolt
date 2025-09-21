/* eslint-disable @typescript-eslint/no-explicit-any */
import { LRUCache } from 'lru-cache';

// Cache configurations for different data types
const cacheConfigs = {
  production: { max: 500, ttl: 1000 * 60 * 5 }, // 5 minutes
  financial: { max: 100, ttl: 1000 * 60 * 10 }, // 10 minutes
  documents: { max: 200, ttl: 1000 * 60 * 15 }, // 15 minutes
  notifications: { max: 50, ttl: 1000 * 60 * 2 }, // 2 minutes
  messages: { max: 100, ttl: 1000 * 60 * 1 }, // 1 minute
  orders: { max: 200, ttl: 1000 * 60 * 5 }, // 5 minutes
  approvals: { max: 100, ttl: 1000 * 60 * 10 }, // 10 minutes
  shipping: { max: 150, ttl: 1000 * 60 * 5 }, // 5 minutes
} as const;

// Create cache instances
const caches = {
  production: new LRUCache(cacheConfigs.production),
  financial: new LRUCache(cacheConfigs.financial),
  documents: new LRUCache(cacheConfigs.documents),
  notifications: new LRUCache(cacheConfigs.notifications),
  messages: new LRUCache(cacheConfigs.messages),
  orders: new LRUCache(cacheConfigs.orders),
  approvals: new LRUCache(cacheConfigs.approvals),
  shipping: new LRUCache(cacheConfigs.shipping),
} as const;

export type CacheType = keyof typeof caches;

export class CacheManager {
  private static instance: CacheManager;
  
  private constructor() {}
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  set<T>(type: CacheType, key: string, value: T): void {
    (caches[type] as any).set(key, value);
  }
  
  get<T>(type: CacheType, key: string): T | undefined {
    return caches[type].get(key) as T | undefined;
  }
  
  has(type: CacheType, key: string): boolean {
    return caches[type].has(key);
  }
  
  delete(type: CacheType, key: string): boolean {
    return caches[type].delete(key);
  }
  
  clear(type: CacheType): void {
    caches[type].clear();
  }
  
  clearAll(): void {
    Object.values(caches).forEach(cache => cache.clear());
  }
  
  // Cache invalidation patterns
  invalidatePattern(type: CacheType, pattern: string): void {
    const cache = caches[type];
    const keysToDelete: string[] = [];
    
    for (const key of cache.keys()) {
      if (typeof key === 'string' && key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
  }
  
  // Get cache statistics
  getStats(type: CacheType) {
    const cache = caches[type];
    return {
      size: cache.size,
      max: cache.max,
      hits: (cache as any).hits,
      misses: (cache as any).misses,
      hitRate: (cache as any).hits / ((cache as any).hits + (cache as any).misses) || 0,
    };
  }
  
  getAllStats() {
    return Object.entries(caches).reduce((stats, [type, cache]) => {
      stats[type as CacheType] = {
        size: cache.size,
        max: cache.max,
        hits: (cache as any).hits,
        misses: (cache as any).misses,
        hitRate: (cache as any).hits / ((cache as any).hits + (cache as any).misses) || 0,
      };
      return stats;
    }, {} as Record<CacheType, unknown>);
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// Cache key generators
export const generateCacheKey = {
  production: (orderId: string, stage?: string) => 
    stage ? `production:${orderId}:${stage}` : `production:${orderId}`,
  
  financial: (customerId: string, type?: string) => 
    type ? `financial:${customerId}:${type}` : `financial:${customerId}`,
  
  documents: (customerId: string, category?: string, status?: string) => {
    let key = `documents:${customerId}`;
    if (category) key += `:${category}`;
    if (status) key += `:${status}`;
    return key;
  },
  
  notifications: (customerId: string, unread?: boolean) => 
    unread ? `notifications:${customerId}:unread` : `notifications:${customerId}`,
  
  messages: (customerId: string, threadId?: string) => 
    threadId ? `messages:${customerId}:${threadId}` : `messages:${customerId}`,
  
  orders: (customerId: string, status?: string) => 
    status ? `orders:${customerId}:${status}` : `orders:${customerId}`,
  
  approvals: (customerId: string, status?: string) => 
    status ? `approvals:${customerId}:${status}` : `approvals:${customerId}`,
  
  shipping: (orderId: string) => `shipping:${orderId}`,
};