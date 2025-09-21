import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config/environment'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/maintenance - Check maintenance mode status
export async function GET() {
  try {
    const features = config.features()
    
    // Check if maintenance mode is enabled via environment variable
    const isMaintenanceMode = features.maintenanceMode
    
    if (!isMaintenanceMode) {
      return NextResponse.json({
        maintenanceMode: false,
        timestamp: new Date().toISOString()
      })
    }

    // Get maintenance mode details from environment or database
    const maintenanceInfo = await getMaintenanceInfo()
    
    return NextResponse.json({
      maintenanceMode: true,
      maintenanceInfo,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error checking maintenance mode:', error)
    
    // If we can't determine maintenance mode status, assume not in maintenance
    return NextResponse.json({
      maintenanceMode: false,
      error: 'Failed to check maintenance status',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST /api/maintenance - Enable/disable maintenance mode (admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { enabled, type, title, message, estimatedDuration, startTime, endTime, priority, issue } = body

    // Validate request
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled field is required and must be boolean' }, { status: 400 })
    }

    // Store maintenance mode configuration in database
    const maintenanceConfig = {
      enabled,
      type: type || 'general',
      title: title || 'System Maintenance',
      message: message || 'We are currently performing maintenance. Please check back shortly.',
      estimated_duration: estimatedDuration,
      start_time: startTime ? new Date(startTime).toISOString() : null,
      end_time: endTime ? new Date(endTime).toISOString() : null,
      priority: priority || 'medium',
      issue,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Try to store in database
    try {
      const { error: dbError } = await supabase
        .from('maintenance_mode')
        .upsert([maintenanceConfig], { onConflict: 'id' })

      if (dbError && dbError.code !== 'PGRST205') {
        console.error('Failed to store maintenance config in database:', dbError)
        // Continue anyway - we can still use environment variables
      }
    } catch (dbError) {
      console.error('Database error when storing maintenance config:', dbError)
    }

    // Log maintenance mode change
    console.log(`Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'} by ${user.email}`, {
      type,
      title,
      estimatedDuration,
      timestamp: new Date().toISOString()
    })

    // In a real implementation, you might want to:
    // 1. Send notifications to users
    // 2. Update load balancer configuration
    // 3. Scale down non-essential services
    // 4. Send alerts to monitoring systems

    if (enabled) {
      await notifyMaintenanceModeEnabled(maintenanceConfig)
    } else {
      await notifyMaintenanceModeDisabled(user.email!)
    }

    return NextResponse.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      maintenanceMode: enabled,
      maintenanceInfo: enabled ? maintenanceConfig : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error managing maintenance mode:', error)
    
    return NextResponse.json({
      error: 'Failed to manage maintenance mode',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to get maintenance info
async function getMaintenanceInfo() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Try to get maintenance info from database first
    const { data: maintenanceConfig, error } = await supabase
      .from('maintenance_mode')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && maintenanceConfig) {
      return {
        type: maintenanceConfig.type,
        title: maintenanceConfig.title,
        message: maintenanceConfig.message,
        estimatedDuration: maintenanceConfig.estimated_duration,
        startTime: maintenanceConfig.start_time,
        endTime: maintenanceConfig.end_time,
        priority: maintenanceConfig.priority,
        issue: maintenanceConfig.issue,
        createdAt: maintenanceConfig.created_at
      }
    }
  } catch (error) {
    console.warn('Failed to get maintenance info from database:', error)
  }

  // Fallback to environment-based configuration
  return {
    type: process.env.MAINTENANCE_TYPE || 'general',
    title: process.env.MAINTENANCE_TITLE || 'System Maintenance',
    message: process.env.MAINTENANCE_MESSAGE || 'We are currently performing maintenance. Please check back shortly.',
    estimatedDuration: process.env.MAINTENANCE_DURATION,
    contactInfo: 'support@limnsystems.com'
  }
}

// Helper function to notify about maintenance mode being enabled
async function notifyMaintenanceModeEnabled(config: Record<string, unknown>) {
  try {
    console.log('MAINTENANCE MODE ENABLED:', {
      type: config.type,
      title: config.title,
      estimatedDuration: config.estimated_duration,
      startTime: config.start_time,
      endTime: config.end_time
    })

    // In a real implementation:
    // 1. Send email notifications to users
    // 2. Send Slack notifications to team
    // 3. Update status page
    // 4. Send push notifications via mobile app
    // 5. Update external monitoring systems

    // Example: Send team notification
    // await sendSlackNotification({
    //   channel: '#alerts',
    //   message: `🚨 Maintenance mode enabled: ${config.title}`,
    //   details: config
    // })

    // Example: Update status page
    // await updateStatusPage({
    //   status: 'maintenance',
    //   message: config.message,
    //   estimatedDuration: config.estimated_duration
    // })

  } catch (error) {
    console.error('Failed to send maintenance mode notifications:', error)
  }
}

// Helper function to notify about maintenance mode being disabled
async function notifyMaintenanceModeDisabled(userEmail: string) {
  try {
    console.log('MAINTENANCE MODE DISABLED by', userEmail, {
      timestamp: new Date().toISOString()
    })

    // In a real implementation:
    // 1. Send notifications that service is restored
    // 2. Update status page to operational
    // 3. Send team notifications
    // 4. Update monitoring systems

  } catch (error) {
    console.error('Failed to send maintenance mode disabled notifications:', error)
  }
}