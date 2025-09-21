import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const errorReport: ErrorReport = await request.json();

    // Validate error report
    if (!errorReport.message || !errorReport.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get client IP for logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Store error in database
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert({
        user_id: user.id,
        error_message: errorReport.message,
        error_stack: errorReport.stack,
        component_stack: errorReport.componentStack,
        user_agent: errorReport.userAgent,
        url: errorReport.url,
        client_ip: clientIP,
        timestamp: errorReport.timestamp,
        environment: process.env.NODE_ENV,
      });

    if (dbError) {
      console.error('Failed to store error report:', dbError);
      // Don't fail the request if we can't store the error
    }

    // In production, also send to external error monitoring service
    if (process.env.NODE_ENV === 'production') {
      try {
        await reportToExternalService(errorReport, user.id, clientIP);
      } catch (externalError) {
        console.error('Failed to report to external service:', externalError);
      }
    }

    // Log to console for debugging
    console.error('Portal Error Report:', {
      userId: user.id,
      message: errorReport.message,
      url: errorReport.url,
      timestamp: errorReport.timestamp,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in error reporting endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function reportToExternalService(
  errorReport: ErrorReport,
  userId: string,
  clientIP: string
) {
  // Example integration with Sentry, LogRocket, or similar service
  // Replace with your actual error reporting service
  
  if (process.env.SENTRY_DSN) {
    // Example Sentry integration
    const sentryPayload = {
      message: errorReport.message,
      level: 'error',
      tags: {
        userId,
        environment: process.env.NODE_ENV,
      },
      extra: {
        stack: errorReport.stack,
        componentStack: errorReport.componentStack,
        userAgent: errorReport.userAgent,
        url: errorReport.url,
        clientIP,
      },
      timestamp: errorReport.timestamp,
    };

    await fetch(`${process.env.SENTRY_DSN}/api/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${process.env.SENTRY_KEY}`,
      },
      body: JSON.stringify(sentryPayload),
    });
  }

  // Could also integrate with:
  // - Datadog
  // - New Relic
  // - Bugsnag
  // - LogRocket
  // - Rollbar
}