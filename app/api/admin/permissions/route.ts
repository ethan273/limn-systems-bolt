import { NextRequest, NextResponse } from 'next/server'
import { withAdminSecurity, auditAdminEvent } from '@/lib/security/admin-security'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { errorResponses } from '@/lib/error-handling/error-middleware'
// import { secureLogger } from '@/lib/logging/secure-logger' // Unused

export const GET = withAdminSecurity(async (request: NextRequest, { user, session }) => {
  // Apply admin rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.admin_moderate)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  const searchParams = request.nextUrl.searchParams
  const userType = searchParams.get('userType')
  
  await auditAdminEvent('sensitive_data_access', {
    userId: user.id,
    userEmail: user.email,
    action: 'view_permission_templates',
    resource: 'permission_templates',
    sessionId: session.sessionId,
    ipAddress: session.ipAddress,
    metadata: { userType, timestamp: new Date().toISOString() }
  })
  
  try {

    // Mock permissions data - in production this would come from feature_permissions table
    const defaultPermissionsByType = {
      'Employee': {
        orders_view: true,
        orders_create: false,
        orders_edit: false,
        orders_delete: false,
        inventory_view: true,
        inventory_edit: false,
        inventory_create: false,
        inventory_delete: false,
        customers_view: true,
        customers_edit: false,
        customers_create: false,
        customers_delete: false,
        design_manage: false,
        production_manage: false,
        qc_manage: false,
        finance_manage: false,
        reports_view: true,
        reports_create: false,
        reports_edit: false,
        admin_users: false,
        admin_system: false
      },
      'Contractor': {
        orders_view: true,
        orders_create: false,
        orders_edit: false,
        orders_delete: false,
        inventory_view: false,
        inventory_edit: false,
        inventory_create: false,
        inventory_delete: false,
        customers_view: false,
        customers_edit: false,
        customers_create: false,
        customers_delete: false,
        design_manage: false,
        production_manage: false,
        qc_manage: false,
        finance_manage: false,
        reports_view: false,
        reports_create: false,
        reports_edit: false,
        admin_users: false,
        admin_system: false
      },
      'Designer': {
        orders_view: true,
        orders_create: true,
        orders_edit: true,
        orders_delete: false,
        inventory_view: true,
        inventory_edit: true,
        inventory_create: true,
        inventory_delete: false,
        customers_view: true,
        customers_edit: false,
        customers_create: false,
        customers_delete: false,
        design_manage: true,
        production_manage: false,
        qc_manage: false,
        finance_manage: false,
        reports_view: true,
        reports_create: false,
        reports_edit: false,
        admin_users: false,
        admin_system: false
      },
      'Manufacturer': {
        orders_view: true,
        orders_create: false,
        orders_edit: true,
        orders_delete: false,
        inventory_view: true,
        inventory_edit: true,
        inventory_create: true,
        inventory_delete: false,
        customers_view: false,
        customers_edit: false,
        customers_create: false,
        customers_delete: false,
        design_manage: false,
        production_manage: true,
        qc_manage: true,
        finance_manage: false,
        reports_view: true,
        reports_create: false,
        reports_edit: false,
        admin_users: false,
        admin_system: false
      },
      'Finance': {
        orders_view: true,
        orders_create: true,
        orders_edit: true,
        orders_delete: true,
        inventory_view: true,
        inventory_edit: false,
        inventory_create: false,
        inventory_delete: false,
        customers_view: true,
        customers_edit: true,
        customers_create: true,
        customers_delete: false,
        design_manage: false,
        production_manage: false,
        qc_manage: false,
        finance_manage: true,
        reports_view: true,
        reports_create: true,
        reports_edit: true,
        admin_users: true,
        admin_system: false
      },
      'Super Admin': {
        orders_view: true,
        orders_create: true,
        orders_edit: true,
        orders_delete: true,
        inventory_view: true,
        inventory_edit: true,
        inventory_create: true,
        inventory_delete: true,
        customers_view: true,
        customers_edit: true,
        customers_create: true,
        customers_delete: true,
        design_manage: true,
        production_manage: true,
        qc_manage: true,
        finance_manage: true,
        reports_view: true,
        reports_create: true,
        reports_edit: true,
        admin_users: true,
        admin_system: true
      }
    }

    const permissions = defaultPermissionsByType[userType as keyof typeof defaultPermissionsByType] || {}

    return NextResponse.json({ permissions })
  } catch (error: unknown) {
    return await errorResponses.internal(error as Error, request)
  }
}, {
  requireMFA: true,
  requireRecentAuth: true,
  sessionTimeout: 60
})

// PUT handler with same development-friendly security as GET
export const PUT = withAdminSecurity(async (request: NextRequest, { user, session }) => {
  // Apply admin rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.admin_moderate)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  
  await auditAdminEvent('security_setting_change', {
    userId: user!.id,
    userEmail: user!.email,
    action: 'modify_permission_template_attempt',
    resource: 'permission_templates',
    sessionId: session!.sessionId,
    ipAddress: session!.ipAddress,
    metadata: { 
      requiresRecentAuth: true,
      timestamp: new Date().toISOString() 
    }
  })
  
  try {
    const body = await request.json()
    const { userType, permissions } = body

    // Mock successful update
    // In production, this would update the feature_permissions table
    console.log(`Updating permissions for ${userType}:`, permissions)
    
    await auditAdminEvent('security_setting_change', {
      userId: user!.id,
      userEmail: user!.email,
      action: 'modify_permission_template_success',
      resource: 'permission_templates',
      sessionId: session!.sessionId,
      ipAddress: session!.ipAddress,
      metadata: { 
        userType,
        permissions: Object.keys(permissions).filter(key => permissions[key]).join(', '),
        requiresRecentAuth: true,
        timestamp: new Date().toISOString() 
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Permissions updated successfully',
      data: { userType, permissions }
    })
  } catch (error: unknown) {
    await auditAdminEvent('security_setting_change', {
      userId: user!.id,
      userEmail: user!.email,
      action: 'modify_permission_template_failed',
      resource: 'permission_templates',
      sessionId: session!.sessionId,
      ipAddress: session!.ipAddress,
      metadata: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresRecentAuth: true,
        timestamp: new Date().toISOString() 
      }
    })
    
    return await errorResponses.internal(error as Error, request, user!.id)
  }
}, {
  requireMFA: true,
  requireRecentAuth: true,
  sessionTimeout: 60
})