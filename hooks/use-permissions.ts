'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole, Permission, UserContext } from '@/lib/permissions/rbac'
import { ROLE_PERMISSIONS, hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions/rbac'

export function usePermissions() {
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserContext = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          setUserContext(null)
          return
        }

        const userRole: UserRole = user.user_metadata?.role || 'viewer'
        const isActive = user.user_metadata?.is_active !== false

        const context: UserContext = {
          id: user.id,
          email: user.email || '',
          role: userRole,
          permissions: ROLE_PERMISSIONS[userRole] || [],
          departmentId: user.user_metadata?.department_id,
          isActive
        }

        setUserContext(context)
      } catch (err) {
        console.error('Failed to fetch user permissions:', err)
        setError('Failed to load user permissions')
        setUserContext(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserContext()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserContext()
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Permission check functions
  const checkPermission = (permission: Permission): boolean => {
    if (!userContext || !userContext.isActive) return false
    return hasPermission(userContext.role, permission)
  }

  const checkAnyPermission = (permissions: Permission[]): boolean => {
    if (!userContext || !userContext.isActive) return false
    return hasAnyPermission(userContext.role, permissions)
  }

  const checkAllPermissions = (permissions: Permission[]): boolean => {
    if (!userContext || !userContext.isActive) return false
    return hasAllPermissions(userContext.role, permissions)
  }

  const checkRole = (roles: UserRole | UserRole[]): boolean => {
    if (!userContext || !userContext.isActive) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(userContext.role)
  }

  const isAdmin = (): boolean => {
    return checkRole(['super_admin', 'admin'])
  }

  const isSuperAdmin = (): boolean => {
    return checkRole('super_admin')
  }

  const canManageUsers = (): boolean => {
    return checkPermission('users.manage_roles')
  }

  const canViewSensitiveFinancials = (): boolean => {
    return checkPermission('finance.view_sensitive')
  }

  const canApprovePayments = (): boolean => {
    return checkPermission('finance.approve_payments')
  }

  const canManageSystem = (): boolean => {
    return checkAnyPermission(['system.configure', 'system.backup', 'system.audit'])
  }

  return {
    userContext,
    loading,
    error,
    
    // Permission checks
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    hasRole: checkRole,
    
    // Convenience methods
    isAdmin,
    isSuperAdmin,
    canManageUsers,
    canViewSensitiveFinancials,
    canApprovePayments,
    canManageSystem,
    
    // User info
    userId: userContext?.id,
    userEmail: userContext?.email,
    userRole: userContext?.role,
    isActive: userContext?.isActive,
    departmentId: userContext?.departmentId
  }
}