import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requirePermissions } from '@/lib/permissions/rbac';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AnalyticsPayload {
  session: {
    sessionId: string;
    userId?: string;
    startTime: number;
    lastActivity: number;
    pageViews: number;
    device: {
      type: 'desktop' | 'tablet' | 'mobile';
      os: string;
      browser: string;
    };
  };
  events: Array<{
    name: string;
    properties?: Record<string, unknown>;
    timestamp: number;
    userId?: string;
    sessionId: string;
  }>;
  metadata: {
    url: string;
    userAgent: string;
    timestamp: number;
    connection?: string;
    memory?: number;
    cores?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Note: Analytics collection might not need strict permissions for data collection
    // But we'll still validate the user for security
    const authResult = await requirePermissions(request, ['analytics.view_all'], { requireAll: false });
    if (!authResult.valid) {
      // For analytics collection, we might allow anonymous data but log the attempt
      console.warn('Analytics collection attempted without proper permissions');
    }

    const supabase = await createServerSupabaseClient();
    const user = authResult.user || null;
    
    const payload: AnalyticsPayload = await request.json();

    // Validate payload
    if (!payload.session?.sessionId || !payload.events || !Array.isArray(payload.events)) {
      return NextResponse.json(
        { error: 'Invalid analytics payload' },
        { status: 400 }
      );
    }

    // Get client information
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Store session data
    const { error: sessionError } = await supabase
      .from('analytics_sessions')
      .upsert({
        session_id: payload.session.sessionId,
        user_id: user?.id || payload.session.userId,
        start_time: new Date(payload.session.startTime).toISOString(),
        last_activity: new Date(payload.session.lastActivity).toISOString(),
        page_views: payload.session.pageViews,
        device_type: payload.session.device.type,
        device_os: payload.session.device.os,
        device_browser: payload.session.device.browser,
        client_ip: clientIP,
        user_agent: payload.metadata.userAgent,
        connection_type: payload.metadata.connection,
        device_memory: payload.metadata.memory,
        device_cores: payload.metadata.cores,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id'
      });

    if (sessionError) {
      console.error('Failed to store session data:', sessionError);
    }

    // Store events
    const eventRows = payload.events.map(event => ({
      session_id: event.sessionId,
      user_id: user?.id || event.userId,
      event_name: event.name,
      event_properties: event.properties || {},
      timestamp: new Date(event.timestamp).toISOString(),
      url: payload.metadata.url,
      client_ip: clientIP,
    }));

    const { error: eventsError } = await supabase
      .from('analytics_events')
      .insert(eventRows);

    if (eventsError) {
      console.error('Failed to store analytics events:', eventsError);
    }

    // Process special events for business intelligence
    await processSpecialEvents(payload.events, supabase);

    // In production, also send to external analytics services
    if (process.env.NODE_ENV === 'production') {
      await sendToExternalServices(payload);
    }

    // Log summary for debugging
    console.log(`📊 Analytics: ${payload.events.length} events from session ${payload.session.sessionId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in analytics endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processSpecialEvents(events: AnalyticsPayload['events'], supabase: SupabaseClient) {
  for (const event of events) {
    try {
      switch (event.name) {
        case 'portal_login':
          // Track login metrics
          await supabase
            .from('user_activity_summary')
            .upsert({
              user_id: event.userId,
              last_login: new Date(event.timestamp).toISOString(),
              login_count: 1,
            }, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            });
          break;

        case 'order_viewed':
          // Track order engagement
          if (event.properties?.orderId) {
            await supabase
              .from('order_analytics')
              .insert({
                order_id: event.properties.orderId,
                user_id: event.userId,
                action: 'viewed',
                timestamp: new Date(event.timestamp).toISOString(),
                session_id: event.sessionId,
              });
          }
          break;

        case 'document_downloaded':
          // Track document usage
          if (event.properties?.documentId) {
            await supabase
              .from('document_analytics')
              .insert({
                document_id: event.properties.documentId,
                user_id: event.userId,
                action: 'downloaded',
                timestamp: new Date(event.timestamp).toISOString(),
                session_id: event.sessionId,
              });
          }
          break;

        case 'feature_used':
          // Track feature adoption
          await supabase
            .from('feature_usage')
            .insert({
              feature_name: event.properties?.feature,
              user_id: event.userId,
              action: event.properties?.action,
              metadata: event.properties || {},
              timestamp: new Date(event.timestamp).toISOString(),
              session_id: event.sessionId,
            });
          break;

        case 'performance':
          // Store performance metrics
          await supabase
            .from('performance_metrics')
            .insert({
              session_id: event.sessionId,
              user_id: event.userId,
              metric_type: 'web_vitals',
              lcp: event.properties?.lcp,
              fid: event.properties?.fid,
              cls: event.properties?.cls,
              fcp: event.properties?.fcp,
              ttfb: event.properties?.ttfb,
              page_load_time: event.properties?.pageLoadTime,
              timestamp: new Date(event.timestamp).toISOString(),
            });
          break;

        case 'error_occurred':
          // Track errors for monitoring
          await supabase
            .from('error_tracking')
            .insert({
              session_id: event.sessionId,
              user_id: event.userId,
              error_message: event.properties?.message,
              error_stack: event.properties?.stack,
              error_context: event.properties?.context,
              url: event.properties?.url,
              timestamp: new Date(event.timestamp).toISOString(),
            });
          break;
      }
    } catch (processingError) {
      console.error(`Failed to process special event ${event.name}:`, processingError);
      // Don't fail the whole request for processing errors
    }
  }
}

async function sendToExternalServices(payload: AnalyticsPayload) {
  try {
    // Google Analytics 4
    if (process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET) {
      const gaEvents = payload.events.map(event => ({
        name: event.name.replace(/[^a-zA-Z0-9_]/g, '_'), // GA4 event name requirements
        params: {
          ...event.properties,
          session_id: event.sessionId,
          user_id: event.userId,
          timestamp_micros: event.timestamp * 1000,
        },
      }));

      await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: payload.session.sessionId,
          user_id: payload.session.userId,
          events: gaEvents.slice(0, 25), // GA4 limit
        }),
      });
    }

    // Mixpanel
    if (process.env.MIXPANEL_TOKEN) {
      const mixpanelEvents = payload.events.map(event => ({
        event: event.name,
        properties: {
          ...event.properties,
          distinct_id: event.userId || payload.session.sessionId,
          $insert_id: `${event.sessionId}_${event.timestamp}`,
          time: event.timestamp,
        },
      }));

      const mixpanelPayload = Buffer.from(JSON.stringify(mixpanelEvents)).toString('base64');
      await fetch(`https://api.mixpanel.com/track?data=${mixpanelPayload}&api_key=${process.env.MIXPANEL_TOKEN}`, {
        method: 'GET',
      });
    }

    // PostHog
    if (process.env.POSTHOG_API_KEY) {
      const posthogEvents = payload.events.map(event => ({
        event: event.name,
        properties: event.properties,
        timestamp: new Date(event.timestamp).toISOString(),
        distinct_id: event.userId || payload.session.sessionId,
      }));

      await fetch('https://app.posthog.com/capture/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.POSTHOG_API_KEY}`,
        },
        body: JSON.stringify({
          api_key: process.env.POSTHOG_API_KEY,
          batch: posthogEvents,
        }),
      });
    }
  } catch (externalError) {
    console.error('Failed to send to external analytics services:', externalError);
    // Don't fail the request for external service errors
  }
}

// GET endpoint for analytics dashboard data
export async function GET(request: NextRequest) {
  try {
    // Validate user permissions for viewing analytics
    const authResult = await requirePermissions(request, ['analytics.view_all']);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Cannot access analytics data' },
        { status: authResult.statusCode || 403 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '7d';
    const metric = searchParams.get('metric') || 'overview';

    const startDate = new Date();
    switch (timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    let data = {};

    if (metric === 'overview') {
      // Get overview metrics
      const { data: eventCounts } = await supabase
        .from('analytics_events')
        .select('event_name')
        .gte('timestamp', startDate.toISOString());

      const { data: sessionCounts } = await supabase
        .from('analytics_sessions')
        .select('device_type')
        .gte('start_time', startDate.toISOString());

      const { data: performanceMetrics } = await supabase
        .from('performance_metrics')
        .select('lcp, fid, cls, fcp, ttfb, page_load_time')
        .gte('timestamp', startDate.toISOString());

      data = {
        eventCounts,
        sessionCounts,
        performanceMetrics,
      };
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in analytics GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}