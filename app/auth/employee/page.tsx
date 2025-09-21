'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function EmployeeLoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const checkForOAuthErrors = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const oauthError = urlParams.get('error')
    const errorDetails = urlParams.get('details')
    
    if (oauthError) {
      console.error('OAuth error from URL:', { oauthError, errorDetails })
      const errorMessage = errorDetails ? 
        `OAuth Error: ${oauthError} - ${decodeURIComponent(errorDetails)}` :
        `OAuth Error: ${oauthError}`
      setError(errorMessage)
    }
  }

  const checkExistingSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Check if user email is from limn.us.com domain
        const userEmail = session.user.email
        if (userEmail?.endsWith('@limn.us.com')) {
          router.push('/dashboard')
        } else {
          await supabase.auth.signOut()
          setError('Employee access requires a @limn.us.com email address')
        }
      }
    } catch (error) {
      console.error('Session check error:', error)
      // Don't show error to user, just continue - Supabase connection issues
      // The page should still render for login
    }
  }, [router, supabase])

  useEffect(() => {
    checkExistingSession()
    checkForOAuthErrors()
  }, [checkExistingSession])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('Starting Google OAuth flow...')
      console.log('Redirect URL will be:', `${window.location.origin}/auth/callback?type=employee`)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?type=employee`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: 'limn.us.com', // Restrict to company domain
          },
          // Simplified scopes to avoid metadata conflicts
          scopes: 'openid email profile',
        },
      })

      console.log('OAuth response:', { data, error })

      if (error) {
        console.error('OAuth initiation error:', error)
        throw error
      }

      console.log('OAuth flow initiated successfully, should redirect to Google...')
      // OAuth redirect will handle the rest - if we reach here without redirect, there's an issue
      
    } catch (error: unknown) {
      console.error('Google OAuth error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('fetch failed')) {
        setError('Connection to authentication service failed. Please check your internet connection and try again.')
      } else {
        setError(`Google OAuth failed: ${errorMessage}. Check if Google OAuth is configured in your Supabase dashboard.`)
      }
      setLoading(false)
    }
  }



  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-lg px-8 py-10">
          <div className="mb-8">
            <Link 
              href="/auth" 
              className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login options
            </Link>
            
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <Logo width={120} height={52} />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">
                Employee Login
              </h1>
              <p className="text-slate-600 mt-2">
                Sign in with your @limn.us.com Google account
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Authentication Error
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-700 mr-2"></div>
                  Connecting to Google...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </div>
              )}
            </button>


            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">
                    Employee access only
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Employee Access Required
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      This login is restricted to Limn Systems employees with @limn.us.com email addresses.
                      If you&apos;re a contractor or customer, please use the appropriate login option.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Having trouble signing in?{' '}
              <a 
                href="mailto:it@limnsystems.com" 
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Contact IT Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}