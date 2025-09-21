import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { z } from 'zod'

const smsInvitationSchema = z.object({
  userId: z.string().uuid(),
  customerId: z.string().uuid(),
  portalId: z.string().optional(),
  message: z.string().min(1),
  recipientInfo: z.object({
    phone: z.string().min(1),
    fullName: z.string(),
    role: z.string()
  })
})

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.write_operations)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }

  try {
    // Validate permissions
    const authResult = await requirePermissions(request, ['customers.update', 'portal.create'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Cannot send SMS invitations' },
        { status: authResult.statusCode || 403 }
      )
    }

    const body = await request.json()
    const validatedData = smsInvitationSchema.parse(body)
    
    const supabase = await createServerSupabaseClient()

    // Replace {{PORTAL_LINK}} placeholder with actual portal link
    const portalLink = `${process.env.NEXT_PUBLIC_SITE_URL}/portal?portal_id=${validatedData.portalId || validatedData.customerId}`
    const finalMessage = validatedData.message.replace(/\{\{PORTAL_LINK\}\}/g, portalLink)

    try {
      // Send SMS invitation using our SMS system
      const smsResult = await sendSMSInvitation({
        phone: validatedData.recipientInfo.phone,
        message: finalMessage
      })

      if (!smsResult.success) {
        throw new Error(smsResult.error || 'Failed to send SMS invitation')
      }

      // Log the invitation in verification_logs
      await supabase.from('verification_logs').insert({
        user_id: authResult.user?.id,
        email: '', // SMS doesn't have email
        type: 'sms_invitation_sent',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          customer_id: validatedData.customerId,
          portal_id: validatedData.portalId,
          recipient_name: validatedData.recipientInfo.fullName,
          recipient_phone: validatedData.recipientInfo.phone,
          message_length: finalMessage.length
        },
        created_at: new Date().toISOString()
      })

      // Log in SMS invitations table
      await supabase.from('sms_invitations').insert({
        portal_user_id: validatedData.userId,
        phone_number: validatedData.recipientInfo.phone,
        message_content: finalMessage,
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

      // Update portal user invitation status
      if (validatedData.userId) {
        await supabase
          .from('customer_portal_users')
          .update({
            invitation_status: 'sent',
            invitation_sent_at: new Date().toISOString()
          })
          .eq('id', validatedData.userId)
      }

      return NextResponse.json({
        success: true,
        message: 'SMS invitation sent successfully',
        data: {
          recipient: validatedData.recipientInfo.phone,
          sent_at: new Date().toISOString(),
          portal_link: portalLink
        }
      })

    } catch (error) {
      console.error('Error sending SMS invitation:', error)
      
      // Log the failed invitation
      await supabase.from('verification_logs').insert({
        user_id: authResult.user?.id,
        email: '', // SMS doesn't have email
        type: 'sms_invitation_sent',
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          customer_id: validatedData.customerId,
          portal_id: validatedData.portalId,
          recipient_phone: validatedData.recipientInfo.phone
        },
        created_at: new Date().toISOString()
      })

      // Log failed SMS invitation
      await supabase.from('sms_invitations').insert({
        portal_user_id: validatedData.userId,
        phone_number: validatedData.recipientInfo.phone,
        message_content: finalMessage,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        created_at: new Date().toISOString()
      })

      return NextResponse.json(
        { error: 'Failed to send SMS invitation' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in SMS invitation API:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.issues
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// SMS Invitation Function
async function sendSMSInvitation({
  phone,
  message
}: {
  phone: string
  message: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
      console.log(`[SMS SIMULATION] Twilio not configured. Would send SMS to ${phone}:`)
      console.log(`${message}`)
      return { success: true }
    }

    // Import Twilio dynamically to avoid errors if not installed
    const { default: twilio } = await import('twilio')
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    
    console.log(`[SMS] Sending real SMS to ${phone} via Twilio...`)
    
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phone
    })
    
    console.log(`[SMS] Successfully sent SMS via Twilio. SID: ${twilioMessage.sid}`)
    
    return { success: true }
    
  } catch (error) {
    console.error('SMS sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown SMS error'
    }
  }
}