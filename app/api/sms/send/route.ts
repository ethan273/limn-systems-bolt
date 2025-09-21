import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { smsService, SMSTemplate, SMS_TEMPLATES } from '@/lib/services/sms'

export async function POST(request: NextRequest) {
  try {
    const { 
      to, 
      message, 
      template, 
      template_vars, 
      priority = 'normal', 
      type = 'notification' 
    } = await request.json()

    // Validate authentication - require admin or system access
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const authResult = await validateAuthToken(token)
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!to || (!message && !template)) {
      return NextResponse.json(
        { error: 'Phone number and message (or template) are required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    if (!isValidPhoneNumber(to)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' },
        { status: 400 }
      )
    }

    // Check if user has SMS notifications enabled (for non-urgent messages)
    if (priority !== 'urgent') {
      const smsEnabled = await checkSMSPreferences(to)
      if (!smsEnabled) {
        return NextResponse.json(
          { error: 'SMS notifications are disabled for this user' },
          { status: 403 }
        )
      }
    }

    let smsResponse

    // Send via template or direct message
    if (template && template_vars) {
      // Validate template exists
      if (!(template in SMS_TEMPLATES)) {
        return NextResponse.json(
          { error: `Unknown SMS template: ${template}` },
          { status: 400 }
        )
      }

      smsResponse = await smsService.sendTemplateMessage(
        to,
        template as SMSTemplate,
        template_vars,
        { priority, type }
      )
    } else {
      smsResponse = await smsService.sendSMS({
        to,
        message,
        priority,
        type
      })
    }

    // Log API request
    await logSMSRequest({
      phone_number: to,
      message: message || `Template: ${template}`,
      template,
      priority,
      type,
      success: smsResponse.success,
      message_id: smsResponse.message_id,
      provider: smsResponse.provider_used,
      error: smsResponse.error,
      requested_by: authResult.user_id || 'unknown',
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown'
    })

    if (!smsResponse.success) {
      return NextResponse.json(
        { 
          error: 'Failed to send SMS',
          details: smsResponse.error 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message_id: smsResponse.message_id,
      provider: smsResponse.provider_used,
      status: smsResponse.status,
      sent_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for SMS status and templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const message_id = searchParams.get('message_id')

    // Validate authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const authResult = await validateAuthToken(token)
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Handle different actions
    switch (action) {
      case 'templates':
        return NextResponse.json({
          templates: Object.keys(SMS_TEMPLATES).map(key => ({
            id: key,
            content: SMS_TEMPLATES[key as SMSTemplate],
            variables: extractVariables(SMS_TEMPLATES[key as SMSTemplate])
          }))
        })

      case 'status':
        if (!message_id) {
          return NextResponse.json(
            { error: 'Message ID is required for status check' },
            { status: 400 }
          )
        }
        
        const status = await smsService.getDeliveryStatus(message_id)
        return NextResponse.json(status)

      case 'usage':
        const phone = searchParams.get('phone')
        const usage = await smsService.getUsageStats(phone || undefined)
        return NextResponse.json(usage)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Available: templates, status, usage' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('SMS API GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Bulk SMS endpoint
export async function PUT(request: NextRequest) {
  try {
    const { messages } = await request.json()

    // Validate authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const authResult = await validateAuthToken(token)
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    if (messages.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 messages per bulk request' },
        { status: 400 }
      )
    }

    // Process messages in parallel (with concurrency limit)
    const results = await processBulkSMS(messages, authResult.user_id || 'unknown', request)

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }

    return NextResponse.json(summary)

  } catch (error) {
    console.error('Bulk SMS API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function validateAuthToken(token: string): Promise<{
  valid: boolean
  user_id?: string
  role?: string
}> {
  try {
    const supabase = createAdminClient()
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { valid: false }
    }

    // Check if user has SMS permissions
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single()

    const hasSSMSPermission = permissions?.permissions?.includes('send_sms') || 
                             permissions?.role === 'admin' ||
                             user.email?.endsWith('@limn.us.com') // Limn employees

    if (!hasSSMSPermission) {
      return { valid: false }
    }

    return {
      valid: true,
      user_id: user.id,
      role: permissions?.role || 'user'
    }

  } catch (error) {
    console.error('Token validation error:', error)
    return { valid: false }
  }
}

async function checkSMSPreferences(phoneNumber: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    
    // Look up user by phone number and check SMS preferences
    const { data } = await supabase
      .from('customer_settings')
      .select('settings')
      .eq('phone_number', phoneNumber)
      .single()

    // Default to enabled if no preferences found
    return data?.settings?.notifications?.sms_notifications !== false

  } catch (error) {
    console.error('SMS preference check error:', error)
    return true // Default to allowing SMS on error
  }
}

async function processBulkSMS(
  messages: Record<string, unknown>[], 
  requestedBy: string, 
  request: NextRequest
): Promise<Array<{ phone: string; success: boolean; message_id?: string; error?: string }>> {
  const concurrency = 5 // Process 5 messages at a time
  const results: Array<{ phone: string; success: boolean; message_id?: string; error?: string }> = []

  for (let i = 0; i < messages.length; i += concurrency) {
    const batch = messages.slice(i, i + concurrency)
    
    const batchPromises = batch.map(async (msg) => {
      try {
        const { to, message, template, template_vars, priority = 'normal', type = 'notification' } = msg

        if (!to || (!message && !template)) {
          return {
            phone: String(to || 'unknown'),
            success: false,
            error: 'Phone number and message/template required'
          }
        }

        let smsResponse
        if (template && template_vars) {
          smsResponse = await smsService.sendTemplateMessage(
            String(to),
            template as SMSTemplate,
            template_vars as Record<string, string>,
            { 
              priority: String(priority) as 'low' | 'high' | 'urgent' | 'normal', 
              type: String(type) as 'marketing' | 'notification' | 'transactional' 
            }
          )
        } else {
          smsResponse = await smsService.sendSMS({ 
            to: String(to), 
            message: String(message), 
            priority: String(priority) as 'low' | 'high' | 'urgent' | 'normal', 
            type: String(type) as 'marketing' | 'notification' | 'transactional'
          })
        }

        // Log the request
        await logSMSRequest({
          phone_number: String(to),
          message: String(message) || `Template: ${String(template)}`,
          template: String(template || ''),
          priority: String(priority),
          type: String(type),
          success: smsResponse.success,
          message_id: smsResponse.message_id,
          provider: smsResponse.provider_used,
          error: smsResponse.error,
          requested_by: requestedBy,
          ip_address: getClientIP(request),
          user_agent: request.headers.get('user-agent') || 'unknown',
          bulk_request: true
        })

        return {
          phone: String(to),
          success: smsResponse.success,
          message_id: smsResponse.message_id,
          error: smsResponse.error
        }

      } catch (error) {
        return {
          phone: String(msg.to || 'unknown'),
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Small delay between batches to avoid overwhelming providers
    if (i + concurrency < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

function isValidPhoneNumber(phone: string): boolean {
  // E.164 format validation
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}

function extractVariables(template: string): string[] {
  const matches = template.match(/{([^}]+)}/g)
  return matches ? matches.map(match => match.slice(1, -1)) : []
}

async function logSMSRequest(data: {
  phone_number: string
  message: string
  template?: string
  priority: string
  type: string
  success: boolean
  message_id?: string
  provider?: string
  error?: string
  requested_by: string
  ip_address: string
  user_agent: string
  bulk_request?: boolean
}) {
  try {
    const supabase = createAdminClient()
    
    await supabase.from('sms_api_logs').insert({
      ...data,
      created_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to log SMS request:', error)
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cloudflareCF = request.headers.get('cf-connecting-ip')
  
  return cloudflareCF || real || forwarded?.split(',')[0] || 'unknown'
}