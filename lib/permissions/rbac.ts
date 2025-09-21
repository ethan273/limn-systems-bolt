import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Define comprehensive user roles
export type UserRole = 
  | 'super_admin'    // Full system access
  | 'admin'          // Company administration
  | 'manager'        // Department management
  | 'lead'           // Team leadership
  | 'employee'       // General employee access
  | 'contractor'     // Limited contractor access
  | 'client'         // Client portal access
  | 'viewer'         // Read-only access

// Define granular permissions
export type Permission =
  // User & Account Management
  | 'users.create'
  | 'users.read'
  | 'users.update'
  | 'users.delete'
  | 'users.manage_roles'
  
  // Customer Management
  | 'customers.create'
  | 'customers.read'
  | 'customers.update'
  | 'customers.delete'
  | 'customers.write'
  | 'customers.export'
  
  // Financial Operations
  | 'finance.read'
  | 'finance.create'
  | 'finance.update'
  | 'finance.delete'
  | 'finance.approve_payments'
  | 'finance.view_sensitive'
  
  // Order Management
  | 'orders.create'
  | 'orders.read'
  | 'orders.update'
  | 'orders.delete'
  | 'orders.write'
  | 'orders.approve'
  | 'orders.ship'
  
  // Product & Inventory
  | 'products.create'
  | 'products.read'
  | 'products.update'
  | 'products.write'
  | 'products.delete'
  | 'inventory.manage'

  // Materials Management
  | 'materials.create'
  | 'materials.read'
  | 'materials.update'
  | 'materials.write'
  | 'materials.delete'

  // Contracts & Legal
  | 'contracts.create'
  | 'contracts.read'
  | 'contracts.update'
  | 'contracts.write'
  | 'contracts.delete'
  
  // Project Management
  | 'projects.create'
  | 'projects.read'
  | 'projects.update'
  | 'projects.delete'
  | 'projects.write'
  | 'projects.manage'
  
  // Manufacturing & Production
  | 'production.read'
  | 'production.update'
  | 'production.write'
  | 'production.manage'
  | 'shop_drawings.approve'
  
  // Design & Engineering
  | 'design.create'
  | 'design.read'
  | 'design.update'
  | 'design.write'
  | 'design.approve'
  
  // Reports & Analytics
  | 'reports.read'
  | 'reports.create'
  | 'reports.export'
  | 'analytics.view_all'
  
  // Portal Management
  | 'portal.create'
  | 'portal.read'
  | 'portal.update'
  | 'portal.delete'
  
  // System Administration
  | 'system.configure'
  | 'system.backup'
  | 'system.audit'
  | 'system.integrations'
  
  // Admin Operations
  | 'admin.gdpr.read'
  | 'admin.gdpr.manage'
  | 'admin.cache.read'
  | 'admin.cache.manage'
  | 'admin.security.read'
  | 'admin.security.scan'

// Role-Permission Matrix
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    // Full access to everything
    'users.create', 'users.read', 'users.update', 'users.delete', 'users.manage_roles',
    'customers.create', 'customers.read', 'customers.update', 'customers.delete', 'customers.write', 'customers.export',
    'finance.read', 'finance.create', 'finance.update', 'finance.delete', 'finance.approve_payments', 'finance.view_sensitive',
    'orders.create', 'orders.read', 'orders.update', 'orders.delete', 'orders.write', 'orders.approve', 'orders.ship',
    'products.create', 'products.read', 'products.update', 'products.write', 'products.delete', 'inventory.manage',
    'projects.create', 'projects.read', 'projects.update', 'projects.write', 'projects.delete', 'projects.manage',
    'production.read', 'production.update', 'production.manage', 'shop_drawings.approve',
    'design.create', 'design.read', 'design.update', 'design.approve',
    'reports.read', 'reports.create', 'reports.export', 'analytics.view_all',
    'system.configure', 'system.backup', 'system.audit', 'system.integrations',
    'admin.gdpr.read', 'admin.gdpr.manage', 'admin.cache.read', 'admin.cache.manage',
    'admin.security.read', 'admin.security.scan'
  ],
  
  admin: [
    // Administrative access excluding super admin functions
    'users.create', 'users.read', 'users.update', 'users.manage_roles',
    'customers.create', 'customers.read', 'customers.update', 'customers.delete', 'customers.write', 'customers.export',
    'finance.read', 'finance.create', 'finance.update', 'finance.approve_payments', 'finance.view_sensitive',
    'orders.create', 'orders.read', 'orders.update', 'orders.delete', 'orders.write', 'orders.approve', 'orders.ship',
    'products.create', 'products.read', 'products.update', 'products.write', 'products.delete', 'inventory.manage',
    'projects.create', 'projects.read', 'projects.update', 'projects.write', 'projects.delete', 'projects.manage',
    'production.read', 'production.update', 'production.manage', 'shop_drawings.approve',
    'design.create', 'design.read', 'design.update', 'design.approve',
    'reports.read', 'reports.create', 'reports.export', 'analytics.view_all',
    'system.configure', 'system.integrations',
    'admin.gdpr.read', 'admin.gdpr.manage', 'admin.cache.read', 'admin.cache.manage',
    'admin.security.read', 'admin.security.scan'
  ],
  
  manager: [
    // Department management access
    'users.read', 'users.update',
    'customers.create', 'customers.read', 'customers.update', 'customers.write', 'customers.export',
    'finance.read', 'finance.create', 'finance.update', 'finance.view_sensitive',
    'orders.create', 'orders.read', 'orders.update', 'orders.write', 'orders.approve', 'orders.ship',
    'products.create', 'products.read', 'products.update', 'products.write', 'inventory.manage',
    'projects.create', 'projects.read', 'projects.update', 'projects.write', 'projects.manage',
    'production.read', 'production.update', 'production.manage', 'shop_drawings.approve',
    'design.create', 'design.read', 'design.update', 'design.approve',
    'reports.read', 'reports.create', 'reports.export', 'analytics.view_all'
  ],
  
  lead: [
    // Team leadership access
    'users.read',
    'customers.read', 'customers.update',
    'finance.read', 'finance.create', 'finance.update',
    'orders.create', 'orders.read', 'orders.update', 'orders.ship',
    'products.read', 'products.update', 'inventory.manage',
    'projects.create', 'projects.read', 'projects.update',
    'production.read', 'production.update',
    'design.create', 'design.read', 'design.update',
    'reports.read', 'reports.create'
  ],
  
  employee: [
    // Standard employee access
    'customers.read', 'customers.update',
    'finance.read', 'finance.create',
    'orders.create', 'orders.read', 'orders.update',
    'products.read', 'products.update',
    'projects.read', 'projects.update',
    'production.read', 'production.update',
    'design.create', 'design.read', 'design.update',
    'reports.read'
  ],
  
  contractor: [
    // Limited contractor access
    'customers.read',
    'orders.read',
    'products.read',
    'projects.read',
    'production.read',
    'design.read',
    'reports.read'
  ],
  
  client: [
    // Client portal access
    'orders.read',
    'projects.read',
    'reports.read'
  ],
  
  viewer: [
    // Read-only access
    'customers.read',
    'orders.read',
    'products.read',
    'projects.read',
    'reports.read'
  ]
}

// Permission check functions
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

// User context interface
export interface UserContext {
  id: string
  email: string
  role: UserRole
  permissions: Permission[]
  departmentId?: string
  isActive: boolean
}

// Get user context from request
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getUserContext(_request?: NextRequest): Promise<UserContext | null> {
  try {
    console.log('getUserContext: Creating Supabase client...')
    const supabase = await createServerSupabaseClient()
    console.log('getUserContext: Getting user from Supabase...')
    const { data: { user }, error } = await supabase.auth.getUser()
    console.log('getUserContext: Supabase auth result - user:', !!user, 'error:', error?.message)
    
    if (error || !user) {
      console.log('getUserContext: No user found, returning null')
      return null
    }
    
    // Get user role from user metadata or database
    // Grant super admin privileges to company owner
    let userRole: UserRole = user.user_metadata?.role || 'viewer'
    if (user.email === 'ethan@limn.us.com') {
      userRole = 'super_admin'
    }
    const isActive = user.user_metadata?.is_active !== false
    
    return {
      id: user.id,
      email: user.email || '',
      role: userRole,
      permissions: ROLE_PERMISSIONS[userRole] || [],
      departmentId: user.user_metadata?.department_id,
      isActive
    }
  } catch (error) {
    console.error('Failed to get user context:', error)
    return null
  }
}

// Enhanced permission validation middleware
export async function requirePermissions(
  request: NextRequest,
  requiredPermissions: Permission[],
  options: {
    requireAll?: boolean
    allowedRoles?: UserRole[]
    enforceActive?: boolean
  } = {}
): Promise<{ valid: boolean; user?: UserContext; error?: string; statusCode?: number }> {
  try {
    const user = await getUserContext(request)
    
    if (!user) {
      return { 
        valid: false, 
        error: 'Authentication required', 
        statusCode: 401 
      }
    }
    
    // Check if user is active
    if (options.enforceActive !== false && !user.isActive) {
      return { 
        valid: false, 
        error: 'Account is disabled', 
        statusCode: 403 
      }
    }
    
    // Check if user role is explicitly allowed
    if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
      return { 
        valid: false, 
        error: 'Insufficient role privileges', 
        statusCode: 403 
      }
    }
    
    // Check permissions
    const hasRequiredPermissions = options.requireAll 
      ? hasAllPermissions(user.role, requiredPermissions)
      : hasAnyPermission(user.role, requiredPermissions)
    
    if (!hasRequiredPermissions) {
      return { 
        valid: false, 
        error: 'Insufficient permissions', 
        statusCode: 403 
      }
    }
    
    return { valid: true, user }
    
  } catch (error) {
    console.error('Permission validation error:', error)
    return { 
      valid: false, 
      error: 'Internal server error', 
      statusCode: 500 
    }
  }
}

// Page-level permission requirements
export const PAGE_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard': ['customers.read'], // Basic dashboard access
  
  // Customer Management
  '/dashboard/customers': ['customers.read'],
  '/dashboard/clients': ['customers.read'],
  '/dashboard/contacts': ['customers.read'],
  '/dashboard/leads': ['customers.read'],
  '/dashboard/crm': ['customers.read'],
  
  // Financial Management
  '/dashboard/payments': ['finance.read'],
  '/dashboard/ar-aging': ['finance.read', 'finance.view_sensitive'],
  '/dashboard/finance': ['finance.read'],
  '/dashboard/budgets': ['finance.read'],
  '/dashboard/collections': ['finance.read'],
  '/dashboard/invoices': ['finance.read'],
  
  // Order Management
  '/dashboard/orders': ['orders.read'],
  '/dashboard/contracts': ['orders.read'],
  '/dashboard/pipeline': ['orders.read'],
  
  // Product & Inventory
  '/dashboard/products': ['products.read'],
  '/dashboard/items': ['products.read'],
  '/dashboard/materials': ['products.read'],
  
  // Project Management
  '/dashboard/projects': ['projects.read'],
  '/dashboard/design-projects': ['design.read'],
  '/dashboard/design-briefs': ['design.read'],
  
  // Manufacturing & Production
  '/dashboard/production': ['production.read'],
  '/dashboard/manufacturers': ['production.read'],
  '/dashboard/shop-drawings': ['production.read'],
  '/dashboard/qc-tracking': ['production.read'],
  
  // Shipping & Logistics
  '/dashboard/shipping': ['orders.read'],
  '/dashboard/shipping-quotes': ['orders.read'],
  '/dashboard/shipping-management': ['orders.read'],
  
  // Analytics & Reports
  '/dashboard/analytics': ['reports.read'],
  '/dashboard/reports': ['reports.read'],
  
  // Administration
  '/dashboard/settings': ['users.read'],
  '/dashboard/admin': ['system.configure'],
  
  // Team Management
  '/dashboard/workflows': ['projects.read'],
  '/dashboard/tasks': ['projects.read'],
  '/dashboard/my-tasks': ['projects.read']
}

// Get required permissions for a page
export function getPagePermissions(pathname: string): Permission[] {
  // Try exact match first
  if (PAGE_PERMISSIONS[pathname]) {
    return PAGE_PERMISSIONS[pathname]
  }
  
  // Try pattern matching for dynamic routes
  for (const [pattern, permissions] of Object.entries(PAGE_PERMISSIONS)) {
    if (pathname.startsWith(pattern + '/')) {
      return permissions
    }
  }
  
  // Default to basic dashboard access
  return ['customers.read']
}

// Create permission-aware API response
export function createPermissionResponse(
  valid: boolean,
  message: string,
  statusCode: number = 403,
  data?: unknown
): NextResponse {
  return NextResponse.json({
    success: valid,
    message,
    data,
    timestamp: new Date().toISOString()
  }, { status: statusCode })
}

// Resource-level permissions for data filtering
export function canAccessResource(
  user: UserContext,
  resourceType: string,
  resourceData: Record<string, unknown>
): boolean {
  // Super admin and admin can access everything
  if (['super_admin', 'admin'].includes(user.role)) {
    return true
  }
  
  // Department-based access control
  if (user.departmentId && resourceData.department_id) {
    return user.departmentId === resourceData.department_id
  }
  
  // User can access their own resources
  if (resourceData.created_by === user.id || resourceData.assigned_to === user.id) {
    return true
  }
  
  // Additional resource-specific logic can be added here
  return false
}