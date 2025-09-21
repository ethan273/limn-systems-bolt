import { NextRequest, NextResponse } from 'next/server';
import { requirePermissions } from '@/lib/permissions/rbac';
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware';
import { apiMonitor } from '@/lib/security/api-monitoring';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';
import { handleAPIError } from '@/lib/error-handling/error-middleware';
import { withComprehensiveSecurity } from '@/lib/security/headers-middleware';

// GET /api/admin/security - Get security monitoring data
async function getSecurityHandler(request: NextRequest): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.read_operations);
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  try {
    // Validate admin permissions
    const authResult = await requirePermissions(request, ['admin.security.read']);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Admin access required' },
        { status: authResult.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const alertsOnly = searchParams.get('alerts') === 'true';
    const metricsOnly = searchParams.get('metrics') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const onlyUnresolved = searchParams.get('unresolved') === 'true';

    const responseData: Record<string, unknown> = {};

    if (!alertsOnly) {
      // Get monitoring metrics
      const metrics = apiMonitor.getMetrics();
      responseData.metrics = metrics;

      await secureLogger.info('Security metrics accessed', {
        userId: authResult.user?.id,
        totalRequests: metrics.totalRequests,
        errorRate: metrics.errorRate,
        activeAlerts: metrics.activeAlerts
      }, {
        category: LogCategory.SECURITY
      });
    }

    if (!metricsOnly) {
      // Get security alerts
      const alerts = apiMonitor.getAlerts(limit, onlyUnresolved);
      responseData.alerts = alerts.map(alert => ({
        ...alert,
        // Convert timestamps to ISO strings for better readability
        timestamp: new Date(alert.timestamp).toISOString(),
        resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : undefined
      }));
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to fetch security data'), request);
  }
}

// POST /api/admin/security - Security management operations
async function postSecurityHandler(request: NextRequest): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.write_operations);
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  try {
    // Validate admin permissions
    const authResult = await requirePermissions(request, ['admin.security.scan']);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Admin access required' },
        { status: authResult.statusCode || 403 }
      );
    }

    const body = await request.json();
    const { action, alertId, ip, reason } = body;

    const result: Record<string, unknown> = { operation: action };

    switch (action) {
      case 'resolve_alert':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          );
        }
        
        const resolved = await apiMonitor.resolveAlert(alertId, authResult.user?.id || 'admin');
        result.success = resolved;
        result.alertId = alertId;
        
        if (!resolved) {
          return NextResponse.json(
            { error: 'Alert not found or already resolved' },
            { status: 404 }
          );
        }
        break;

      case 'block_ip':
        if (!ip) {
          return NextResponse.json(
            { error: 'IP address is required' },
            { status: 400 }
          );
        }
        
        await apiMonitor.setIPBlocked(ip, true, reason || 'Admin blocked');
        result.ip = ip;
        result.blocked = true;
        break;

      case 'unblock_ip':
        if (!ip) {
          return NextResponse.json(
            { error: 'IP address is required' },
            { status: 400 }
          );
        }
        
        await apiMonitor.setIPBlocked(ip, false, reason || 'Admin unblocked');
        result.ip = ip;
        result.blocked = false;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: resolve_alert, block_ip, unblock_ip' },
          { status: 400 }
        );
    }

    await secureLogger.info('Security action performed', {
      action,
      userId: authResult.user?.id,
      ...result
    }, {
      category: LogCategory.SECURITY
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Security action '${action}' completed successfully`
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to execute security action'), request);
  }
}

// Apply comprehensive security to handlers
export const GET = withComprehensiveSecurity(getSecurityHandler, {
  enableCSRF: false, // Not needed for GET requests
  enableSecurityScanning: true,
  customSecurityHeaders: {
    // Extra strict headers for admin endpoints
    xFrameOptions: 'DENY',
    contentSecurityPolicy: "default-src 'none'; script-src 'none'; style-src 'none';"
  }
});

export const POST = withComprehensiveSecurity(postSecurityHandler, {
  enableCSRF: true,
  enableSecurityScanning: true,
  customSecurityHeaders: {
    xFrameOptions: 'DENY',
    contentSecurityPolicy: "default-src 'none'; script-src 'none'; style-src 'none';"
  }
});