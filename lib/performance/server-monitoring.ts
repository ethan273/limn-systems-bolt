import { NextRequest, NextResponse } from 'next/server';
import { secureLogger, LogLevel, LogCategory } from '@/lib/logging/secure-logger';

// Server-side performance monitoring for API routes
export interface APIPerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  statusCode: number;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  databaseQueries?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

// Performance thresholds for alerting
export const PERFORMANCE_THRESHOLDS = {
  // API response times (in ms)
  SLOW_REQUEST: 2000,      // 2 seconds
  CRITICAL_REQUEST: 5000,  // 5 seconds
  
  // Memory usage (in MB)
  HIGH_MEMORY: 512,        // 512 MB
  CRITICAL_MEMORY: 1024,   // 1 GB
  
  // Database query performance
  SLOW_QUERY: 1000,        // 1 second
  CRITICAL_QUERY: 3000,    // 3 seconds
} as const;

// Global performance tracker
class ServerPerformanceMonitor {
  private static instance: ServerPerformanceMonitor;
  private activeRequests = new Map<string, APIPerformanceMetrics>();
  private metricsBuffer: APIPerformanceMetrics[] = [];
  private readonly bufferSize = 100;

  static getInstance(): ServerPerformanceMonitor {
    if (!ServerPerformanceMonitor.instance) {
      ServerPerformanceMonitor.instance = new ServerPerformanceMonitor();
    }
    return ServerPerformanceMonitor.instance;
  }

  // Start tracking a request
  startRequest(
    requestId: string,
    request: NextRequest,
    userId?: string
  ): void {
    const startTime = process.hrtime.bigint();
    const startCpuUsage = process.cpuUsage();
    
    const metrics: APIPerformanceMetrics = {
      requestId,
      method: request.method,
      url: request.url,
      startTime: Number(startTime / BigInt(1_000_000)), // Convert to milliseconds
      endTime: 0,
      duration: 0,
      statusCode: 0,
      userId,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
      memoryUsage: process.memoryUsage(),
      cpuUsage: startCpuUsage,
      databaseQueries: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    this.activeRequests.set(requestId, metrics);
  }

  // End tracking a request
  async endRequest(
    requestId: string,
    response: NextResponse,
    additionalMetrics?: Partial<APIPerformanceMetrics>
  ): Promise<void> {
    const metrics = this.activeRequests.get(requestId);
    if (!metrics) {
      return;
    }

    const endTime = process.hrtime.bigint();
    const endCpuUsage = process.cpuUsage(metrics.cpuUsage);
    const endMemoryUsage = process.memoryUsage();

    // Update metrics
    metrics.endTime = Number(endTime / BigInt(1_000_000));
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.statusCode = response.status;
    
    // Update resource usage
    metrics.memoryUsage = endMemoryUsage;
    metrics.cpuUsage = endCpuUsage;
    
    // Add any additional metrics
    if (additionalMetrics) {
      Object.assign(metrics, additionalMetrics);
    }

    // Remove from active tracking
    this.activeRequests.delete(requestId);

    // Add to buffer
    this.metricsBuffer.push(metrics);
    if (this.metricsBuffer.length > this.bufferSize) {
      this.metricsBuffer.shift();
    }

    // Log performance metrics
    await this.logPerformanceMetrics(metrics);

    // Check for performance alerts
    await this.checkPerformanceThresholds(metrics);
  }

  private async logPerformanceMetrics(metrics: APIPerformanceMetrics): Promise<void> {
    // Remove unused variable
    // const logLevel = this.getLogLevel(metrics);
    
    await secureLogger.info('API Request Performance', {
      requestId: metrics.requestId,
      method: metrics.method,
      url: metrics.url,
      duration: metrics.duration,
      statusCode: metrics.statusCode,
      memoryUsage: {
        heapUsed: Math.round((metrics.memoryUsage?.heapUsed || 0) / 1024 / 1024), // MB
        heapTotal: Math.round((metrics.memoryUsage?.heapTotal || 0) / 1024 / 1024), // MB
        external: Math.round((metrics.memoryUsage?.external || 0) / 1024 / 1024), // MB
      },
      cpuUsage: {
        user: metrics.cpuUsage?.user,
        system: metrics.cpuUsage?.system
      },
      databaseQueries: metrics.databaseQueries,
      cachePerformance: {
        hits: metrics.cacheHits,
        misses: metrics.cacheMisses,
        hitRate: metrics.cacheHits && metrics.cacheMisses ? 
          Math.round((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100) : null
      }
    }, {
      category: LogCategory.PERFORMANCE,
      userId: metrics.userId,
      requestId: metrics.requestId,
      method: metrics.method,
      url: metrics.url,
      statusCode: metrics.statusCode,
      responseTime: metrics.duration
    });
  }

  private getLogLevel(metrics: APIPerformanceMetrics): LogLevel {
    if (metrics.duration >= PERFORMANCE_THRESHOLDS.CRITICAL_REQUEST) {
      return LogLevel.ERROR;
    }
    if (metrics.duration >= PERFORMANCE_THRESHOLDS.SLOW_REQUEST) {
      return LogLevel.WARN;
    }
    if (metrics.statusCode >= 500) {
      return LogLevel.ERROR;
    }
    if (metrics.statusCode >= 400) {
      return LogLevel.WARN;
    }
    return LogLevel.INFO;
  }

  private async checkPerformanceThresholds(metrics: APIPerformanceMetrics): Promise<void> {
    const alerts = [];

    // Response time alerts
    if (metrics.duration >= PERFORMANCE_THRESHOLDS.CRITICAL_REQUEST) {
      alerts.push({
        type: 'critical_response_time',
        message: `Critical response time: ${metrics.duration}ms`,
        threshold: PERFORMANCE_THRESHOLDS.CRITICAL_REQUEST
      });
    } else if (metrics.duration >= PERFORMANCE_THRESHOLDS.SLOW_REQUEST) {
      alerts.push({
        type: 'slow_response_time',
        message: `Slow response time: ${metrics.duration}ms`,
        threshold: PERFORMANCE_THRESHOLDS.SLOW_REQUEST
      });
    }

    // Memory usage alerts
    const heapUsedMB = (metrics.memoryUsage?.heapUsed || 0) / 1024 / 1024;
    if (heapUsedMB >= PERFORMANCE_THRESHOLDS.CRITICAL_MEMORY) {
      alerts.push({
        type: 'critical_memory_usage',
        message: `Critical memory usage: ${Math.round(heapUsedMB)}MB`,
        threshold: PERFORMANCE_THRESHOLDS.CRITICAL_MEMORY
      });
    } else if (heapUsedMB >= PERFORMANCE_THRESHOLDS.HIGH_MEMORY) {
      alerts.push({
        type: 'high_memory_usage',
        message: `High memory usage: ${Math.round(heapUsedMB)}MB`,
        threshold: PERFORMANCE_THRESHOLDS.HIGH_MEMORY
      });
    }

    // Log alerts
    for (const alert of alerts) {
      const severity = alert.type.startsWith('critical') ? 'critical' : 'high';
      
      await secureLogger.logSecurityEvent(
        `Performance Alert: ${alert.type}`,
        severity,
        {
          alertType: alert.type,
          message: alert.message,
          threshold: alert.threshold,
          actualValue: alert.type.includes('memory') ? heapUsedMB : metrics.duration,
          requestId: metrics.requestId,
          method: metrics.method,
          url: metrics.url,
          userId: metrics.userId
        },
        {
          category: LogCategory.PERFORMANCE,
          requestId: metrics.requestId
        }
      );
    }
  }

  // Get performance statistics
  getPerformanceStats(): {
    activeRequests: number;
    averageResponseTime: number;
    slowRequests: number;
    errorRate: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const recentMetrics = this.metricsBuffer.slice(-50); // Last 50 requests
    
    const averageResponseTime = recentMetrics.length > 0 ?
      recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length : 0;
    
    const slowRequests = recentMetrics.filter(m => 
      m.duration >= PERFORMANCE_THRESHOLDS.SLOW_REQUEST
    ).length;
    
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = recentMetrics.length > 0 ? (errorRequests / recentMetrics.length) * 100 : 0;

    return {
      activeRequests: this.activeRequests.size,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      memoryUsage: process.memoryUsage()
    };
  }
}

// Export singleton instance
export const serverPerformanceMonitor = ServerPerformanceMonitor.getInstance();

// Middleware wrapper for automatic performance monitoring
export function withPerformanceMonitoring<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    trackDatabase?: boolean;
    trackCache?: boolean;
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract user ID from request headers (added by middleware)
    const userId = request.headers.get('x-user-id') || undefined;
    
    // Start performance tracking
    serverPerformanceMonitor.startRequest(requestId, request, userId);
    
    let response: NextResponse = NextResponse.json({ error: 'No response' }, { status: 500 });
    const additionalMetrics: Partial<APIPerformanceMetrics> = {};
    
    try {
      // Execute the handler
      response = await handler(request, ...args);
      
      // Track additional metrics if specified
      if (options.trackDatabase) {
        // This would be populated by database query interceptors
        additionalMetrics.databaseQueries = 0; // Placeholder
      }
      
      if (options.trackCache) {
        // This would be populated by cache interceptors
        additionalMetrics.cacheHits = 0; // Placeholder
        additionalMetrics.cacheMisses = 0; // Placeholder
      }
      
    } catch (error) {
      // Create error response
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      
      // Log the error
      await secureLogger.error('Request handler error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        method: request.method,
        url: request.url
      });
    } finally {
      // End performance tracking
      await serverPerformanceMonitor.endRequest(requestId, response, additionalMetrics);
      
      // Add performance headers to response
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Response-Time', Date.now().toString());
    }
    
    return response;
  };
}

// Database query performance tracking (for integration with ORM/query builders)
export class DatabaseQueryTracker {
  private static queryCount = 0;
  private static slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: number;
  }> = [];

  static trackQuery(query: string, duration: number): void {
    this.queryCount++;
    
    if (duration >= PERFORMANCE_THRESHOLDS.SLOW_QUERY) {
      this.slowQueries.push({
        query: query.substring(0, 200), // Truncate for security
        duration,
        timestamp: Date.now()
      });
      
      // Keep only recent slow queries
      if (this.slowQueries.length > 50) {
        this.slowQueries.shift();
      }
      
      // Log slow query
      secureLogger.warn('Slow database query detected', {
        duration,
        queryPreview: query.substring(0, 100),
        threshold: PERFORMANCE_THRESHOLDS.SLOW_QUERY
      }, {
        category: LogCategory.DATABASE
      });
    }
  }

  static getQueryStats(): {
    totalQueries: number;
    slowQueries: number;
    averageQueryTime: number;
  } {
    const recentSlowQueries = this.slowQueries.filter(
      q => Date.now() - q.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    return {
      totalQueries: this.queryCount,
      slowQueries: recentSlowQueries.length,
      averageQueryTime: recentSlowQueries.length > 0 ?
        Math.round(recentSlowQueries.reduce((sum, q) => sum + q.duration, 0) / recentSlowQueries.length) : 0
    };
  }

  static reset(): void {
    this.queryCount = 0;
    this.slowQueries = [];
  }
}

// Health check endpoint data
export function getSystemHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: NodeJS.MemoryUsage;
  performance: ReturnType<typeof serverPerformanceMonitor.getPerformanceStats>;
  database: ReturnType<typeof DatabaseQueryTracker.getQueryStats>;
  timestamp: string;
} {
  const performance = serverPerformanceMonitor.getPerformanceStats();
  const database = DatabaseQueryTracker.getQueryStats();
  
  // Determine overall health status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (performance.errorRate > 10 || performance.averageResponseTime > PERFORMANCE_THRESHOLDS.SLOW_REQUEST) {
    status = 'degraded';
  }
  
  if (performance.errorRate > 25 || performance.averageResponseTime > PERFORMANCE_THRESHOLDS.CRITICAL_REQUEST) {
    status = 'unhealthy';
  }
  
  return {
    status,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    performance,
    database,
    timestamp: new Date().toISOString()
  };
}