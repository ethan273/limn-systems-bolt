import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { z } from 'zod'

const emailInvitationSchema = z.object({
  userId: z.string().uuid(),
  customerId: z.string().uuid(),
  portalId: z.string().optional(),
  message: z.string().min(1),
  recipientInfo: z.object({
    email: z.string().email(),
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
        { error: authResult.error || 'Forbidden - Cannot send invitations' },
        { status: authResult.statusCode || 403 }
      )
    }

    const body = await request.json()
    const validatedData = emailInvitationSchema.parse(body)
    
    const supabase = await createServerSupabaseClient()

    // Replace {{PORTAL_LINK}} placeholder with actual portal link
    const portalLink = `${process.env.NEXT_PUBLIC_SITE_URL}/portal?portal_id=${validatedData.portalId || validatedData.customerId}`
    const finalMessage = validatedData.message.replace(/\{\{PORTAL_LINK\}\}/g, portalLink)

    try {
      // Send magic link email
      const magicLinkResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/verify-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: validatedData.recipientInfo.email,
          type: 'invite',
          metadata: {
            portal_id: validatedData.portalId,
            customer_id: validatedData.customerId,
            user_type: 'customer',
            full_name: validatedData.recipientInfo.fullName,
            role: validatedData.recipientInfo.role,
            custom_message: finalMessage
          }
        })
      })

      if (!magicLinkResponse.ok) {
        const errorData = await magicLinkResponse.json()
        throw new Error(errorData.error || 'Failed to send email invitation')
      }

      // Log the invitation in verification_logs
      await supabase.from('verification_logs').insert({
        user_id: authResult.user?.id,
        email: validatedData.recipientInfo.email,
        type: 'email_invitation_sent',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          customer_id: validatedData.customerId,
          portal_id: validatedData.portalId,
          recipient_name: validatedData.recipientInfo.fullName,
          message_length: finalMessage.length
        },
        created_at: new Date().toISOString()
      })

      // Update portal user invitation status if we have a user ID
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
        message: 'Email invitation sent successfully',
        data: {
          recipient: validatedData.recipientInfo.email,
          sent_at: new Date().toISOString(),
          portal_link: portalLink
        }
      })

    } catch (error) {
      console.error('Error sending email invitation:', error)
      
      // Log the failed invitation
      await supabase.from('verification_logs').insert({
        user_id: authResult.user?.id,
        email: validatedData.recipientInfo.email,
        type: 'email_invitation_sent',
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          customer_id: validatedData.customerId,
          portal_id: validatedData.portalId
        },
        created_at: new Date().toISOString()
      })

      return NextResponse.json(
        { error: 'Failed to send email invitation' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in email invitation API:', error)
    
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