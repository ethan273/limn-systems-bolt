/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';
// Remove unused import
// import { serverPerformanceMonitor } from '@/lib/performance/server-monitoring';

// API monitoring types
export interface APICall {
  id: string;
  method: string;
  endpoint: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  userId?: string;
  ip: string;
  userAgent: string;
  responseSize?: number;
  errorMessage?: string;
}

export interface SecurityAlert {
  id: string;
  type: 'rate_limit_exceeded' | 'suspicious_activity' | 'authentication_failure' | 'authorization_failure' | 'data_breach_attempt' | 'ddos_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface MonitoringMetrics {
  totalRequests: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  activeAlerts: number;
  topEndpoints: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
  topErrors: Array<{ error: string; count: number }>;
  suspiciousIPs: Array<{ ip: string; count: number; lastSeen: number }>;
}

// API monitoring class
export class APIMonitor {
  private static instance: APIMonitor;
  private apiCalls: APICall[] = [];
  private securityAlerts: SecurityAlert[] = [];
  private suspiciousIPs = new Map<string, { count: number; lastSeen: number; blocked: boolean }>();
  private readonly maxCallHistory = 10000;
  private readonly maxAlerts = 1000;
  private readonly suspiciousIPThreshold = 100; // requests per hour
  private readonly ddosThreshold = 1000; // requests per minute

  static getInstance(): APIMonitor {
    if (!APIMonitor.instance) {
      APIMonitor.instance = new APIMonitor();
    }
    return APIMonitor.instance;
  }

  // Record API call
  recordAPICall(apiCall: Omit<APICall, 'id' | 'timestamp'>): void {
    const call: APICall = {
      ...apiCall,
      id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.apiCalls.push(call);

    // Keep only recent calls
    if (this.apiCalls.length > this.maxCallHistory) {
      this.apiCalls.shift();
    }

    // Check for suspicious activity
    this.checkForSuspiciousActivity(call);

    // Check for DDoS attempts
    this.checkForDDoSAttempt(call);
  }

  // Create security alert
  private async createAlert(
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    description: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      description,
      metadata,
      timestamp: Date.now(),
      resolved: false
    };

    this.securityAlerts.push(alert);

    // Keep only recent alerts
    if (this.securityAlerts.length > this.maxAlerts) {
      this.securityAlerts.shift();
    }

    // Log the alert
    await secureLogger.logSecurityEvent(
      `API Security Alert: ${description}`,
      severity,
      {
        alertId: alert.id,
        alertType: type,
        ...metadata
      },
      {
        category: LogCategory.SECURITY
      }
    );

    // Send critical alerts to external monitoring if configured
    if (severity === 'critical') {
      await this.sendCriticalAlert(alert);
    }
  }

  // Check for suspicious activity patterns
  private async checkForSuspiciousActivity(call: APICall): Promise<void> {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    // Count requests from this IP in the last hour
    const recentCallsFromIP = this.apiCalls.filter(
      c => c.ip === call.ip && c.timestamp > oneHourAgo
    );

    if (recentCallsFromIP.length > this.suspiciousIPThreshold) {
      // Mark IP as suspicious
      this.suspiciousIPs.set(call.ip, {
        count: recentCallsFromIP.length,
        lastSeen: Date.now(),
        blocked: false
      });

      await this.createAlert(
        'suspicious_activity',
        'medium',
        `Suspicious activity detected from IP ${call.ip}`,
        {
          ip: call.ip,
          requestCount: recentCallsFromIP.length,
          timeWindow: '1 hour',
          endpoints: [...new Set(recentCallsFromIP.map(c => c.endpoint))],
          userAgents: [...new Set(recentCallsFromIP.map(c => c.userAgent))]
        }
      );
    }

    // Check for rapid error rates
    const recentErrors = recentCallsFromIP.filter(c => c.statusCode >= 400);
    if (recentErrors.length > 20) { // More than 20 errors per hour from single IP
      await this.createAlert(
        'suspicious_activity',
        'high',
        `High error rate from IP ${call.ip}`,
        {
          ip: call.ip,
          errorCount: recentErrors.length,
          errorRate: (recentErrors.length / recentCallsFromIP.length) * 100,
          commonErrors: this.getCommonErrorCodes(recentErrors)
        }
      );
    }
  }

  // Check for DDoS attempts
  private async checkForDDoSAttempt(_call: APICall): Promise<void> {
    const oneMinuteAgo = Date.now() - 60 * 1000;
    
    // Count total requests in the last minute
    const recentCalls = this.apiCalls.filter(c => c.timestamp > oneMinuteAgo);
    
    if (recentCalls.length > this.ddosThreshold) {
      const uniqueIPs = new Set(recentCalls.map(c => c.ip));
      
      await this.createAlert(
        'ddos_attempt',
        'critical',
        `Potential DDoS attack detected`,
        {
          requestsPerMinute: recentCalls.length,
          uniqueIPs: uniqueIPs.size,
          topEndpoints: this.getTopEndpoints(recentCalls, 5),
          topIPs: this.getTopIPs(recentCalls, 10)
        }
      );
    }
  }

  // Helper methods
  private getCommonErrorCodes(errorCalls: APICall[]): Array<{ code: number; count: number }> {
    const errorCounts = new Map<number, number>();
    errorCalls.forEach(call => {
      errorCounts.set(call.statusCode, (errorCounts.get(call.statusCode) || 0) + 1);
    });
    
    return Array.from(errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getTopEndpoints(calls: APICall[], limit: number): Array<{ endpoint: string; count: number }> {
    const endpointCounts = new Map<string, number>();
    calls.forEach(call => {
      endpointCounts.set(call.endpoint, (endpointCounts.get(call.endpoint) || 0) + 1);
    });
    
    return Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private getTopIPs(calls: APICall[], limit: number): Array<{ ip: string; count: number }> {
    const ipCounts = new Map<string, number>();
    calls.forEach(call => {
      ipCounts.set(call.ip, (ipCounts.get(call.ip) || 0) + 1);
    });
    
    return Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Send critical alerts to external systems
  private async sendCriticalAlert(alert: SecurityAlert): Promise<void> {
    // In a real implementation, this would send to:
    // - Email notifications
    // - Slack/Teams webhooks  
    // - PagerDuty/OpsGenie
    // - External monitoring systems
    
    await secureLogger.error('CRITICAL SECURITY ALERT', {
      alertId: alert.id,
      type: alert.type,
      description: alert.description,
      metadata: alert.metadata,
      requiresImmedateAttention: true
    }, {
      category: LogCategory.SECURITY
    });
  }

  // Get monitoring metrics
  getMetrics(): MonitoringMetrics {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinuteAgo = now - 60 * 1000;

    const recentCalls = this.apiCalls.filter(c => c.timestamp > oneHourAgo);
    const lastMinuteCalls = this.apiCalls.filter(c => c.timestamp > oneMinuteAgo);
    
    const totalRequests = recentCalls.length;
    const requestsPerMinute = lastMinuteCalls.length;
    const averageResponseTime = recentCalls.length > 0 
      ? recentCalls.reduce((sum, c) => sum + c.duration, 0) / recentCalls.length 
      : 0;
    
    const errorCalls = recentCalls.filter(c => c.statusCode >= 400);
    const errorRate = recentCalls.length > 0 ? (errorCalls.length / recentCalls.length) * 100 : 0;

    const activeAlerts = this.securityAlerts.filter(a => !a.resolved).length;

    // Top endpoints with avg response time
    const endpointStats = new Map<string, { count: number; totalTime: number }>();
    recentCalls.forEach(call => {
      const current = endpointStats.get(call.endpoint) || { count: 0, totalTime: 0 };
      endpointStats.set(call.endpoint, {
        count: current.count + 1,
        totalTime: current.totalTime + call.duration
      });
    });

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgResponseTime: Math.round(stats.totalTime / stats.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top errors
    const errorStats = new Map<string, number>();
    errorCalls.forEach(call => {
      const errorKey = call.errorMessage || `HTTP ${call.statusCode}`;
      errorStats.set(errorKey, (errorStats.get(errorKey) || 0) + 1);
    });

    const topErrors = Array.from(errorStats.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Suspicious IPs
    const suspiciousIPs = Array.from(this.suspiciousIPs.entries())
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      requestsPerMinute,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      activeAlerts,
      topEndpoints,
      topErrors,
      suspiciousIPs
    };
  }

  // Get security alerts
  getAlerts(limit: number = 50, onlyUnresolved: boolean = false): SecurityAlert[] {
    const alerts = onlyUnresolved 
      ? this.securityAlerts.filter(a => !a.resolved)
      : this.securityAlerts;
    
    return alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Resolve alert
  async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    const alert = this.securityAlerts.find(a => a.id === alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    alert.resolvedBy = resolvedBy;

    await secureLogger.info('Security alert resolved', {
      alertId,
      resolvedBy,
      alertType: alert.type,
      severity: alert.severity
    }, {
      category: LogCategory.SECURITY
    });

    return true;
  }

  // Check if IP is blocked
  isIPBlocked(ip: string): boolean {
    const data = this.suspiciousIPs.get(ip);
    return data?.blocked || false;
  }

  // Block/unblock IP
  async setIPBlocked(ip: string, blocked: boolean, reason: string): Promise<void> {
    const data = this.suspiciousIPs.get(ip) || { count: 0, lastSeen: Date.now(), blocked: false };
    data.blocked = blocked;
    this.suspiciousIPs.set(ip, data);

    await secureLogger.warn(`IP ${blocked ? 'blocked' : 'unblocked'}`, {
      ip,
      blocked,
      reason,
      previousCount: data.count
    }, {
      category: LogCategory.SECURITY
    });
  }
}

// Monitoring middleware wrapper
export function withAPIMonitoring<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const startTime = Date.now();
    const monitor = APIMonitor.getInstance();
    
    // Extract request details
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const endpoint = new URL(request.url).pathname;
    
    // Check if IP is blocked
    if (monitor.isIPBlocked(ip)) {
      const response = new Response(
        JSON.stringify({ error: 'Access denied' }), 
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      monitor.recordAPICall({
        method: request.method,
        endpoint,
        statusCode: 403,
        duration: Date.now() - startTime,
        ip,
        userAgent,
        errorMessage: 'IP blocked'
      });
      
      return response;
    }

    let response: Response;
    let errorMessage: string | undefined;

    try {
      response = await handler(request, ...args);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      response = new Response(
        JSON.stringify({ error: 'Internal Server Error' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const duration = Date.now() - startTime;

    // Record the API call
    monitor.recordAPICall({
      method: request.method,
      endpoint,
      statusCode: response.status,
      duration,
      ip,
      userAgent,
      responseSize: response.headers.get('content-length') 
        ? parseInt(response.headers.get('content-length')!, 10) 
        : undefined,
      errorMessage
    });

    return response;
  };
}

// Export singleton instance
export const apiMonitor = APIMonitor.getInstance();