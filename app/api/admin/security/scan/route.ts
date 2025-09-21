import { NextRequest, NextResponse } from 'next/server';
import { requirePermissions } from '@/lib/permissions/rbac';
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware';
import { vulnerabilityScanner, SecurityTester, type ScanResult } from '@/lib/security/vulnerability-scanner';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';
import { handleAPIError } from '@/lib/error-handling/error-middleware';
import { withComprehensiveSecurity } from '@/lib/security/headers-middleware';

// GET /api/admin/security/scan - Get previous scan results or perform quick scan
async function getSecurityScanHandler(request: NextRequest): Promise<NextResponse> {
  // Apply rate limiting with longer window for security scans
  const rateLimitResult = await withRateLimit(request, {
    ...rateLimitConfigs.read_operations,
    window: 60 * 1000, // 1 minute window
    requests: 5 // Only 5 scans per minute
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  try {
    // Validate admin permissions
    const authResult = await requirePermissions(request, ['admin.security.scan']);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Security scan access required' },
        { status: authResult.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const quickScan = searchParams.get('quick') === 'true';
    const format = searchParams.get('format') || 'json'; // json or report

    await secureLogger.info('Security scan requested', {
      userId: authResult.user?.id,
      quickScan,
      format
    }, {
      category: LogCategory.SECURITY
    });

    let scanResult;
    
    if (quickScan) {
      // Perform quick penetration test
      const penTestResults = await SecurityTester.performPenetrationTest();
      
      scanResult = {
        scanId: `quick_scan_${Date.now()}`,
        timestamp: Date.now(),
        duration: 100, // Quick scan
        type: 'quick_penetration_test',
        results: penTestResults,
        summary: {
          passed: Object.values(penTestResults).filter(Boolean).length,
          failed: Object.values(penTestResults).filter(v => !v).length,
          total: Object.keys(penTestResults).length
        }
      };
    } else {
      // Perform comprehensive vulnerability scan
      scanResult = await vulnerabilityScanner.performComprehensiveScan();
    }

    if (format === 'report' && !quickScan) {
      // Return text report format
      const report = SecurityTester.generateSecurityReport(scanResult as ScanResult);
      return new NextResponse(report, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="security-report-${new Date().toISOString().split('T')[0]}.txt"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: scanResult,
      timestamp: new Date().toISOString(),
      recommendations: quickScan ? [
        'Perform comprehensive scan for detailed vulnerability assessment',
        'Review security logs regularly',
        'Keep all dependencies updated'
      ] : [
        'Address critical vulnerabilities immediately',
        'Implement recommended security controls',
        'Schedule regular security scans',
        'Review and update security policies'
      ]
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to perform security scan'), request);
  }
}

// POST /api/admin/security/scan - Schedule or trigger comprehensive scan
async function postSecurityScanHandler(request: NextRequest): Promise<NextResponse> {
  // Apply strict rate limiting for comprehensive scans
  const rateLimitResult = await withRateLimit(request, {
    ...rateLimitConfigs.write_operations,
    window: 5 * 60 * 1000, // 5 minute window
    requests: 2 // Only 2 comprehensive scans per 5 minutes
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  try {
    // Validate admin permissions
    const authResult = await requirePermissions(request, ['admin.security.scan']);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Security scan access required' },
        { status: authResult.statusCode || 403 }
      );
    }

    const body = await request.json();
    const { scanType = 'comprehensive', includeCompliance = true } = body;

    await secureLogger.info('Comprehensive security scan initiated', {
      userId: authResult.user?.id,
      scanType,
      includeCompliance
    }, {
      category: LogCategory.SECURITY
    });

    // Perform comprehensive scan
    const scanResult = await vulnerabilityScanner.performComprehensiveScan();

    // Generate recommendations based on findings
    const recommendations = generateRecommendations(scanResult as ScanResult);

    return NextResponse.json({
      success: true,
      data: {
        ...scanResult,
        recommendations,
        nextScheduledScan: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        complianceReport: includeCompliance ? {
          owasp: (scanResult.complianceStatus as { owasp?: boolean })?.owasp || false,
          gdpr: (scanResult.complianceStatus as { gdpr?: boolean })?.gdpr || false,
          hipaa: (scanResult.complianceStatus as { hipaa?: boolean })?.hipaa || false,
          overallScore: calculateComplianceScore(scanResult.complianceStatus),
          recommendations: getComplianceRecommendations(scanResult.complianceStatus)
        } : undefined
      },
      message: 'Comprehensive security scan completed successfully'
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to perform comprehensive security scan'), request);
  }
}

// Helper functions
function generateRecommendations(scanResult: ScanResult): string[] {
  const recommendations: string[] = [];

  const { summary } = scanResult;
  if (summary.critical > 0) {
    recommendations.push(`🚨 URGENT: Address ${summary.critical} critical vulnerabilities immediately`);
  }

  if (summary.high > 0) {
    recommendations.push(`⚠️  HIGH PRIORITY: Fix ${summary.high} high-severity vulnerabilities within 48 hours`);
  }

  if (summary.medium > 0) {
    recommendations.push(`📋 MEDIUM PRIORITY: Plan fixes for ${summary.medium} medium-severity issues within 1 week`);
  }

  if (summary.low > 0) {
    recommendations.push(`📝 LOW PRIORITY: Schedule fixes for ${summary.low} low-severity issues within 1 month`);
  }

  // Compliance-based recommendations
  const { complianceStatus } = scanResult;
  if (!complianceStatus.owasp) {
    recommendations.push('🔒 COMPLIANCE: Review OWASP Top 10 compliance issues');
  }

  if (!complianceStatus.gdpr) {
    recommendations.push('🛡️  COMPLIANCE: Address GDPR data protection requirements');
  }

  if (!complianceStatus.hipaa) {
    recommendations.push('🏥 COMPLIANCE: Review HIPAA security requirements if handling health data');
  }

  // General recommendations
  if (summary.total === 0) {
    recommendations.push('✅ Excellent! No vulnerabilities found. Maintain current security practices.');
    recommendations.push('📅 Schedule regular security scans to maintain security posture');
    recommendations.push('📚 Continue security awareness training for development team');
  }

  return recommendations;
}

function calculateComplianceScore(complianceStatus: ScanResult['complianceStatus']): number {
  const scores = {
    owasp: complianceStatus.owasp ? 40 : 0,
    gdpr: complianceStatus.gdpr ? 30 : 0,
    hipaa: complianceStatus.hipaa ? 30 : 0
  };

  return scores.owasp + scores.gdpr + scores.hipaa;
}

function getComplianceRecommendations(complianceStatus: ScanResult['complianceStatus']): string[] {
  const recommendations: string[] = [];

  if (!complianceStatus.owasp) {
    recommendations.push('Implement OWASP security controls: secure coding practices, input validation, authentication controls');
  }

  if (!complianceStatus.gdpr) {
    recommendations.push('Implement GDPR requirements: data encryption, access controls, privacy by design, breach notification procedures');
  }

  if (!complianceStatus.hipaa) {
    recommendations.push('Implement HIPAA safeguards: access controls, audit logs, encryption, physical security measures');
  }

  if (complianceStatus.owasp && complianceStatus.gdpr && complianceStatus.hipaa) {
    recommendations.push('Maintain current compliance status through regular assessments and updates');
  }

  return recommendations;
}

// Apply comprehensive security to handlers
export const GET = withComprehensiveSecurity(getSecurityScanHandler, {
  enableCSRF: false, // Not needed for GET requests
  enableSecurityScanning: false, // Don't scan the scanner endpoint
  customSecurityHeaders: {
    xFrameOptions: 'DENY',
    contentSecurityPolicy: "default-src 'none'; script-src 'none'; style-src 'none';"
  }
});

export const POST = withComprehensiveSecurity(postSecurityScanHandler, {
  enableCSRF: true,
  enableSecurityScanning: false, // Don't scan the scanner endpoint
  customSecurityHeaders: {
    xFrameOptions: 'DENY',
    contentSecurityPolicy: "default-src 'none'; script-src 'none'; style-src 'none';"
  }
});