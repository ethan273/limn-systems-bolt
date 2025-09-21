'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PortalAccessResult {
  hasAccess: boolean | null
  loading: boolean
  customer: {
    id: string
    email: string
    first_name: string
    last_name: string
    company_name?: string
    portal_access: boolean
    last_portal_login?: string
  } | null
  error: string | null
  checkAccess: () => Promise<void>
}

export function usePortalAccess(): PortalAccessResult {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<{
    id: string
    email: string
    first_name: string
    last_name: string
    company_name?: string
    portal_access: boolean
    last_portal_login?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const checkAccess = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }

      if (!session?.user) {
        setHasAccess(false)
        setCustomer(null)
        return
      }

      const userEmail = session.user.email

      // Check if user is employee (should not use portal)
      if (userEmail?.endsWith('@limn.us.com')) {
        setHasAccess(false)
        setError('Employees cannot access the customer portal')
        return
      }

      // Check customer portal access
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select(`
          id,
          email,
          first_name,
          last_name,
          company_name,
          portal_access,
          last_portal_login
        `)
        .eq('email', userEmail)
        .single()

      if (customerError) {
        if (customerError.code === 'PGRST116') {
          // Customer not found
          setHasAccess(false)
          setError('Customer account not found. Please contact support.')
        } else {
          throw customerError
        }
        return
      }

      setCustomer(customerData)
      
      if (!customerData.portal_access) {
        setHasAccess(false)
        setError('Portal access not granted. Contact support for assistance.')
        return
      }

      setHasAccess(true)
    } catch (err: unknown) {
      console.error('Portal access check error:', err)
      setError(err instanceof Error ? err.message : 'Failed to check portal access')
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    checkAccess()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setHasAccess(false)
        setCustomer(null)
        setError(null)
        router.push('/auth')
      } else if (event === 'SIGNED_IN') {
        checkAccess()
      }
    })

    return () => subscription.unsubscribe()
  }, [router, checkAccess, supabase.auth])

  return {
    hasAccess,
    loading,
    customer,
    error,
    checkAccess
  }
}

export default usePortalAccess