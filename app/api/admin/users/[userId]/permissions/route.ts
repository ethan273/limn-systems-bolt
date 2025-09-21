import { NextRequest, NextResponse } from 'next/server'
import { withAdminSecurity, auditAdminEvent, requireRecentAuth } from '@/lib/security/admin-security'

export const GET = withAdminSecurity(async (
  request: NextRequest,
  { user, session }
) => {
  const url = new URL(request.url)
  const userId = url.pathname.split('/')[4] // Extract userId from path
  
  await auditAdminEvent('sensitive_data_access', {
    userId: user.id,
    userEmail: user.email,
    action: 'view_user_permissions',
    resource: 'user_permissions',
    targetUserId: userId,
    sessionId: session.sessionId,
    ipAddress: session.ipAddress,
    metadata: { timestamp: new Date().toISOString() }
  })
  
  try {

    // Mock user permissions data
    // In production, this would query user_profiles and user_feature_overrides tables
    const mockUserPermissions = {
      userType: 'Designer',
      defaultPermissions: {
        orders_view: true,
        orders_create: true,
        inventory_view: true,
        inventory_edit: true,
        design_manage: true,
        reports_view: true
      },
      overrides: [
        {
          feature: 'orders_delete',
          has_permission: true
        }
      ],
      customPermissions: null
    }

    return NextResponse.json(mockUserPermissions)
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An error occurred' }, { status: 500 })
  }
})

// Custom POST handler with recent auth requirement for sensitive permission changes
export async function POST(
  request: NextRequest
) {
  // Require recent authentication (within 5 minutes) for permission changes
  const authResult = await requireRecentAuth(request, 5)
  
  if (!authResult.valid) {
    return NextResponse.json({
      success: false,
      error: authResult.error || 'Recent authentication required for permission changes',
    }, { status: authResult.statusCode || 403 })
  }
  
  const { user, session } = authResult
  const url = new URL(request.url)
  const userId = url.pathname.split('/')[4] // Extract userId from path
  
  await auditAdminEvent('user_management_action', {
    userId: user!.id,
    userEmail: user!.email,
    action: 'modify_user_permissions_attempt',
    resource: 'user_permissions',
    targetUserId: userId,
    sessionId: session!.sessionId,
    ipAddress: session!.ipAddress,
    metadata: { 
      requiresRecentAuth: true,
      timestamp: new Date().toISOString() 
    }
  })
  
  try {
    const body = await request.json()
    const { feature, hasPermission } = body

    // Mock successful override
    // In production, this would upsert into user_feature_overrides table
    console.log(`Setting permission override for user ${userId}: ${feature} = ${hasPermission}`)
    
    await auditAdminEvent('user_management_action', {
      userId: user!.id,
      userEmail: user!.email,
      action: 'modify_user_permissions_success',
      resource: 'user_permissions',
      targetUserId: userId,
      sessionId: session!.sessionId,
      ipAddress: session!.ipAddress,
      metadata: { 
        feature,
        hasPermission,
        requiresRecentAuth: true,
        timestamp: new Date().toISOString() 
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Permission override updated successfully',
      data: { userId, feature, hasPermission }
    })
  } catch (error: unknown) {
    await auditAdminEvent('user_management_action', {
      userId: user!.id,
      userEmail: user!.email,
      action: 'modify_user_permissions_failed',
      resource: 'user_permissions',
      targetUserId: userId,
      sessionId: session!.sessionId,
      ipAddress: session!.ipAddress,
      metadata: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresRecentAuth: true,
        timestamp: new Date().toISOString() 
      }
    })
    
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An error occurred' }, { status: 500 })
  }
}