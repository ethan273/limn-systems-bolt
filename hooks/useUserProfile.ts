'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  email: string
  given_name?: string
  family_name?: string
  name?: string
  department?: string
  job_title?: string
  user_type?: 'employee' | 'contractor' | 'customer'
  is_employee?: boolean
  last_login?: string
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }

      if (!session?.user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const user = session.user
      const metadata = user.user_metadata || {}

      // Extract SAML attributes and create user profile
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email!,
        given_name: metadata.given_name || metadata.first_name,
        family_name: metadata.family_name || metadata.last_name,
        name: metadata.name || metadata.full_name || 
              (metadata.given_name && metadata.family_name 
                ? `${metadata.given_name} ${metadata.family_name}` 
                : undefined),
        department: metadata.department,
        job_title: metadata.job_title,
        user_type: metadata.user_type || (user.email?.endsWith('@limn.us.com') ? 'employee' : 'contractor'),
        is_employee: metadata.is_employee || user.email?.endsWith('@limn.us.com'),
        last_login: metadata.last_login
      }

      setProfile(userProfile)
    } catch (error: unknown) {
      console.error('Error fetching user profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = () => {
    setLoading(true)
    setError(null)
    fetchUserProfile()
  }

  const getDisplayName = (): string => {
    if (profile?.name) return profile.name
    if (profile?.given_name && profile?.family_name) {
      return `${profile.given_name} ${profile.family_name}`
    }
    if (profile?.given_name) return profile.given_name
    return profile?.email?.split('@')[0] || 'User'
  }

  const getInitials = (): string => {
    if (profile?.given_name && profile?.family_name) {
      return `${profile.given_name[0]}${profile.family_name[0]}`.toUpperCase()
    }
    if (profile?.name) {
      const names = profile.name.split(' ')
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0].substring(0, 2).toUpperCase()
    }
    return profile?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  const isEmployee = (): boolean => {
    return profile?.is_employee === true || profile?.email?.endsWith('@limn.us.com') === true
  }

  const isAdmin = (): boolean => {
    if (!profile) return false
    return (
      profile.email?.includes('admin') === true ||
      profile.email === 'ethan@limn.us.com' ||
      profile.department === 'IT' ||
      profile.department === 'Management' ||
      profile.job_title?.toLowerCase().includes('admin') === true ||
      profile.job_title?.toLowerCase().includes('manager') === true
    )
  }

  const hasRole = (role: string): boolean => {
    if (!profile) return false
    return (
      profile.job_title?.toLowerCase().includes(role.toLowerCase()) === true ||
      profile.department?.toLowerCase() === role.toLowerCase()
    )
  }

  return {
    profile,
    loading,
    error,
    refreshProfile,
    getDisplayName,
    getInitials,
    isEmployee,
    isAdmin,
    hasRole
  }
}