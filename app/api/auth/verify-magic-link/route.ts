/* eslint-disable @typescript-eslint/no-unused-vars */
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'

async function getHandler(request: NextRequest) {
  // Apply stricter authentication rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.auth_strict)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const type = searchParams.get('type') // 'signup' | 'recovery' | 'invite'
    const redirect_to = searchParams.get('redirect_to') || '/portal'

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify the magic link token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type === 'recovery' ? 'recovery' : 'signup',
    })

    if (error) {
      // Redirect to error page with specific error
      const errorUrl = new URL('/portal/login', request.url)
      errorUrl.searchParams.set('error', 'invalid_token')
      errorUrl.searchParams.set('error_description', 'Invalid or expired verification link')
      
      return NextResponse.redirect(errorUrl)
    }

    if (!data.user) {
      const errorUrl = new URL('/portal/login', request.url)
      errorUrl.searchParams.set('error', 'verification_failed')
      errorUrl.searchParams.set('error_description', 'User verification failed')
      
      return NextResponse.redirect(errorUrl)
    }

    // Handle different verification types
    if (type === 'signup' || type === 'invite') {
      await handleSignupVerification(data.user)
    } else if (type === 'recovery') {
      await handlePasswordRecoveryVerification(data.user)
    }

    // Log verification event
    await logVerificationEvent({
      user_id: data.user.id,
      email: data.user.email,
      type: type || 'unknown',
      success: true,
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown'
    })

    // Handle different redirect scenarios
    if (type === 'recovery') {
      // Password recovery - redirect to reset password page
      const resetUrl = new URL('/portal/reset-password', request.url)
      resetUrl.searchParams.set('access_token', data.session?.access_token || '')
      resetUrl.searchParams.set('refresh_token', data.session?.refresh_token || '')
      return NextResponse.redirect(resetUrl)
    } else if (type === 'invite' && data.user.user_metadata?.portal_id) {
      // Portal invitation - redirect to portal dashboard
      const portalUrl = new URL('/portal', request.url)
      portalUrl.searchParams.set('portal_id', data.user.user_metadata.portal_id as string)
      portalUrl.searchParams.set('verified', 'true')
      portalUrl.searchParams.set('invitation_accepted', 'true')
      return NextResponse.redirect(portalUrl)
    } else {
      // Regular signup or other verification - use redirect_to parameter
      const successUrl = new URL(redirect_to, request.url)
      successUrl.searchParams.set('verified', 'true')
      return NextResponse.redirect(successUrl)
    }

  } catch (_error) {
    const errorUrl = new URL('/portal/login', request.url)
    errorUrl.searchParams.set('error', 'server_error')
    errorUrl.searchParams.set('error_description', 'An error occurred during verification')
    
    return NextResponse.redirect(errorUrl)
  }
}

export { getHandler as GET };

async function postHandler(request: NextRequest) {
  // Apply stricter authentication rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.auth_strict)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  try {
    const { email, type = 'magiclink' } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(email)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many requests. Please wait ${rateLimitCheck.wait_time} seconds.`
        },
        { status: 429 }
      )
    }

    // Generate and send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/verify-magic-link?type=${type}`,
        data: {
          user_type: 'customer' // Default to customer for portal access
        }
      }
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to send magic link' },
        { status: 500 }
      )
    }

    // Log magic link request
    await logVerificationEvent({
      email,
      type: 'magic_link_sent',
      success: true,
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      message: 'Magic link sent to your email address',
      data: {
        email,
        sent_at: new Date().toISOString()
      }
    })

  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { postHandler as POST };

async function handleSignupVerification(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  try {
    const supabase = createAdminClient()
    
    // Check if this is a portal invitation
    const isPortalInvite = user.user_metadata?.portal_id && user.user_metadata?.customer_id
    
    if (isPortalInvite) {
      // Handle portal user invitation
      await handlePortalInvitationVerification(user)
    } else {
      // Handle regular signup
      // Check if user already exists in customers table
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!existingCustomer) {
        // Create customer record
        const { error } = await supabase
          .from('customers')
          .insert({
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.full_name || null,
            company_name: user.user_metadata?.company || null,
            portal_access: false, // Admin needs to grant access
            created_at: new Date().toISOString()
          })

        if (error) {
          // Error creating customer record - silently handled
          console.error('Error creating customer record:', error)
        }
      }
    }
  } catch (error) {
    console.error('Error in signup verification:', error)
  }
}

async function handlePortalInvitationVerification(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  try {
    const supabase = createAdminClient()
    
    const portalId = user.user_metadata?.portal_id as string
    const customerId = user.user_metadata?.customer_id as string
    
    if (!portalId || !user.email) {
      console.error('Missing portal_id or email in invitation verification')
      return
    }
    
    // Update the customer_portal_users record with the auth user ID
    const { error: updateError } = await supabase
      .from('customer_portal_users')
      .update({
        auth_user_id: user.id,
        invitation_status: 'accepted',
        invitation_accepted_at: new Date().toISOString()
      })
      .eq('portal_id', portalId)
      .eq('email', user.email)
    
    if (updateError) {
      console.error('Error updating portal user:', updateError)
      return
    }
    
    // Log portal activity
    await supabase
      .from('customer_portal_activity')
      .insert({
        portal_id: portalId,
        portal_user_id: null, // We don't have the portal_user_id yet
        activity_type: 'user_invitation_accepted',
        activity_description: `User ${user.email} accepted portal invitation`,
        metadata: {
          user_id: user.id,
          email: user.email,
          accepted_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
    
    console.log('Portal invitation verification completed for:', user.email)
    
  } catch (error) {
    console.error('Error in portal invitation verification:', error)
  }
}

async function handlePasswordRecoveryVerification(user: { email?: string }) {
  try {
    const supabase = createAdminClient()
    
    // Update last recovery attempt
    await supabase
      .from('customers')
      .update({ 
        last_password_reset: new Date().toISOString() 
      })
      .eq('email', user.email)

  } catch (_error) {
    // Silent failure for password recovery verification
  }
}

async function checkRateLimit(email: string): Promise<{
  allowed: boolean
  wait_time?: number
}> {
  try {
    const supabase = createAdminClient()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('verification_logs')
      .select('created_at')
      .eq('email', email)
      .eq('type', 'magic_link_sent')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })

    if (error) {
      return { allowed: true } // Allow on error
    }

    const maxAttemptsPerHour = 5
    const attemptCount = data?.length || 0

    if (attemptCount >= maxAttemptsPerHour) {
      const lastAttempt = data[0]?.created_at
      const waitTime = lastAttempt 
        ? Math.ceil((new Date(lastAttempt).getTime() + 60 * 60 * 1000 - Date.now()) / 1000)
        : 3600

      return { 
        allowed: false, 
        wait_time: Math.max(waitTime, 0) 
      }
    }

    return { allowed: true }
  } catch (_error) {
    return { allowed: true }
  }
}

async function logVerificationEvent(event: {
  user_id?: string
  email?: string
  type: string
  success: boolean
  ip_address: string
  user_agent: string
  error_message?: string
}) {
  try {
    const supabase = createAdminClient()
    
    await supabase.from('verification_logs').insert({
      ...event,
      created_at: new Date().toISOString()
    })
  } catch (_error) {
    // Don't throw - logging failures shouldn't break the flow
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cloudflareCF = request.headers.get('cf-connecting-ip')
  
  return cloudflareCF || real || forwarded?.split(',')[0] || 'unknown'
}