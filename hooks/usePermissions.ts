'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { safeGet } from '@/lib/utils/bulk-type-fixes'

export interface UserPermissions {
  production?: {
    view: boolean
    edit: boolean
  }
  shipping?: {
    view: boolean
    edit: boolean
  }
  inventory?: {
    view: boolean
    edit: boolean
  }
  reports?: {
    view: boolean
    edit: boolean
  }
  manufacturers?: {
    view: boolean
    edit: boolean
  }
  admin?: {
    view: boolean
    edit: boolean
  }
  design_team?: {
    view: boolean
    edit: boolean
  }
  production_team?: {
    view: boolean
    edit: boolean
  }
  sales_team?: {
    view: boolean
    edit: boolean
  }
}

function getDefaultPermissions(email: string, userMetadata: Record<string, unknown> = {}): UserPermissions {
  const isEmployee = email?.endsWith('@limn.us.com')
  const isAdmin = email?.includes('admin') || 
                 email === 'ethan@limn.us.com' ||
                 String(userMetadata.role) === 'admin' ||
                 String(String(userMetadata.department)) === 'IT' ||
                 String(String(userMetadata.department)) === 'Management' ||
                 String(safeGet(userMetadata, ['job_title']) || '').toLowerCase().includes('admin') ||
                 String(safeGet(userMetadata, ['job_title']) || '').toLowerCase().includes('manager') ||
                 userMetadata.is_employee === true

  return {
    production: {
      view: isEmployee || true,
      edit: isAdmin || (isEmployee && String(userMetadata.department) === 'Production')
    },
    shipping: {
      view: isEmployee || true,
      edit: isAdmin || (isEmployee && String(userMetadata.department) === 'Shipping')
    },
    inventory: {
      view: isEmployee || isAdmin,
      edit: isAdmin || (isEmployee && String(userMetadata.department) === 'Inventory')
    },
    reports: {
      view: isEmployee || isAdmin,
      edit: isAdmin || (isEmployee && ['Management', 'Finance'].includes(String(userMetadata.department)))
    },
    manufacturers: {
      view: isEmployee || true,
      edit: isAdmin || (isEmployee && ['Management', 'Production'].includes(String(userMetadata.department)))
    },
    admin: {
      view: isAdmin,
      edit: isAdmin
    },
    design_team: {
      view: isEmployee || true,
      edit: isAdmin || (isEmployee && ['Design', 'Creative'].includes(String(userMetadata.department)))
    },
    production_team: {
      view: isEmployee || true,
      edit: isAdmin || (isEmployee && ['Production', 'Manufacturing'].includes(String(userMetadata.department)))
    },
    sales_team: {
      view: isEmployee || true,
      edit: isAdmin || (isEmployee && ['Sales', 'Business Development'].includes(String(userMetadata.department)))
    }
  }
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, unknown> } | null>(null)

  useEffect(() => {
    fetchUserPermissions()
  }, [])

  const fetchUserPermissions = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setPermissions({})
        setLoading(false)
        return
      }

      setUser(session.user)

      // Try to fetch from user_permissions table with timeout
      const permissionsPromise = supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', session.user.id)

      // Set a 5-second timeout for the permissions query
      const timeoutPromise = new Promise<{ data: null; error: { code: 'TIMEOUT'; message: string } }>((_, reject) => 
        setTimeout(() => reject({ data: null, error: { code: 'TIMEOUT', message: 'Permissions query timed out' } }), 5000)
      )

      const { data: permissionsData, error } = await Promise.race([
        permissionsPromise,
        timeoutPromise
      ]).catch((timeoutError) => ({
        data: null,
        error: timeoutError.error || { code: 'TIMEOUT', message: 'Query timed out' }
      }))

      if (error) {
        console.log('Permissions table query result:', { error, code: error.code })
        
        // Handle specific infinite recursion error (42P17)
        if (error.code === '42P17') {
          console.warn('Infinite recursion detected in RLS policy. Using fallback permissions.')
          const fallbackPermissions = getDefaultPermissions(session.user.email || '', session.user.user_metadata || {})
          setPermissions(fallbackPermissions)
          setLoading(false)
          return
        }
        
        // Handle timeout error
        if (error.code === 'TIMEOUT') {
          console.warn('Permissions query timed out. Using fallback permissions.')
          const fallbackPermissions = getDefaultPermissions(session.user.email || '', session.user.user_metadata || {})
          setPermissions(fallbackPermissions)
          setLoading(false)
          return
        }
        
        // Handle any other database errors by using fallback permissions
        console.warn('Database permissions query failed. Using fallback permissions.', error)
        const fallbackPermissions = getDefaultPermissions(session.user.email || '', session.user.user_metadata || {})
        setPermissions(fallbackPermissions)
        setLoading(false)
        return
      }

      if (permissionsData && permissionsData.length > 0) {
        // Convert array to grouped permissions object
        const groupedPermissions: UserPermissions = {}
        
        permissionsData.forEach((perm: unknown) => {
          const permission = perm as Record<string, unknown>
          const moduleValue = String(permission.module || '')
          if (moduleValue) {
            (groupedPermissions as Record<string, unknown>)[moduleValue] = {
              view: Boolean(permission.can_view),
              edit: Boolean(permission.can_edit)
            }
          }
        })
        
        setPermissions(groupedPermissions)
      } else {
        // Fallback: Use default permissions
        const userMetadata = session.user.user_metadata || {}
        const defaultPermissions = getDefaultPermissions(session.user.email || '', userMetadata)
        setPermissions(defaultPermissions)
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error)
      
      // Final fallback
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const defaultPermissions = getDefaultPermissions(session.user.email || '', session.user.user_metadata || {})
          setPermissions(defaultPermissions)
        }
      } catch (fallbackError) {
        console.error('Error in fallback permissions:', fallbackError)
        setPermissions({
          production: { view: true, edit: false },
          shipping: { view: true, edit: false }
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const canView = (module: keyof UserPermissions): boolean => {
    return permissions[module]?.view || false
  }

  const canEdit = (module: keyof UserPermissions): boolean => {
    return permissions[module]?.edit || false
  }

  return {
    permissions,
    loading,
    user,
    canView,
    canEdit,
    refetch: fetchUserPermissions
  }
}