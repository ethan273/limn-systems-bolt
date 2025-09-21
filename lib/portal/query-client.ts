/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient } from '@tanstack/react-query';
import { cacheManager, type CacheType } from './cache-manager';

// Custom query client with integrated LRU cache
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global query defaults
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors except 408 (timeout)
        if ((error as any)?.status >= 400 && (error as any)?.status < 500 && (error as any)?.status !== 408) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Global mutation defaults
      retry: 1,
      retryDelay: 1000,
      onSuccess: () => {
        // Invalidate related queries on successful mutations
      },
      onError: (error: unknown) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Enhanced query key factory
export const queryKeys = {
  // Production tracking
  production: {
    all: ['production'] as const,
    byOrder: (orderId: string) => ['production', orderId] as const,
    stage: (orderId: string, stage: string) => ['production', orderId, stage] as const,
    timeline: (orderId: string) => ['production', orderId, 'timeline'] as const,
  },
  
  // Financial data
  financial: {
    all: ['financial'] as const,
    summary: (customerId: string) => ['financial', customerId, 'summary'] as const,
    invoices: (customerId: string) => ['financial', customerId, 'invoices'] as const,
    payments: (customerId: string) => ['financial', customerId, 'payments'] as const,
    reports: (customerId: string, type: string) => ['financial', customerId, 'reports', type] as const,
  },
  
  // Documents
  documents: {
    all: ['documents'] as const,
    byCustomer: (customerId: string) => ['documents', customerId] as const,
    byCategory: (customerId: string, category: string) => ['documents', customerId, category] as const,
    versions: (documentId: string) => ['documents', documentId, 'versions'] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    byCustomer: (customerId: string) => ['notifications', customerId] as const,
    unread: (customerId: string) => ['notifications', customerId, 'unread'] as const,
    preferences: (customerId: string) => ['notifications', customerId, 'preferences'] as const,
  },
  
  // Messages
  messages: {
    all: ['messages'] as const,
    threads: (customerId: string) => ['messages', customerId, 'threads'] as const,
    thread: (threadId: string) => ['messages', 'thread', threadId] as const,
    unread: (customerId: string) => ['messages', customerId, 'unread'] as const,
  },
  
  // Orders
  orders: {
    all: ['orders'] as const,
    byCustomer: (customerId: string) => ['orders', customerId] as const,
    detail: (orderId: string) => ['orders', orderId] as const,
    byStatus: (customerId: string, status: string) => ['orders', customerId, status] as const,
  },
  
  // Design approvals
  approvals: {
    all: ['approvals'] as const,
    byCustomer: (customerId: string) => ['approvals', customerId] as const,
    byOrder: (orderId: string) => ['approvals', orderId] as const,
    pending: (customerId: string) => ['approvals', customerId, 'pending'] as const,
  },
  
  // Shipping
  shipping: {
    all: ['shipping'] as const,
    byOrder: (orderId: string) => ['shipping', orderId] as const,
    tracking: (trackingNumber: string) => ['shipping', 'tracking', trackingNumber] as const,
  },
} as const;

// Utility functions for cache integration
export const cacheUtils = {
  // Get data from LRU cache first, then React Query cache
  getCachedData: <T>(cacheType: CacheType, key: string): T | undefined => {
    return cacheManager.get<T>(cacheType, key);
  },
  
  // Set data in both LRU cache and React Query cache
  setCachedData: <T>(cacheType: CacheType, key: string, data: T, queryKey: unknown[]) => {
    cacheManager.set(cacheType, key, data);
    queryClient.setQueryData(queryKey, data);
  },
  
  // Invalidate both LRU cache and React Query cache
  invalidateCache: (cacheType: CacheType, pattern: string, queryKeyPattern: unknown[]) => {
    cacheManager.invalidatePattern(cacheType, pattern);
    queryClient.invalidateQueries({ queryKey: queryKeyPattern });
  },
  
  // Prefetch data and store in both caches
  prefetchData: async <T>(
    cacheType: CacheType,
    cacheKey: string,
    queryKey: unknown[],
    queryFn: () => Promise<T>,
    staleTime?: number
  ) => {
    // Check LRU cache first
    const cachedData = cacheManager.get<T>(cacheType, cacheKey);
    if (cachedData) {
      queryClient.setQueryData(queryKey, cachedData);
      return cachedData;
    }
    
    // Prefetch with React Query
    const data = await queryClient.fetchQuery({
      queryKey,
      queryFn,
      staleTime: staleTime || 1000 * 60 * 5,
    });
    
    // Store in LRU cache
    if (data) {
      cacheManager.set(cacheType, cacheKey, data);
    }
    
    return data;
  },
};

// Performance monitoring
export const queryMetrics = {
  getQueryStats: () => {
    const queryCache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();
    
    return {
      queries: {
        total: queryCache.getAll().length,
        stale: queryCache.getAll().filter(q => q.isStale()).length,
        fetching: queryCache.getAll().filter(q => (q as any).isFetching()).length,
      },
      mutations: {
        total: mutationCache.getAll().length,
        pending: mutationCache.getAll().filter(m => m.state.status === 'pending').length,
      },
      cache: cacheManager.getAllStats(),
    };
  },
  
  clearAllCaches: () => {
    queryClient.clear();
    cacheManager.clearAll();
  },
  
  getMemoryUsage: () => {
    return {
      reactQuery: queryClient.getQueryCache().getAll().length,
      lruCache: Object.values(cacheManager.getAllStats()).reduce(
        (total, stats) => total + (stats as any).size, 0
      ),
    };
  },
};