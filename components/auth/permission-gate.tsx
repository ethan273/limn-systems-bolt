'use client'

import React from 'react'
import { usePermissions } from '@/hooks/use-permissions'
import { Permission, UserRole } from '@/lib/permissions/rbac'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ShieldX, Loader2 } from 'lucide-react'

interface PermissionGateProps {
  children: React.ReactNode
  permissions?: Permission[]
  roles?: UserRole[]
  requireAll?: boolean
  fallback?: React.ReactNode
  showError?: boolean
  errorMessage?: string
}

export function PermissionGate({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback,
  showError = true,
  errorMessage = "You don't have permission to access this feature."
}: PermissionGateProps) {
  const { 
    loading, 
    hasAnyPermission, 
    hasAllPermissions, 
    hasRole,
    userContext 
  } = usePermissions()

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading permissions...</span>
      </div>
    )
  }

  // Check if user is authenticated
  if (!userContext) {
    if (fallback) return <>{fallback}</>
    if (!showError) return null
    
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <ShieldX className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          Please sign in to access this feature.
        </AlertDescription>
      </Alert>
    )
  }

  // Check if user account is active
  if (!userContext.isActive) {
    if (fallback) return <>{fallback}</>
    if (!showError) return null
    
    return (
      <Alert className="border-red-200 bg-red-50">
        <ShieldX className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Your account is currently disabled. Please contact an administrator.
        </AlertDescription>
      </Alert>
    )
  }

  // Check role-based access
  if (roles.length > 0 && !hasRole(roles)) {
    if (fallback) return <>{fallback}</>
    if (!showError) return null
    
    return (
      <Alert className="border-red-200 bg-red-50">
        <ShieldX className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {errorMessage}
        </AlertDescription>
      </Alert>
    )
  }

  // Check permission-based access
  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)

    if (!hasAccess) {
      if (fallback) return <>{fallback}</>
      if (!showError) return null
      
      return (
        <Alert className="border-red-200 bg-red-50">
          <ShieldX className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )
    }
  }

  // User has required permissions, render children
  return <>{children}</>
}

// Specialized permission components
export function AdminOnly({ 
  children, 
  fallback,
  showError = true 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode
  showError?: boolean
}) {
  return (
    <PermissionGate
      roles={['super_admin', 'admin']}
      fallback={fallback}
      showError={showError}
      errorMessage="Administrator access required."
    >
      {children}
    </PermissionGate>
  )
}

export function ManagerOnly({ 
  children, 
  fallback,
  showError = true 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode
  showError?: boolean
}) {
  return (
    <PermissionGate
      roles={['super_admin', 'admin', 'manager']}
      fallback={fallback}
      showError={showError}
      errorMessage="Manager access required."
    >
      {children}
    </PermissionGate>
  )
}

export function FinanceAccess({ 
  children, 
  fallback,
  showError = true,
  sensitive = false
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode
  showError?: boolean
  sensitive?: boolean
}) {
  const permissions = sensitive 
    ? (['finance.view_sensitive'] as Permission[])
    : (['finance.read'] as Permission[])

  return (
    <PermissionGate
      permissions={permissions}
      fallback={fallback}
      showError={showError}
      errorMessage={sensitive ? "Sensitive financial data access required." : "Finance access required."}
    >
      {children}
    </PermissionGate>
  )
}

export function ProductionAccess({ 
  children, 
  fallback,
  showError = true 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode
  showError?: boolean
}) {
  return (
    <PermissionGate
      permissions={['production.read']}
      fallback={fallback}
      showError={showError}
      errorMessage="Production access required."
    >
      {children}
    </PermissionGate>
  )
}

// Higher-order component for protecting entire pages
export function withPermissions<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermissions: Permission[] = [],
  requiredRoles: UserRole[] = [],
  requireAll = false
) {
  const PermissionProtectedComponent = (props: P) => {
    return (
      <PermissionGate
        permissions={requiredPermissions}
        roles={requiredRoles}
        requireAll={requireAll}
        showError={true}
      >
        <WrappedComponent {...props} />
      </PermissionGate>
    )
  }

  PermissionProtectedComponent.displayName = `withPermissions(${WrappedComponent.displayName || WrappedComponent.name})`

  return PermissionProtectedComponent
}

// Conditional rendering based on permissions
export function ConditionalRender({
  condition,
  children,
  fallback
}: {
  condition: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return condition ? <>{children}</> : <>{fallback}</>
}

// Button with permission checking
export function PermissionButton({
  permissions = [],
  roles = [],
  requireAll = false,
  children,
  fallback,
  disabled,
  ...buttonProps
}: {
  permissions?: Permission[]
  roles?: UserRole[]
  requireAll?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  disabled?: boolean
} & React.ComponentProps<typeof Button>) {
  const { hasAnyPermission, hasAllPermissions, hasRole } = usePermissions()

  // Check permissions
  let hasAccess = true
  
  if (roles.length > 0) {
    hasAccess = hasRole(roles)
  }
  
  if (permissions.length > 0 && hasAccess) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null
  }

  return (
    <Button disabled={disabled} {...buttonProps}>
      {children}
    </Button>
  )
}