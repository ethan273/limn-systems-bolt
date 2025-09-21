import { NextRequest, NextResponse } from 'next/server';
import { requirePermissions } from '@/lib/permissions/rbac';
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware';
import { gdprManager, SubjectRights } from '@/lib/compliance/gdpr-compliance';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';
import { handleAPIError } from '@/lib/error-handling/error-middleware';
import { withComprehensiveSecurity } from '@/lib/security/headers-middleware';

// GET /api/gdpr - Get user's GDPR data or admin overview
async function getGDPRHandler(request: NextRequest): Promise<NextResponse> {
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.read_operations);
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  try {
    const authResult = await requirePermissions(request, []);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestType = searchParams.get('type');
    const userId = authResult.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    let responseData: Record<string, unknown>;

    switch (requestType) {
      case 'requests':
        // Get user's GDPR requests
        responseData = {
          requests: gdprManager.getUserRequests(userId)
        };
        break;

      case 'data_export':
        // Export user's data
        responseData = await gdprManager.exportUserData(userId);
        
        // Return as downloadable file
        return new NextResponse(JSON.stringify(responseData, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="my-data-${new Date().toISOString().split('T')[0]}.json"`
          }
        });

      default:
        // Get GDPR compliance status
        responseData = {
          userRequests: gdprManager.getUserRequests(userId),
          complianceInfo: {
            dataProcessingRights: [
              'Right to access your data',
              'Right to rectify incorrect data',
              'Right to erase your data',
              'Right to restrict processing',
              'Right to data portability',
              'Right to object to processing'
            ],
            contactEmail: 'privacy@limn-systems.com',
            dataProtectionOfficer: 'dpo@limn-systems.com'
          }
        };
    }

    await secureLogger.info('GDPR data accessed', {
      userId,
      requestType,
      timestamp: new Date().toISOString()
    }, {
      category: LogCategory.AUDIT
    });

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to fetch GDPR data'), request);
  }
}

// POST /api/gdpr - Submit GDPR subject rights request
async function postGDPRHandler(request: NextRequest): Promise<NextResponse> {
  const rateLimitResult = await withRateLimit(request, {
    ...rateLimitConfigs.write_operations,
    requests: 10 // Limit GDPR requests to prevent abuse
  });
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  try {
    const authResult = await requirePermissions(request, []);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { requestType, requestData } = body;

    // Validate request type
    if (!Object.values(SubjectRights).includes(requestType)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      );
    }

    // Check for duplicate recent requests
    const existingRequests = gdprManager.getUserRequests(userId);
    const recentRequest = existingRequests.find(r => 
      r.requestType === requestType && 
      r.status === 'pending' &&
      Date.now() - r.submittedAt < 24 * 60 * 60 * 1000 // 24 hours
    );

    if (recentRequest) {
      return NextResponse.json(
        { 
          error: 'Duplicate request found',
          existingRequestId: recentRequest.id,
          message: 'You have already submitted this type of request in the last 24 hours'
        },
        { status: 409 }
      );
    }

    // Submit GDPR request
    const requestId = await gdprManager.submitSubjectRightsRequest(
      userId,
      requestType,
      requestData
    );

    let message = 'GDPR request submitted successfully';
    let estimatedCompletion = 'within 30 days';

    // Provide specific guidance based on request type
    switch (requestType) {
      case SubjectRights.ACCESS:
        message = 'Data access request submitted. You will receive your data export within 30 days.';
        estimatedCompletion = 'within 30 days';
        break;
      case SubjectRights.ERASURE:
        message = 'Data erasure request submitted. Please note that some data may be retained for legal compliance.';
        estimatedCompletion = 'within 30 days (subject to legal review)';
        break;
      case SubjectRights.RECTIFICATION:
        message = 'Data correction request submitted. Please specify which data needs to be corrected.';
        estimatedCompletion = 'within 30 days';
        break;
      case SubjectRights.DATA_PORTABILITY:
        message = 'Data portability request submitted. You will receive your data in a machine-readable format.';
        estimatedCompletion = 'within 30 days';
        break;
      case SubjectRights.OBJECT:
        message = 'Objection to processing submitted. We will review the lawful basis for processing your data.';
        estimatedCompletion = 'within 30 days';
        break;
      case SubjectRights.RESTRICT_PROCESSING:
        message = 'Processing restriction request submitted. Processing will be limited while under review.';
        estimatedCompletion = 'within 30 days';
        break;
      case SubjectRights.WITHDRAW_CONSENT:
        message = 'Consent withdrawal processed. Processing based on consent will be stopped.';
        estimatedCompletion = 'immediate';
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        requestId,
        requestType,
        status: 'submitted',
        estimatedCompletion,
        nextSteps: [
          'Your request will be reviewed by our data protection team',
          'You may be contacted for identity verification',
          'You will receive updates on the progress of your request',
          'The request will be completed within the legal timeframe'
        ]
      },
      message
    });

  } catch (error) {
    return handleAPIError(error instanceof Error ? error : new Error('Failed to submit GDPR request'), request);
  }
}

// Apply comprehensive security
export const GET = withComprehensiveSecurity(getGDPRHandler, {
  enableCSRF: false,
  enableSecurityScanning: true
});

export const POST = withComprehensiveSecurity(postGDPRHandler, {
  enableCSRF: true,
  enableSecurityScanning: true
});