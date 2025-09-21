/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Password strength validation
const passwordStrengthSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z\d]/, 'Password must contain at least one special character')

// Email validation with domain restrictions
const emailValidation = z.string()
  .email('Invalid email format')
  .toLowerCase()
  .refine((email) => {
    // Block common temporary email domains
    const tempDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com'
    ]
    const domain = email.split('@')[1]
    return !tempDomains.includes(domain)
  }, 'Temporary email addresses are not allowed')

// Rate limiting for authentication attempts
const authAttemptTracker = new Map<string, { count: number; lastAttempt: number; lockoutUntil?: number }>()

const MAX_AUTH_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000 // 15 minutes

export function checkAuthRateLimit(identifier: string): { allowed: boolean; remainingAttempts?: number; lockoutUntil?: Date } {
  const now = Date.now()
  const record = authAttemptTracker.get(identifier)
  
  if (!record) {
    authAttemptTracker.set(identifier, { count: 1, lastAttempt: now })
    return { allowed: true, remainingAttempts: MAX_AUTH_ATTEMPTS - 1 }
  }
  
  // Check if currently locked out
  if (record.lockoutUntil && now < record.lockoutUntil) {
    return { 
      allowed: false, 
      lockoutUntil: new Date(record.lockoutUntil)
    }
  }
  
  // Reset counter if attempt window has passed
  if (now - record.lastAttempt > ATTEMPT_WINDOW) {
    record.count = 1
    record.lastAttempt = now
    delete record.lockoutUntil
    return { allowed: true, remainingAttempts: MAX_AUTH_ATTEMPTS - 1 }
  }
  
  // Increment attempt counter
  record.count++
  record.lastAttempt = now
  
  // Check if limit exceeded
  if (record.count > MAX_AUTH_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION
    return { 
      allowed: false, 
      lockoutUntil: new Date(record.lockoutUntil)
    }
  }
  
  return { 
    allowed: true, 
    remainingAttempts: MAX_AUTH_ATTEMPTS - record.count 
  }
}

export function recordFailedAuth(identifier: string): void {
  checkAuthRateLimit(identifier) // This updates the counter
}

export function clearAuthAttempts(identifier: string): void {
  authAttemptTracker.delete(identifier)
}

// Authentication schemas
export const loginRequestSchema = z.object({
  email: emailValidation,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  captcha: z.string().optional() // For when rate limiting triggers CAPTCHA
})

export const registerRequestSchema = z.object({
  email: emailValidation,
  password: passwordStrengthSchema,
  confirmPassword: z.string(),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  marketingOptIn: z.boolean().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export const passwordResetRequestSchema = z.object({
  email: emailValidation,
  captcha: z.string().optional()
})

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordStrengthSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordStrengthSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword']
})

export const updateProfileSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional()
})

// MFA schemas
export const enableMfaSchema = z.object({
  password: z.string().min(1, 'Password verification required'),
  method: z.enum(['totp', 'sms'], { message: 'MFA method is required' })
})

export const verifyMfaSchema = z.object({
  token: z.string()
    .length(6, 'MFA token must be 6 digits')
    .regex(/^\d{6}$/, 'MFA token must be numeric'),
  method: z.enum(['totp', 'sms']).optional()
})

export const disableMfaSchema = z.object({
  password: z.string().min(1, 'Password verification required'),
  token: z.string()
    .length(6, 'MFA token must be 6 digits')
    .regex(/^\d{6}$/, 'MFA token must be numeric')
})

// Session management schemas
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

// Security audit schemas
export const securityEventSchema = z.object({
  userId: z.string().uuid(),
  eventType: z.enum([
    'login_success',
    'login_failed', 
    'logout',
    'password_changed',
    'mfa_enabled',
    'mfa_disabled',
    'profile_updated',
    'suspicious_activity'
  ]),
  ipAddress: z.string().optional(),
  userAgent: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

// Export hasPermission from RBAC for backward compatibility
export { hasPermission } from '@/lib/permissions/rbac'

// Enhanced interface for authentication validation
interface UserPermissionsResult {
  valid: boolean
  userId?: string
  tenantId?: string
  role?: string
  email?: string
  user?: { id: string; email?: string }
  error?: string
}

// Helper functions for authentication validation
export async function validateUserPermissions(
  request: NextRequest,
  requiredRole?: string,
  requiredPermissions?: string[]
): Promise<UserPermissionsResult> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { valid: false, error: 'Unauthorized' }
    }
    
    // Check if user has required role
    if (requiredRole) {
      const userRole = user.user_metadata?.role || 'customer'
      
      if (userRole !== requiredRole && userRole !== 'admin') {
        return { valid: false, error: 'Insufficient permissions' }
      }
    }
    
    // Check specific permissions if provided
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = user.user_metadata?.permissions || []
      
      const hasPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission) || user.user_metadata?.role === 'admin'
      )
      
      if (!hasPermissions) {
        return { valid: false, error: 'Insufficient permissions' }
      }
    }
    
    return { 
      valid: true, 
      user,
      userId: user.id,
      tenantId: user.user_metadata?.tenant_id || 'default',
      role: user.user_metadata?.role || 'customer',
      email: user.email
    }
    
  } catch (error) {
    console.error('Permission validation error:', error)
    return { valid: false, error: 'Internal server error' }
  }
}

export function getClientIdentifier(request: NextRequest): string {
  const ip = (request as any).ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Create a hash of IP + User Agent for rate limiting
  return `${ip}:${userAgent.substring(0, 50)}`
}

export function createAuthResponse(
  success: boolean,
  message: string,
  data?: unknown,
  statusCode: number = 200
): NextResponse {
  return NextResponse.json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  }, { status: statusCode })
}

// Security headers for auth responses
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  
  return response
}