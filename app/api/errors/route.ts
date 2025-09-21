/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { config } from '@/lib/config/environment'
import { withSecureValidation } from '@/lib/validation/middleware'

// TypeScript type for error report data
type ErrorReportData = z.infer<typeof errorReportSchema>

// Error report schema
const errorReportSchema = z.object({
  message: z.string().min(1, 'Error message is required').max(1000, 'Error message too long'),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  errorId: z.string().optional(),
  timestamp: z.string().datetime('Invalid timestamp format'),
  url: z.string().max(2000, 'URL too long').optional(),
  userAgent: z.string().max(1000, 'User agent too long').optional(),
  level: z.enum(['page', 'component', 'critical']).default('component'),
  context: z.record(z.string(), z.any()).optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  buildId: z.string().optional(),
  environment: z.string().optional()
})

export const POST = withSecureValidation(errorReportSchema)(
  async (request: NextRequest, validatedData: ErrorReportData) => {
    try {
      const supabase = await createServerSupabaseClient()
      
      // Get user information if available (don't require authentication for error reporting)
      let userId: string | undefined
      try {
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id
      } catch {
        // User not authenticated - that's okay for error reporting
      }

      // Get additional request information
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown'

      const userAgent = request.headers.get('user-agent') || validatedData.userAgent || 'unknown'

      // Prepare error log entry
      const errorLogEntry = {
        ...validatedData,
        user_id: userId || validatedData.userId,
        client_ip: clientIP,
        user_agent: userAgent,
        environment: config.env().NODE_ENV,
        build_id: process.env.BUILD_ID || 'unknown',
        created_at: new Date().toISOString(),
        
        // Sanitize potentially sensitive data
        stack: config.isProduction() ? undefined : validatedData.stack,
        component_stack: config.isProduction() ? undefined : validatedData.componentStack,
        
        // Truncate long fields
        message: validatedData.message?.substring(0, 1000),
        url: validatedData.url?.substring(0, 2000),
      }

      // Store error in database
      try {
        const { error: dbError } = await supabase
          .from('error_logs')
          .insert(errorLogEntry)

        if (dbError && dbError.code !== 'PGRST205') { // PGRST205 = relation does not exist
          console.error('Failed to store error in database:', dbError)
          // Don't fail the request if database storage fails
        }
      } catch (dbError) {
        console.error('Database error when storing error log:', dbError)
      }

      // Log to console for immediate visibility
      const logLevel = validatedData.level === 'critical' ? 'error' : 'warn'
      console[logLevel]('Client Error Report:', {
        message: validatedData.message,
        errorId: validatedData.errorId,
        level: validatedData.level,
        url: validatedData.url,
        userId,
        timestamp: validatedData.timestamp
      })

      // Send to external error tracking service if configured
      if (config.logging().sentryEnabled && config.isProduction()) {
        try {
          // This would integrate with Sentry or similar service
          // await sendToSentry(errorLogEntry)
          console.log('Error would be sent to external monitoring service')
        } catch (sentryError) {
          console.error('Failed to send error to monitoring service:', sentryError)
        }
      }

      // Send alerts for critical errors
      if (validatedData.level === 'critical') {
        try {
          await sendCriticalErrorAlert(errorLogEntry)
        } catch (alertError) {
          console.error('Failed to send critical error alert:', alertError)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Error report received',
        errorId: validatedData.errorId || 'unknown'
      }, { status: 201 })

    } catch (error) {
      console.error('Error handling error report:', error)
      
      // Always try to acknowledge the error report, even if processing fails
      return NextResponse.json({
        success: false,
        message: 'Error report processing failed',
        error: 'Internal server error'
      }, { status: 500 })
    }
  }
)

// GET endpoint for error statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (!user.email?.endsWith('@limn.us.com')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h'
    const level = searchParams.get('level')

    // Calculate time range
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }

    const timeRange = timeRanges[timeframe as keyof typeof timeRanges] || timeRanges['24h']
    const startTime = new Date(Date.now() - timeRange).toISOString()

    // Build query
    let query = supabase
      .from('error_logs')
      .select('*')
      .gte('created_at', startTime)
      .order('created_at', { ascending: false })

    if (level && ['page', 'component', 'critical'].includes(level)) {
      query = query.eq('level', level)
    }

    const { data: errors, error: queryError } = await query.limit(100)

    if (queryError) {
      console.error('Error querying error logs:', queryError)
      return NextResponse.json({ error: 'Failed to fetch error logs' }, { status: 500 })
    }

    // Get error statistics
    const { data: stats } = await supabase
      .from('error_logs')
      .select('level, created_at')
      .gte('created_at', startTime)

    const statistics = stats ? {
      total: stats.length,
      critical: stats.filter((e: any) => e.level === 'critical').length,
      page: stats.filter((e: any) => e.level === 'page').length,
      component: stats.filter((e: any) => e.level === 'component').length,
      timeframe
    } : null

    return NextResponse.json({
      success: true,
      data: {
        errors: errors || [],
        statistics
      }
    })

  } catch (error) {
    console.error('Error fetching error statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to send critical error alerts
async function sendCriticalErrorAlert(errorEntry: Record<string, unknown>) {
  try {
    // In a real implementation, this would send alerts via:
    // - Email to developers
    // - Slack notifications
    // - SMS for severe issues
    // - PagerDuty or similar incident management

    console.log('CRITICAL ERROR ALERT:', {
      message: errorEntry.message,
      errorId: errorEntry.errorId,
      timestamp: errorEntry.timestamp,
      url: errorEntry.url,
      userId: errorEntry.user_id
    })

    // Example: Send email alert
    if (config.email().smtp.enabled) {
      // await sendEmailAlert(errorEntry)
    }

    // Example: Send Slack notification
    if (process.env.SLACK_WEBHOOK_URL) {
      // await sendSlackAlert(errorEntry)
    }

  } catch (error) {
    console.error('Failed to send critical error alert:', error)
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}