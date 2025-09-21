/* eslint-disable @typescript-eslint/no-unused-vars */
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/validation/middleware'
import { passwordResetRequestSchema, passwordResetSchema } from '@/lib/validation/auth-validation'
import { checkAuthRateLimit, getClientIdentifier, addSecurityHeaders } from '@/lib/validation/auth-validation'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { hasProperty, safeGet } from '@/lib/utils/bulk-type-fixes'

async function postHandler(request: NextRequest) {
  // Apply stricter authentication rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.auth_strict)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  try {
    const body = await request.json()
    
    // Check rate limiting first
    const clientId = getClientIdentifier(request)
    const rateLimitCheck = checkAuthRateLimit(clientId)
    
    if (!rateLimitCheck.allowed) {
      const response = NextResponse.json(
        { 
          error: 'Too many authentication attempts',
          lockoutUntil: rateLimitCheck.lockoutUntil,
          message: 'Please wait before trying again'
        },
        { status: 429 }
      )
      return addSecurityHeaders(response)
    }

    // Handle password reset request (send reset email)
    if (!body.new_password && !body.token) {
      const validatedData = await validateRequest(request, passwordResetRequestSchema, 'body')
      return await handlePasswordResetRequest(validatedData.email, request)
    }

    // Handle password reset confirmation (update password)
    if (body.new_password && body.token) {
      const validatedData = await validateRequest(request, passwordResetSchema, 'body')
      return await handlePasswordResetConfirmation(validatedData, request)
    }

    const response = NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    )
    return addSecurityHeaders(response)

  } catch (_error) {
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
    return addSecurityHeaders(response)
  }
}

export { postHandler as POST };

async function handlePasswordResetRequest(email: string, request: NextRequest) {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if user exists and has portal access
    const { data: customer } = await supabase
      .from('customers')
      .select('id, portal_access')
      .eq('email', email)
      .single()

    if (!customer) {
      // Don't reveal whether user exists - always return success
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, you will receive password reset instructions.'
      })
    }

    if (!hasProperty(customer, 'portal_access') || !customer.portal_access) {
      return NextResponse.json({
        success: false,
        error: 'Portal access not granted for this account. Contact support for assistance.'
      }, { status: 403 })
    }

    // Check rate limiting
    const rateLimitCheck = await checkPasswordResetRateLimit(email)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many password reset requests',
          message: `Please wait ${rateLimitCheck.wait_time} minutes before requesting another reset.`
        },
        { status: 429 }
      )
    }

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/reset-password`
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      )
    }

    // Log password reset request
    await logPasswordResetEvent({
      email,
      type: 'reset_requested',
      success: true,
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown'
    })

    const response = NextResponse.json({
      success: true,
      message: 'Password reset instructions sent to your email address.'
    })
    return addSecurityHeaders(response)

  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}

async function handlePasswordResetConfirmation(
  validatedData: { token: string; password: string; confirmPassword: string },
  request: NextRequest
) {
  try {
    const supabase = createAdminClient()

    // Verify the reset token and update password
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: validatedData.token,
      type: 'recovery'
    })

    if (error) {
      
      await logPasswordResetEvent({
        email: String(safeGet(data, ['user', 'email']) || 'unknown'),
        type: 'reset_failed',
        success: false,
        error_message: 'Invalid or expired token',
        ip_address: getClientIP(request),
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

      const response = NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    if (!data.user) {
      const response = NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      data.user.id,
      { password: validatedData.password }
    )

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Update customer record
    await supabase
      .from('customers')
      .update({ 
        last_password_reset: new Date().toISOString(),
        password_reset_count: supabase.rpc('increment_password_reset_count', { customer_email: data.user.email })
      })
      .eq('email', data.user.email)

    // Log successful password reset
    await logPasswordResetEvent({
      user_id: data.user.id,
      email: data.user.email || 'unknown',
      type: 'reset_completed',
      success: true,
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown'
    })

    // Revoke all existing sessions for security
    await supabase.auth.admin.signOut(data.user.id, 'global')

    const response = NextResponse.json({
      success: true,
      message: 'Password updated successfully. Please sign in with your new password.',
      data: {
        user_id: data.user.id,
        reset_at: new Date().toISOString()
      }
    })
    return addSecurityHeaders(response)

  } catch (_error) {
    const response = NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
    return addSecurityHeaders(response)
  }
}

// Unused password validation function - removed to fix ESLint violation
// This function was not being called anywhere in the codebase
/*
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' }
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'password123', 
    'admin123', 'letmein123', 'welcome123'
  ]
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'Please choose a stronger, less common password' }
  }

  return { valid: true }
}
*/

async function checkPasswordResetRateLimit(email: string): Promise<{
  allowed: boolean
  wait_time?: number
}> {
  try {
    const supabase = createAdminClient()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('password_reset_logs')
      .select('created_at')
      .eq('email', email)
      .eq('type', 'reset_requested')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })

    if (error) {
      return { allowed: true }
    }

    const maxAttemptsPerHour = 3
    const attemptCount = data?.length || 0

    if (attemptCount >= maxAttemptsPerHour) {
      const lastAttempt = data[0]?.created_at
      const waitTime = lastAttempt 
        ? Math.ceil((new Date(lastAttempt).getTime() + 60 * 60 * 1000 - Date.now()) / (1000 * 60))
        : 60

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

async function logPasswordResetEvent(event: {
  user_id?: string
  email: string
  type: string
  success: boolean
  ip_address: string
  user_agent: string
  error_message?: string
}) {
  try {
    const supabase = createAdminClient()
    
    await supabase.from('password_reset_logs').insert({
      ...event,
      created_at: new Date().toISOString()
    })
  } catch (_error) {
    // Silent failure for logging
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cloudflareCF = request.headers.get('cf-connecting-ip')
  
  return cloudflareCF || real || forwarded?.split(',')[0] || 'unknown'
}

// GET endpoint for password reset status/validation
async function getHandler(request: NextRequest) {
  // Apply stricter authentication rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.auth_strict)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify token is valid without consuming it
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery'
    })

    const isValid = !error && data?.user?.email === email

    return NextResponse.json({
      valid: isValid,
      email: isValid ? email : null,
      expires_at: isValid ? data?.session?.expires_at : null
    })

  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to validate reset token' },
      { status: 500 }
    )
  }
}

export { getHandler as GET };