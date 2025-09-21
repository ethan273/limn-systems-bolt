 
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { z } from 'zod'

// Validation schemas
const portalUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  title: z.string(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'viewer']),
  isPrimaryContact: z.boolean()
})

const portalConfigSchema = z.object({
  portalName: z.string().min(1),
  welcomeMessage: z.string(),
  primaryColor: z.string(),
  showDashboard: z.boolean(),
  showOrders: z.boolean(),
  showShipping: z.boolean(),
  showFinancials: z.boolean(),
  showDocuments: z.boolean(),
  showApprovals: z.boolean(),
  showProductionTracking: z.boolean(),
  showDesignCenter: z.boolean(),
  showSupportTickets: z.boolean(),
  showInvoiceDetails: z.boolean(),
  showPaymentHistory: z.boolean(),
  showOutstandingBalance: z.boolean(),
  allowOnlinePayments: z.boolean(),
  allowDocumentUpload: z.boolean(),
  allowedFileTypes: z.array(z.string()),
  maxFileSizeMB: z.number(),
  requireApprovalForUploads: z.boolean(),
  enableNotifications: z.boolean(),
  enableEmailNotifications: z.boolean(),
  notificationFrequency: z.enum(['immediate', 'daily', 'weekly']),
  sessionTimeoutMinutes: z.number(),
  requireMFA: z.boolean()
})

const createPortalSchema = z.object({
  customerId: z.string().uuid(),
  configuration: portalConfigSchema,
  users: z.array(portalUserSchema).min(1)
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
        { error: authResult.error || 'Forbidden - Cannot create portal' },
        { status: authResult.statusCode || 403 }
      )
    }

    const body = await request.json()
    const validatedData = createPortalSchema.parse(body)
    
    const supabase = await createServerSupabaseClient()

    // Check if customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', validatedData.customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check if portal already exists
    const { data: existingPortal } = await supabase
      .from('customer_portals')
      .select('id')
      .eq('customer_id', validatedData.customerId)
      .single()

    if (existingPortal) {
      return NextResponse.json(
        { error: 'Portal already exists for this customer' },
        { status: 409 }
      )
    }

    // Create portal configuration
    const { data: portal, error: portalError } = await supabase
      .from('customer_portals')
      .insert({
        customer_id: validatedData.customerId,
        portal_name: validatedData.configuration.portalName,
        welcome_message: validatedData.configuration.welcomeMessage,
        primary_color: validatedData.configuration.primaryColor,
        configuration: validatedData.configuration,
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: authResult.user?.id
      })
      .select()
      .single()

    if (portalError) {
      console.error('Error creating portal:', portalError)
      return NextResponse.json(
        { error: 'Failed to create portal configuration' },
        { status: 500 }
      )
    }

    // Create portal users and send invitations
    const createdUsers = []
    const invitationErrors = []

    for (const user of validatedData.users) {
      try {
        // Create portal user record
        const { data: portalUser, error: userError } = await supabase
          .from('customer_portal_users')
          .insert({
            portal_id: portal.id,
            email: user.email,
            full_name: user.fullName,
            title: user.title,
            phone: user.phone,
            role: user.role,
            is_primary_contact: user.isPrimaryContact,
            is_active: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (userError) {
          console.error('Error creating portal user:', userError)
          invitationErrors.push(`Failed to create user ${user.email}: ${userError.message}`)
          continue
        }

        // Send invitation email using magic link system instead of Supabase Auth
        let invitationSuccess = false
        let invitationError = null

        try {
          // Use our magic link system for invitations
          const magicLinkResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/verify-magic-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              type: 'invite',
              metadata: {
                portal_id: portal.id,
                customer_id: validatedData.customerId,
                user_type: 'customer',
                full_name: user.fullName,
                title: user.title,
                role: user.role,
                is_primary_contact: user.isPrimaryContact,
                portal_name: validatedData.configuration.portalName
              }
            })
          })

          if (magicLinkResponse.ok) {
            invitationSuccess = true
            console.log('Magic link invitation sent successfully to:', user.email)
          } else {
            const errorData = await magicLinkResponse.json()
            invitationError = errorData.error || 'Failed to send magic link'
          }

        } catch (error) {
          invitationError = error instanceof Error ? error.message : 'Unknown error sending invitation'
        }

        // Send SMS if phone number provided
        if (user.phone && user.phone.trim()) {
          try {
            const smsResult = await sendSMSInvitation({
              phone: user.phone,
              fullName: user.fullName,
              portalName: validatedData.configuration.portalName,
              portalId: portal.id
            })
            
            if (smsResult.success) {
              console.log('SMS invitation sent successfully to:', user.phone)
            } else {
              console.error('SMS invitation failed:', smsResult.error)
            }
          } catch (smsError) {
            console.error('Error sending SMS invitation:', smsError)
          }
        }

        if (invitationSuccess) {
          // Update user record to indicate invitation sent
          await supabase
            .from('customer_portal_users')
            .update({ 
              invitation_status: 'sent',
              invitation_sent_at: new Date().toISOString()
            })
            .eq('id', portalUser.id)
        } else {
          console.error('Error sending invitation:', invitationError)
          invitationErrors.push(`Failed to send invitation to ${user.email}: ${invitationError}`)
          
          // Update user record to indicate invitation failed
          await supabase
            .from('customer_portal_users')
            .update({ invitation_status: 'failed' })
            .eq('id', portalUser.id)
        }

        createdUsers.push({
          ...portalUser,
          invitation_status: invitationSuccess ? 'sent' : 'failed'
        })

      } catch (error) {
        console.error('Error processing user:', error)
        invitationErrors.push(`Failed to process user ${user.email}: ${error}`)
      }
    }

    // Update customer record to indicate portal access is now available
    await supabase
      .from('customers')
      .update({
        portal_access: true,
        portal_created_at: new Date().toISOString(),
        portal_created_by: authResult.user?.id
      })
      .eq('id', validatedData.customerId)

    // Prepare response
    const response: {
      success: boolean
      data: {
        portal: unknown
        users: unknown[]
        customer: unknown
      }
      message: string
      warnings?: unknown[]
    } = {
      success: true,
      data: {
        portal,
        users: createdUsers,
        customer: customer
      },
      message: `Portal created successfully! ${createdUsers.length} user(s) invited.`
    }

    // Add warnings if there were invitation errors
    if (invitationErrors.length > 0) {
      response.message += ` However, there were issues with some invitations.`
      response.warnings = invitationErrors
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Error creating portal:', error)
    
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
  fullName,
  portalName,
  portalId
}: {
  phone: string
  fullName: string
  portalName: string
  portalId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
      console.log(`[SMS SIMULATION] Twilio not configured. Would send SMS to ${phone}:`)
      console.log(`Hi ${fullName}! You've been invited to access the ${portalName} portal. Click here to get started: ${process.env.NEXT_PUBLIC_SITE_URL}/portal?portal_id=${portalId}`)
      return { success: true }
    }

    // Import Twilio dynamically to avoid errors if not installed
    const { default: twilio } = await import('twilio')
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    
    const message = `Hi ${fullName}! You've been invited to access the ${portalName} portal. Click here to get started: ${process.env.NEXT_PUBLIC_SITE_URL}/portal?portal_id=${portalId}`
    
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