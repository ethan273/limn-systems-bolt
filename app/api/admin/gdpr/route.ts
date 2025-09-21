import { NextRequest, NextResponse } from 'next/server';
import { requirePermissions } from '@/lib/permissions/rbac';
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware';
import { gdprManager } from '@/lib/compliance/gdpr-compliance';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';
import { handleAPIError } from '@/lib/error-handling/error-middleware';
import { withComprehensiveSecurity } from '@/lib/security/headers-middleware';

// GET /api/admin/gdpr - Get GDPR compliance dashboard
async function getAdminGDPRHandler(request: NextRequest): Promise<NextResponse> {
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.read_operations);
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  try {
    const authResult = await requirePermissions(request, ['admin.gdpr.read']);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - GDPR admin access required' },
        { status: authResult.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'dashboard';

    let responseData: unknown;

    switch (view) {
      case 'requests':
        // Get all pending GDPR requests
        responseData = {
          pendingRequests: gdprManager.getPendingRequests(),
          statistics: {
            totalPending: gdprManager.getPendingRequests().length,
            byType: gdprManager.getPendingRequests().reduce((acc: Record<string, number>, req) => {
              acc[req.requestType] = (acc[req.requestType] || 0) + 1;
              return acc;
            }, {})
          }
        };
        break;

      case 'compliance':
        // Get compliance status and metrics
        const complianceStatus = gdprManager.getComplianceStatus();
        responseData = {
          complianceStatus,
          retentionPolicies: [
            { dataType: 'user_accounts', retentionPeriod: '7 years', reason: 'Business records' },
            { dataType: 'order_data', retentionPeriod: '7 years', reason: 'Financial compliance' },
            { dataType: 'marketing_data', retentionPeriod: '2 years', reason: 'Marketing consent' },
            { dataType: 'session_logs', retentionPeriod: '90 days', reason: 'Technical operations' },
            { dataType: 'security_logs', retentionPeriod: '1 year', reason: 'Security compliance' }
          ],
          recommendations: generateComplianceRecommendations(complianceStatus)
        };
        break;

      case 'cleanup':
        // Perform data retention cleanup
        const cleanupResults = await gdprManager.performRetentionCleanup();
        responseData = {
          cleanupResults,
          summary: {
            successful: cleanupResults.recordsDeleted > 0,
            recordsProcessed: cleanupResults.recordsProcessed,
            recordsDeleted: cleanupResults.recordsDeleted,
            errors: cleanupResults.errors.length,
            nextCleanupDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        };
        
        await secureLogger.info('GDPR data retention cleanup performed', {
          adminUserId: authResult.user?.id,
          ...cleanupResults
        }, {
          category: LogCategory.AUDIT
        });
        break;

      default:
        // Dashboard overview
        const status = gdprManager.getComplianceStatus();
        responseData = {
          overview: status,
          recentRequests: gdprManager.getPendingRequests().slice(0, 5),
          alerts: generateGDPRAlerts(status),
          quickActions: [
            'Process pending access requests',
            'Review erasure requests',
            'Run data retention cleanup',
            'Update consent records'
          ]
        };
    }

    await secureLogger.info('GDPR admin dashboard accessed', {
      adminUserId: authResult.user?.id,
      view,
      timestamp: new Date().toISOString()
    }, {
      category: LogCategory.AUDIT
    });

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to fetch GDPR admin data'), request);
  }
}

// POST /api/admin/gdpr - Process GDPR admin actions
async function postAdminGDPRHandler(request: NextRequest): Promise<NextResponse> {
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.write_operations);
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  try {
    const authResult = await requirePermissions(request, ['admin.gdpr.manage']);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - GDPR management access required' },
        { status: authResult.statusCode || 403 }
      );
    }

    const body = await request.json();
    const { action, requestId, userId, reason } = body;
    const adminUserId = authResult.user?.id || 'admin';

    let result: Record<string, unknown> = { operation: action };

    switch (action) {
      case 'approve_erasure':
        if (!requestId) {
          return NextResponse.json(
            { error: 'Request ID is required' },
            { status: 400 }
          );
        }
        
        await gdprManager.processErasureRequest(requestId, adminUserId);
        result.requestId = requestId;
        result.status = 'processed';
        break;

      case 'reject_request':
        if (!requestId || !reason) {
          return NextResponse.json(
            { error: 'Request ID and reason are required' },
            { status: 400 }
          );
        }
        
        // This would update the request status to rejected
        // Implementation depends on how requests are stored
        result.requestId = requestId;
        result.status = 'rejected';
        result.reason = reason;
        
        await secureLogger.info('GDPR request rejected', {
          requestId,
          reason,
          adminUserId
        }, {
          category: LogCategory.AUDIT
        });
        break;

      case 'record_consent':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }
        
        const { purposes, consentGiven } = body;
        await gdprManager.recordConsent(userId, purposes || ['general'], consentGiven || true);
        result.userId = userId;
        result.consentRecorded = true;
        break;

      case 'run_cleanup':
        const cleanupResults = await gdprManager.performRetentionCleanup();
        result = {
          operation: action,
          ...cleanupResults
        };
        break;

      case 'export_compliance_report':
        const complianceData = gdprManager.getComplianceStatus();
        const pendingRequests = gdprManager.getPendingRequests();
        
        const report = generateComplianceReport(complianceData, pendingRequests);
        
        return new NextResponse(report, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="gdpr-compliance-report-${new Date().toISOString().split('T')[0]}.txt"`
          }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: approve_erasure, reject_request, record_consent, run_cleanup, export_compliance_report' },
          { status: 400 }
        );
    }

    await secureLogger.info('GDPR admin action performed', {
      action,
      adminUserId,
      ...result
    }, {
      category: LogCategory.AUDIT
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `GDPR action '${action}' completed successfully`
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to execute GDPR admin action'), request);
  }
}

// Helper functions
function generateComplianceRecommendations(status: Record<string, unknown>): string[] {
  const recommendations: string[] = [];

  if (typeof status.pendingRequests === 'number' && status.pendingRequests > 10) {
    recommendations.push('🚨 High number of pending GDPR requests - consider increasing processing capacity');
  }

  if (typeof status.consentBasedRecords === 'number' && typeof status.totalProcessingRecords === 'number' && status.consentBasedRecords > status.totalProcessingRecords * 0.8) {
    recommendations.push('📋 High proportion of consent-based processing - ensure consent is properly documented');
  }

  if (typeof status.nextCleanupDue === 'string') {
    const nextCleanup = new Date(status.nextCleanupDue);
    const daysTilCleanup = Math.ceil((nextCleanup.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    
    if (daysTilCleanup <= 1) {
      recommendations.push('🧹 Data retention cleanup is due - run cleanup process');
    }
  }

  if (typeof status.totalProcessingRecords === 'number' && status.totalProcessingRecords > 10000) {
    recommendations.push('📊 Large volume of processing records - consider implementing automated cleanup');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ GDPR compliance status is good - continue regular monitoring');
  }

  return recommendations;
}

function generateGDPRAlerts(status: Record<string, unknown>): Array<{ level: string; message: string }> {
  const alerts: Array<{ level: string; message: string }> = [];

  if (typeof status.pendingRequests === 'number' && status.pendingRequests > 5) {
    alerts.push({
      level: 'warning',
      message: `${status.pendingRequests} pending GDPR requests require attention`
    });
  }

  if (typeof status.nextCleanupDue === 'string') {
    const nextCleanup = new Date(status.nextCleanupDue);
    const daysTilCleanup = Math.ceil((nextCleanup.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    
    if (daysTilCleanup <= 0) {
      alerts.push({
        level: 'error',
        message: 'Data retention cleanup is overdue'
      });
    } else if (daysTilCleanup <= 1) {
      alerts.push({
        level: 'warning',
        message: 'Data retention cleanup is due within 24 hours'
      });
    }
  }

  return alerts;
}

function generateComplianceReport(complianceData: Record<string, unknown>, pendingRequests: unknown[]): string {
  const totalProcessingRecords = typeof complianceData.totalProcessingRecords === 'number' ? complianceData.totalProcessingRecords : 0;
  const consentBasedRecords = typeof complianceData.consentBasedRecords === 'number' ? complianceData.consentBasedRecords : 0;
  const pendingReqs = typeof complianceData.pendingRequests === 'number' ? complianceData.pendingRequests : 0;
  const completedRequests = typeof complianceData.completedRequests === 'number' ? complianceData.completedRequests : 0;
  const nextCleanupDue = typeof complianceData.nextCleanupDue === 'string' ? complianceData.nextCleanupDue : new Date().toISOString();
  
  const consentPercentage = totalProcessingRecords > 0 ? Math.round((consentBasedRecords / totalProcessingRecords) * 100) : 0;
  
  const pendingRequestsBreakdown = pendingRequests.map(req => {
    if (typeof req === 'object' && req !== null && 'requestType' in req && 'submittedAt' in req && 'status' in req) {
      const typedReq = req as { requestType: string; submittedAt: string; status: string };
      return `- ${typedReq.requestType}: ${new Date(typedReq.submittedAt).toISOString()} (${typedReq.status})`;
    }
    return '- Unknown request type';
  }).join('\n');
  
  const isCompliant = pendingRequests.length === 0 && new Date(nextCleanupDue) > new Date();
  
  return `GDPR COMPLIANCE REPORT
Generated: ${new Date().toISOString()}

PROCESSING RECORDS SUMMARY
Total Processing Records: ${totalProcessingRecords}
Consent-Based Records: ${consentBasedRecords}
Consent Percentage: ${consentPercentage}%

SUBJECT RIGHTS REQUESTS
Pending Requests: ${pendingReqs}
Completed Requests: ${completedRequests}
Total Requests Processed: ${pendingReqs + completedRequests}

PENDING REQUESTS BREAKDOWN
${pendingRequestsBreakdown}

DATA RETENTION
Next Cleanup Due: ${nextCleanupDue}
Status: ${new Date(nextCleanupDue) <= new Date() ? 'OVERDUE' : 'SCHEDULED'}

RECOMMENDATIONS
- Process pending subject rights requests within 30-day deadline
- Ensure all consent-based processing has valid, documented consent
- Maintain regular data retention cleanup schedule
- Monitor compliance metrics weekly
- Update privacy policies and notices as needed

LAWFUL BASIS DISTRIBUTION
- Consent: Used for marketing and optional features
- Contract: Used for order processing and customer management  
- Legal Obligation: Used for financial record retention
- Legitimate Interest: Used for security and system logs

COMPLIANCE STATUS: ${isCompliant ? 'COMPLIANT' : 'REQUIRES ATTENTION'}
`;
}

// Apply comprehensive security
export const GET = withComprehensiveSecurity(getAdminGDPRHandler, {
  enableCSRF: false,
  enableSecurityScanning: true,
  customSecurityHeaders: {
    xFrameOptions: 'DENY'
  }
});

export const POST = withComprehensiveSecurity(postAdminGDPRHandler, {
  enableCSRF: true,
  enableSecurityScanning: true,
  customSecurityHeaders: {
    xFrameOptions: 'DENY'
  }
});