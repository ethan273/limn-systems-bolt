'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const logout = async () => {
      const supabase = createClient()
      
      console.log('🔓 Logging out user...')
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear any additional storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      console.log('✅ Logout complete, redirecting to auth')
      
      // Redirect to auth page
      router.push('/auth')
    }

    logout()
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Logging out...</p>
      </div>
    </div>
  )
}