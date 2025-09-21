'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        console.log('Home page auth check:', { 
          hasSession: !!session, 
          userEmail: session?.user?.email,
          userId: session?.user?.id,
          currentPath: window.location.pathname
        })
        
        if (session) {
          // Route based on user email domain
          const userEmail = session.user?.email
          if (userEmail?.endsWith('@limn.us.com')) {
            console.log('Redirecting to dashboard for employee:', userEmail)
            router.push('/dashboard')
          } else {
            console.log('Redirecting to portal for non-employee:', userEmail)
            router.push('/portal')
          }
        } else {
          console.log('No session found, redirecting to auth')
          router.push('/auth')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/auth')
      }
    }

    checkAuthAndRedirect()
  }, [router])

  // Show loading screen while redirecting
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <div className="text-4xl font-bold text-slate-900 mb-2">LIMN</div>
        <div className="text-slate-600">Loading...</div>
      </div>
    </div>
  )
}