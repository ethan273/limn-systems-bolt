import { NextRequest, NextResponse } from 'next/server';
import { requirePermissions } from '@/lib/permissions/rbac';
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware';
import { CacheManager } from '@/lib/performance/caching-middleware';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';
import { handleAPIError } from '@/lib/error-handling/error-middleware';

// GET /api/admin/cache - Get cache statistics
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.read_operations)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }

  try {
    // Validate admin permissions
    const authResult = await requirePermissions(request, ['admin.cache.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Admin access required' },
        { status: authResult.statusCode || 403 }
      )
    }

    // Get cache statistics
    const cacheStats = CacheManager.getStats();

    await secureLogger.info('Cache statistics accessed', {
      userId: authResult.user?.id,
      cacheSize: cacheStats.storage.size,
      hitRate: cacheStats.performance.hitRate
    }, {
      category: LogCategory.SYSTEM
    });

    return NextResponse.json({
      success: true,
      data: {
        performance: cacheStats.performance,
        storage: {
          ...cacheStats.storage,
          // Only return summary of entries for security
          entries: cacheStats.storage.entries.map(entry => ({
            key: entry.key.split('::')[0] + '::...',  // Anonymize cache keys
            age: Math.round(entry.age / 1000),        // Convert to seconds
            ttl: Math.round(entry.ttl / 1000)         // Convert to seconds
          }))
        },
        recommendations: generateCacheRecommendations(cacheStats)
      }
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to fetch cache statistics'), request);
  }
}

// POST /api/admin/cache - Cache management operations
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.write_operations)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }

  try {
    // Validate admin permissions
    const authResult = await requirePermissions(request, ['admin.cache.manage'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Admin access required' },
        { status: authResult.statusCode || 403 }
      )
    }

    const body = await request.json();
    const { action, pattern } = body;

    const result: { operation: string; affected: number } = {
      operation: action,
      affected: 0
    };

    switch (action) {
      case 'clear':
        CacheManager.clear();
        result.affected = -1; // All entries cleared
        await secureLogger.info('Cache cleared by admin', {
          userId: authResult.user?.id,
          action: 'clear_all'
        }, {
          category: LogCategory.SYSTEM
        });
        break;

      case 'invalidate':
        if (!pattern) {
          return NextResponse.json(
            { error: 'Pattern is required for invalidation' },
            { status: 400 }
          );
        }
        result.affected = CacheManager.invalidate(pattern);
        await secureLogger.info('Cache invalidated by admin', {
          userId: authResult.user?.id,
          action: 'invalidate',
          pattern,
          entriesAffected: result.affected
        }, {
          category: LogCategory.SYSTEM
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: clear, invalidate' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Cache ${action} operation completed`
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to execute cache operation'), request);
  }
}

// DELETE /api/admin/cache - Clear all cache (alternative endpoint)
export async function DELETE(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.write_operations)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }

  try {
    // Validate admin permissions
    const authResult = await requirePermissions(request, ['admin.cache.manage'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Admin access required' },
        { status: authResult.statusCode || 403 }
      )
    }

    // Clear all cache
    CacheManager.clear();

    await secureLogger.warn('All cache cleared by admin', {
      userId: authResult.user?.id,
      action: 'clear_all_via_delete'
    }, {
      category: LogCategory.SYSTEM
    });

    return NextResponse.json({
      success: true,
      message: 'All cache entries cleared'
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to clear cache'), request);
  }
}

// Generate cache performance recommendations
function generateCacheRecommendations(stats: ReturnType<typeof CacheManager.getStats>): string[] {
  const recommendations: string[] = [];

  // Hit rate analysis
  if (stats.performance.hitRate < 50) {
    recommendations.push('Cache hit rate is low (<50%). Consider adjusting cache TTL or reviewing cache keys.');
  } else if (stats.performance.hitRate > 90) {
    recommendations.push('Excellent cache hit rate (>90%). Cache is performing well.');
  }

  // Cache size analysis
  if (stats.storage.size > stats.storage.maxSize * 0.8) {
    recommendations.push('Cache is nearing capacity. Consider increasing max size or implementing more aggressive eviction.');
  }

  // Error rate analysis
  if (stats.performance.errors > stats.performance.totalRequests * 0.05) {
    recommendations.push('High cache error rate detected. Review cache configuration and error logs.');
  }

  // Performance analysis
  if (stats.performance.totalRequests > 0) {
    if (stats.performance.misses > stats.performance.hits) {
      recommendations.push('More cache misses than hits. Review caching strategy and TTL settings.');
    }
  }

  // Storage optimization
  if (stats.storage.entries.length > 100) {
    const oldEntries = stats.storage.entries.filter(entry => entry.age > 3600000); // 1 hour
    if (oldEntries.length > stats.storage.entries.length * 0.3) {
      recommendations.push('Many old cache entries detected. Consider reducing TTL for better memory utilization.');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Cache performance looks good. No specific recommendations at this time.');
  }

  return recommendations;
}