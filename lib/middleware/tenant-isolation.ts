/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/service'
import { tenantService, getTenantFromHost } from '@/lib/services/tenant'

export interface TenantContext {
  tenantId: string
  tenant: unknown
  userRole: string
  userPermissions: string[]
}

// Middleware to extract and validate tenant context
export async function withTenantIsolation(
  request: NextRequest,
  handler: (req: NextRequest, context: TenantContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Extract tenant from request
    const host = request.headers.get('host') || ''
    const tenantSubdomain = getTenantFromHost(host)
    
    if (!tenantSubdomain) {
      return NextResponse.json(
        { error: 'Tenant not found in request' },
        { status: 400 }
      )
    }

    // Get tenant from database
    const tenant = await tenantService.getTenantBySubdomain(tenantSubdomain)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid tenant' },
        { status: 404 }
      )
    }

    // Check tenant status
    if (tenant.status !== 'active') {
      return NextResponse.json(
        { error: 'Tenant is not active' },
        { status: 403 }
      )
    }

    // Get user from auth header
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check user access to tenant
    const tenantUser = await tenantService.checkUserAccess(user.id, tenant.id)
    if (!tenantUser) {
      return NextResponse.json(
        { error: 'Access denied to tenant' },
        { status: 403 }
      )
    }

    // Create tenant context
    const context: TenantContext = {
      tenantId: tenant.id,
      tenant,
      userRole: tenantUser.role,
      userPermissions: tenantUser.permissions
    }

    // Set tenant context in request headers for downstream use
    const requestWithContext = new NextRequest(request.url, {
      ...request,
      headers: new Headers(request.headers)
    })
    requestWithContext.headers.set('x-tenant-id', tenant.id)
    requestWithContext.headers.set('x-user-role', tenantUser.role)
    requestWithContext.headers.set('x-user-permissions', JSON.stringify(tenantUser.permissions))

    // Call the handler with tenant context
    return await handler(requestWithContext, context)

  } catch (error) {
    console.error('Tenant isolation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to create tenant-isolated Supabase client
export function createTenantClient(tenantId: string) {
  const supabase = createClient()
  
  // Add RLS context for tenant isolation
  return {
    ...supabase,
    from: (table: string) => {
      const query = supabase.from(table)
      // Add tenant_id filter for all queries (if table has tenant_id column)
      if (tableHasTenantId(table)) {
        return (query as any).eq('tenant_id', tenantId)
      }
      return query
    }
  }
}

// Check if table has tenant_id column (you might want to maintain this list or check schema)
function tableHasTenantId(table: string): boolean {
  const tenantTables = [
    'report_templates',
    'ai_predictions',
    'analytics_events',
    'warehouses',
    'inventory_transfers',
    'channels',
    'notification_templates',
    'budgets',
    'tax_rules',
    'api_keys',
    'integrations',
    'webhook_subscriptions',
    'audit_logs',
    'retention_policies'
  ]
  return tenantTables.includes(table)
}

// Permission checker
export function hasPermission(context: TenantContext, permission: string): boolean {
  // Admin role has all permissions
  if (context.userRole === 'admin') {
    return true
  }
  
  // Check specific permissions
  return context.userPermissions.includes(permission)
}

// Role checker
export function hasRole(context: TenantContext, role: string): boolean {
  const roleHierarchy = {
    'viewer': 0,
    'user': 1,
    'manager': 2,
    'admin': 3
  }
  
  const userLevel = roleHierarchy[context.userRole as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0
  
  return userLevel >= requiredLevel
}

// Tenant limits checker
export async function checkTenantLimits(context: TenantContext): Promise<boolean> {
  try {
    const limits = await tenantService.checkTenantLimits(context.tenantId)
    return limits.within_user_limit && limits.within_storage_limit && limits.within_api_limit
  } catch (error) {
    console.error('Error checking tenant limits:', error)
    return false
  }
}

// Feature availability checker
export function hasFeature(context: TenantContext, feature: string): boolean {
  return tenantService.hasFeature(context.tenant as any, feature)
}