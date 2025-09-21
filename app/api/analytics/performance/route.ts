import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { config } from '@/lib/config/environment'
import { withSecureValidation } from '@/lib/validation/middleware'

// TypeScript interfaces
type PerformanceMetricUnit = 'ms' | 'bytes' | 'count' | 'percentage'

interface PerformanceMetricData {
  name: string
  value: number
  unit: PerformanceMetricUnit
  timestamp: number
  metadata?: Record<string, unknown>
  sessionId?: string
  userId?: string
  pathname?: string
}

interface PerformanceEntry extends Omit<PerformanceMetricData, 'metadata'> {
  user_id: string | undefined
  client_ip: string
  user_agent: string
  referer: string
  environment: string
  created_at: string
  device_info: DeviceInfo
  metadata: string | null
}

interface DeviceInfo {
  browser: string
  os: string
  deviceType: string
}

interface PerformanceStatistics {
  count: number
  avg: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
}

// Performance metric schema
const performanceMetricSchema = z.object({
  name: z.string().min(1, 'Metric name is required').max(100, 'Metric name too long'),
  value: z.number().min(0, 'Metric value must be positive'),
  unit: z.enum(['ms', 'bytes', 'count', 'percentage']),
  timestamp: z.number().int().positive('Invalid timestamp'),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().optional(),
  userId: z.string().uuid().optional(),
  pathname: z.string().max(500, 'Pathname too long').optional()
})

export const POST = withSecureValidation(performanceMetricSchema)(
  async (request: NextRequest, validatedData: PerformanceMetricData) => {
    try {
      // Skip performance tracking in test environment or if analytics disabled
      if (config.env().NODE_ENV === 'test' || !config.features().analytics) {
        return NextResponse.json({ success: true, message: 'Analytics disabled' })
      }

      const supabase = await createServerSupabaseClient()
      
      // Get user information if available (optional for performance metrics)
      let userId: string | undefined
      try {
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id
      } catch {
        // User not authenticated - that's okay for performance metrics
      }

      // Get additional request information
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown'

      const userAgent = request.headers.get('user-agent') || 'unknown'
      const referer = request.headers.get('referer') || 'unknown'

      // Prepare performance metric entry
      const performanceEntry = {
        ...validatedData,
        user_id: userId || validatedData.userId,
        client_ip: clientIP,
        user_agent: userAgent,
        referer,
        environment: config.env().NODE_ENV,
        created_at: new Date(validatedData.timestamp).toISOString(),
        
        // Add device/browser information
        device_info: extractDeviceInfo(userAgent),
        
        // Sanitize metadata
        metadata: validatedData.metadata ? 
          JSON.stringify(sanitizeMetadata(validatedData.metadata)) : 
          null
      }

      // Store performance metric in database
      try {
        const { error: dbError } = await supabase
          .from('performance_metrics')
          .insert(performanceEntry)

        if (dbError && dbError.code !== 'PGRST205') { // PGRST205 = relation does not exist
          console.error('Failed to store performance metric in database:', dbError)
          // Don't fail the request if database storage fails
        }
      } catch (dbError) {
        console.error('Database error when storing performance metric:', dbError)
      }

      // Log significant performance issues
      if (shouldLogPerformanceIssue(validatedData)) {
        console.warn('Performance Issue Detected:', {
          name: validatedData.name,
          value: validatedData.value,
          unit: validatedData.unit,
          pathname: validatedData.pathname,
          timestamp: new Date(validatedData.timestamp).toISOString()
        })
      }

      // Send alerts for critical performance issues
      if (isCriticalPerformanceIssue(validatedData)) {
        try {
          await sendPerformanceAlert(performanceEntry)
        } catch (alertError) {
          console.error('Failed to send performance alert:', alertError)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Performance metric recorded'
      })

    } catch (error) {
      console.error('Error handling performance metric:', error)
      
      // Always acknowledge the metric, even if processing fails
      return NextResponse.json({
        success: false,
        message: 'Performance metric processing failed',
        error: 'Internal server error'
      }, { status: 500 })
    }
  }
)

// GET endpoint for performance analytics (admin only)
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
    const metricName = searchParams.get('metric')
    const pathname = searchParams.get('pathname')

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
      .from('performance_metrics')
      .select('*')
      .gte('created_at', startTime)
      .order('created_at', { ascending: false })

    if (metricName) {
      query = query.eq('name', metricName)
    }

    if (pathname) {
      query = query.eq('pathname', pathname)
    }

    const { data: metrics, error: queryError } = await query.limit(1000)

    if (queryError) {
      console.error('Error querying performance metrics:', queryError)
      return NextResponse.json({ error: 'Failed to fetch performance metrics' }, { status: 500 })
    }

    // Calculate performance statistics
    const statistics = calculatePerformanceStatistics(metrics || [])

    return NextResponse.json({
      success: true,
      data: {
        metrics: metrics || [],
        statistics,
        timeframe
      }
    })

  } catch (error) {
    console.error('Error fetching performance analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function extractDeviceInfo(userAgent: string): DeviceInfo {
  const info: Partial<DeviceInfo> = {}
  
  // Browser detection
  if (userAgent.includes('Chrome')) info.browser = 'Chrome'
  else if (userAgent.includes('Firefox')) info.browser = 'Firefox'
  else if (userAgent.includes('Safari')) info.browser = 'Safari'
  else if (userAgent.includes('Edge')) info.browser = 'Edge'
  else info.browser = 'Unknown'
  
  // OS detection
  if (userAgent.includes('Windows')) info.os = 'Windows'
  else if (userAgent.includes('Mac')) info.os = 'macOS'
  else if (userAgent.includes('Linux')) info.os = 'Linux'
  else if (userAgent.includes('Android')) info.os = 'Android'
  else if (userAgent.includes('iOS')) info.os = 'iOS'
  else info.os = 'Unknown'
  
  // Device type detection
  if (userAgent.includes('Mobile')) info.deviceType = 'Mobile'
  else if (userAgent.includes('Tablet')) info.deviceType = 'Tablet'
  else info.deviceType = 'Desktop'
  
  return {
    browser: info.browser || 'Unknown',
    os: info.os || 'Unknown',
    deviceType: info.deviceType || 'Desktop'
  }
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  
  Object.entries(metadata).forEach(([key, value]) => {
    // Remove potentially sensitive data
    if (key.toLowerCase().includes('password') || 
        key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('secret')) {
      return
    }
    
    // Limit string lengths
    if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = value.substring(0, 1000) + '...'
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  })
  
  return sanitized
}

function shouldLogPerformanceIssue(metric: PerformanceMetricData): boolean {
  const thresholds = {
    'first_contentful_paint': 2500, // 2.5s
    'largest_contentful_paint': 4000, // 4s
    'first_input_delay': 300, // 300ms
    'cumulative_layout_shift': 0.25, // 0.25 score
    'page_load_time': 5000, // 5s
    'long_task': 100, // 100ms
    'api_call': 2000, // 2s
    'memory_used': 50 * 1024 * 1024 // 50MB
  }
  
  const threshold = thresholds[metric.name as keyof typeof thresholds]
  return !!threshold && metric.value > threshold
}

function isCriticalPerformanceIssue(metric: PerformanceMetricData): boolean {
  const criticalThresholds = {
    'first_contentful_paint': 5000, // 5s
    'largest_contentful_paint': 8000, // 8s
    'first_input_delay': 1000, // 1s
    'cumulative_layout_shift': 0.5, // 0.5 score
    'page_load_time': 10000, // 10s
    'long_task': 500, // 500ms
    'memory_used': 100 * 1024 * 1024 // 100MB
  }
  
  const threshold = criticalThresholds[metric.name as keyof typeof criticalThresholds]
  return !!threshold && metric.value > threshold
}

async function sendPerformanceAlert(performanceEntry: PerformanceEntry) {
  try {
    console.log('CRITICAL PERFORMANCE ALERT:', {
      name: performanceEntry.name,
      value: performanceEntry.value,
      unit: performanceEntry.unit,
      pathname: performanceEntry.pathname,
      timestamp: performanceEntry.created_at
    })
    
    // In a real implementation, send alerts via email, Slack, etc.
    // This would integrate with alerting services
  } catch (error) {
    console.error('Failed to send performance alert:', error)
  }
}

function calculatePerformanceStatistics(metrics: Array<{name: string, value: number}>): Record<string, PerformanceStatistics> {
  const stats: Record<string, PerformanceStatistics> = {}
  
  // Group metrics by name
  const groupedMetrics = metrics.reduce((groups, metric) => {
    if (!groups[metric.name]) {
      groups[metric.name] = []
    }
    groups[metric.name].push(metric.value)
    return groups
  }, {} as Record<string, number[]>)

  // Calculate statistics for each metric
  Object.entries(groupedMetrics).forEach(([name, values]) => {
    const sorted = (values as number[]).sort((a, b) => a - b)
    const sum = (values as number[]).reduce((acc, val) => acc + val, 0)
    
    stats[name] = {
      count: (values as number[]).length,
      avg: sum / (values as number[]).length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  })

  return stats
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}