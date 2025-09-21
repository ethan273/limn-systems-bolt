import { NextRequest, NextResponse } from 'next/server'
import { getUserContext, type UserContext } from '@/lib/permissions/rbac'
import { getClientIdentifier, addSecurityHeaders } from '@/lib/validation/auth-validation'

// Enhanced admin security requirements
export interface AdminSecurityConfig {
  requireMFA: boolean
  sessionTimeout: number // in minutes
  requireRecentAuth: boolean // require re-auth for sensitive operations
  maxConcurrentSessions: number
  ipWhitelist?: string[]
  geoBlocking?: string[] // blocked countries
  requireDeviceRegistration: boolean
  auditLevel: 'basic' | 'detailed' | 'comprehensive'
}

// Default admin security configuration
export const DEFAULT_ADMIN_CONFIG: AdminSecurityConfig = {
  requireMFA: true,
  sessionTimeout: 60, // 1 hour
  requireRecentAuth: true,
  maxConcurrentSessions: 3,
  requireDeviceRegistration: false,
  auditLevel: 'comprehensive'
}

// Admin session tracking
interface AdminSession {
  sessionId: string
  userId: string
  userEmail: string
  startTime: number
  lastActivity: number
  ipAddress: string
  userAgent: string
  deviceFingerprint: string
  mfaVerified: boolean
  privilegeLevel: 'admin' | 'super_admin'
  recentAuthTime?: number
}

// In-memory session store (in production, use Redis/database)
const adminSessions = new Map<string, AdminSession>()
const userSessionCounts = new Map<string, Set<string>>()

// Admin audit events
export type AdminAuditEvent = 
  | 'admin_login'
  | 'admin_logout'
  | 'privilege_escalation'
  | 'sensitive_data_access'
  | 'system_configuration_change'
  | 'user_management_action'
  | 'security_setting_change'
  | 'failed_admin_action'
  | 'suspicious_admin_activity'
  | 'mfa_bypass_attempt'
  | 'concurrent_session_limit'

// Enhanced admin authentication middleware
export async function requireAdminAuth(
  request: NextRequest,
  options: Partial<AdminSecurityConfig> = {}
): Promise<{
  valid: boolean
  user?: UserContext
  session?: AdminSession
  error?: string
  statusCode?: number
}> {
  try {
    const config = { ...DEFAULT_ADMIN_CONFIG, ...options }
    const clientId = getClientIdentifier(request)
    const ipAddress = clientId.split(':')[0]
    
    // Get user context
    const user = await getUserContext(request)
    
    if (!user) {
      await auditAdminEvent('admin_login', {
        success: false,
        reason: 'no_user_context',
        ipAddress,
        timestamp: new Date().toISOString()
      })
      
      return {
        valid: false,
        error: 'Authentication required',
        statusCode: 401
      }
    }
    
    // Check if user has admin privileges
    if (!['admin', 'super_admin'].includes(user.role)) {
      await auditAdminEvent('privilege_escalation', {
        userId: user.id,
        userEmail: user.email,
        attemptedRole: 'admin',
        actualRole: user.role,
        success: false,
        ipAddress,
        timestamp: new Date().toISOString()
      })
      
      return {
        valid: false,
        error: 'Admin privileges required',
        statusCode: 403
      }
    }
    
    // IP whitelist check
    if (config.ipWhitelist && config.ipWhitelist.length > 0) {
      if (!config.ipWhitelist.includes(ipAddress)) {
        await auditAdminEvent('suspicious_admin_activity', {
          userId: user.id,
          userEmail: user.email,
          reason: 'ip_not_whitelisted',
          ipAddress,
          timestamp: new Date().toISOString()
        })
        
        return {
          valid: false,
          error: 'Access denied from this IP address',
          statusCode: 403
        }
      }
    }
    
    // Get or create admin session
    const sessionId = request.headers.get('x-session-id') || generateSessionId()
    let session = adminSessions.get(sessionId)
    
    if (!session) {
      // Check concurrent session limit
      const userSessions = userSessionCounts.get(user.id) || new Set()
      if (userSessions.size >= config.maxConcurrentSessions) {
        await auditAdminEvent('concurrent_session_limit', {
          userId: user.id,
          userEmail: user.email,
          sessionCount: userSessions.size,
          limit: config.maxConcurrentSessions,
          ipAddress,
          timestamp: new Date().toISOString()
        })
        
        return {
          valid: false,
          error: 'Maximum concurrent sessions exceeded',
          statusCode: 429
        }
      }
      
      // Create new session
      session = {
        sessionId,
        userId: user.id,
        userEmail: user.email,
        startTime: Date.now(),
        lastActivity: Date.now(),
        ipAddress,
        userAgent: request.headers.get('user-agent') || 'unknown',
        deviceFingerprint: generateDeviceFingerprint(request),
        mfaVerified: false, // Will be verified separately
        privilegeLevel: user.role as 'admin' | 'super_admin'
      }
      
      adminSessions.set(sessionId, session)
      userSessions.add(sessionId)
      userSessionCounts.set(user.id, userSessions)
      
      await auditAdminEvent('admin_login', {
        userId: user.id,
        userEmail: user.email,
        sessionId,
        ipAddress,
        userAgent: session.userAgent,
        privilegeLevel: session.privilegeLevel,
        success: true,
        timestamp: new Date().toISOString()
      })
    }
    
    // Check session timeout
    const sessionAge = Date.now() - session.lastActivity
    if (sessionAge > config.sessionTimeout * 60 * 1000) {
      await expireAdminSession(sessionId)
      
      return {
        valid: false,
        error: 'Session expired',
        statusCode: 401
      }
    }
    
    // Update last activity
    session.lastActivity = Date.now()
    
    // MFA verification check
    if (config.requireMFA && !session.mfaVerified) {
      return {
        valid: false,
        error: 'MFA verification required',
        statusCode: 403
      }
    }
    
    // Recent auth check for sensitive operations
    if (config.requireRecentAuth && session.recentAuthTime) {
      const recentAuthAge = Date.now() - session.recentAuthTime
      if (recentAuthAge > 15 * 60 * 1000) { // 15 minutes
        return {
          valid: false,
          error: 'Recent authentication required',
          statusCode: 403
        }
      }
    }
    
    return {
      valid: true,
      user,
      session
    }
    
  } catch (error) {
    console.error('Admin auth error:', error)
    return {
      valid: false,
      error: 'Internal server error',
      statusCode: 500
    }
  }
}

// Super admin only middleware
export async function requireSuperAdmin(
  request: NextRequest,
  options: Partial<AdminSecurityConfig> = {}
): Promise<{
  valid: boolean
  user?: UserContext
  session?: AdminSession
  error?: string
  statusCode?: number
}> {
  const result = await requireAdminAuth(request, options)
  
  if (!result.valid) {
    return result
  }
  
  if (result.user?.role !== 'super_admin') {
    await auditAdminEvent('privilege_escalation', {
      userId: result.user?.id,
      userEmail: result.user?.email,
      attemptedRole: 'super_admin',
      actualRole: result.user?.role,
      success: false,
      ipAddress: getClientIdentifier(request).split(':')[0],
      timestamp: new Date().toISOString()
    })
    
    return {
      valid: false,
      error: 'Super admin privileges required',
      statusCode: 403
    }
  }
  
  return result
}

// Sensitive operation middleware (requires recent auth)
export async function requireRecentAuth(
  request: NextRequest,
  maxAge: number = 15 // minutes
): Promise<{
  valid: boolean
  user?: UserContext
  session?: AdminSession
  error?: string
  statusCode?: number
}> {
  const result = await requireAdminAuth(request, { requireRecentAuth: true })
  
  if (!result.valid) {
    return result
  }
  
  const session = result.session!
  const recentAuthAge = session.recentAuthTime 
    ? Date.now() - session.recentAuthTime
    : Infinity
  
  if (recentAuthAge > maxAge * 60 * 1000) {
    await auditAdminEvent('failed_admin_action', {
      userId: result.user?.id,
      userEmail: result.user?.email,
      reason: 'recent_auth_required',
      lastAuthAge: Math.floor(recentAuthAge / 1000),
      maxAllowedAge: maxAge * 60,
      timestamp: new Date().toISOString()
    })
    
    return {
      valid: false,
      error: 'Recent authentication required for this operation',
      statusCode: 403
    }
  }
  
  return result
}

// Admin session management
export async function expireAdminSession(sessionId: string): Promise<void> {
  const session = adminSessions.get(sessionId)
  if (session) {
    // Remove from user session count
    const userSessions = userSessionCounts.get(session.userId)
    if (userSessions) {
      userSessions.delete(sessionId)
      if (userSessions.size === 0) {
        userSessionCounts.delete(session.userId)
      }
    }
    
    // Remove session
    adminSessions.delete(sessionId)
    
    await auditAdminEvent('admin_logout', {
      userId: session.userId,
      userEmail: session.userEmail,
      sessionId,
      sessionDuration: Date.now() - session.startTime,
      reason: 'expired',
      timestamp: new Date().toISOString()
    })
  }
}

export async function expireUserSessions(userId: string): Promise<void> {
  const userSessions = userSessionCounts.get(userId)
  if (userSessions) {
    for (const sessionId of userSessions) {
      await expireAdminSession(sessionId)
    }
  }
}

export async function refreshAdminSession(sessionId: string): Promise<void> {
  const session = adminSessions.get(sessionId)
  if (session) {
    session.recentAuthTime = Date.now()
  }
}

// Device fingerprinting for enhanced security
function generateDeviceFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  // Create a simple hash of device characteristics
  const fingerprint = btoa(`${userAgent}:${acceptLanguage}:${acceptEncoding}`)
    .replace(/[+/]/g, '')
    .substring(0, 16)
  
  return fingerprint
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Enhanced audit logging for admin actions
export async function auditAdminEvent(
  event: AdminAuditEvent,
  details: Record<string, unknown>
): Promise<void> {
  const auditRecord = {
    event,
    timestamp: new Date().toISOString(),
    ...details
  }
  
  // Log to console (in production, send to secure audit log service)
  console.log('[ADMIN_AUDIT]', JSON.stringify(auditRecord))
  
  // TODO: Store in secure audit database
  // await supabase.from('admin_audit_logs').insert(auditRecord)
}

// Create secure admin API response
export function createAdminResponse(
  success: boolean,
  message: string,
  data?: unknown,
  statusCode: number = 200,
  sessionId?: string
): NextResponse {
  const response = NextResponse.json({
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...(sessionId && { sessionId })
  }, { status: statusCode })
  
  // Add enhanced security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  return addSecurityHeaders(response)
}

// Admin middleware factory
export function withAdminSecurity(
  handler: (request: NextRequest, context: { user: UserContext, session: AdminSession }) => Promise<NextResponse>,
  options: Partial<AdminSecurityConfig> = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAdminAuth(request, options)
    
    if (!authResult.valid) {
      return createAdminResponse(
        false,
        authResult.error || 'Access denied',
        undefined,
        authResult.statusCode || 403
      )
    }
    
    try {
      return await handler(request, {
        user: authResult.user!,
        session: authResult.session!
      })
    } catch (error) {
      await auditAdminEvent('failed_admin_action', {
        userId: authResult.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
      
      return createAdminResponse(
        false,
        'Internal server error',
        undefined,
        500
      )
    }
  }
}

// Super admin middleware factory
export function withSuperAdminSecurity(
  handler: (request: NextRequest, context: { user: UserContext, session: AdminSession }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireSuperAdmin(request)
    
    if (!authResult.valid) {
      return createAdminResponse(
        false,
        authResult.error || 'Super admin access required',
        undefined,
        authResult.statusCode || 403
      )
    }
    
    try {
      return await handler(request, {
        user: authResult.user!,
        session: authResult.session!
      })
    } catch (error) {
      await auditAdminEvent('failed_admin_action', {
        userId: authResult.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        privilegeLevel: 'super_admin',
        timestamp: new Date().toISOString()
      })
      
      return createAdminResponse(
        false,
        'Internal server error',
        undefined,
        500
      )
    }
  }
}