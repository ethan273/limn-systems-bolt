'use client'

import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export default function AuthTestPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Get current session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Current session:', session)
      setSession(session)
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session)
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <div className="mb-4">
        <strong>Session Status:</strong> {session ? 'Authenticated' : 'Not authenticated'}
      </div>

      {session && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">User Details:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify({
              id: session.user?.id,
              email: session.user?.email,
              email_confirmed_at: session.user?.email_confirmed_at,
              user_metadata: session.user?.user_metadata,
              app_metadata: session.user?.app_metadata,
            }, null, 2)}
          </pre>
        </div>
      )}

      <div className="space-x-4">
        <a href="/auth" className="bg-blue-500 text-white px-4 py-2 rounded inline-block">
          Go to Auth
        </a>
        <a href="/dashboard" className="bg-green-500 text-white px-4 py-2 rounded inline-block">
          Go to Dashboard
        </a>
        <a href="/portal" className="bg-purple-500 text-white px-4 py-2 rounded inline-block">
          Go to Portal
        </a>
        {session && (
          <button onClick={signOut} className="bg-red-500 text-white px-4 py-2 rounded">
            Sign Out
          </button>
        )}
      </div>
    </div>
  )
}