'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function ContractorLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const checkExistingSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const userEmail = session.user.email
        // Redirect contractors to dashboard (not portal)
        if (userEmail && !userEmail.endsWith('@limn.us.com')) {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Session check error:', error)
    }
  }, [supabase, router])

  useEffect(() => {
    checkExistingSession()
  }, [checkExistingSession])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Prevent @limn.us.com emails from using contractor login
      if (email.endsWith('@limn.us.com')) {
        throw new Error('Limn Systems employees must use the Employee Login with Google SSO')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Verify user exists in contractors table or has appropriate permissions
      if (data.user) {
        // Verify contractor access
        const { data: contractorData, error: contractorError } = await supabase
          .from('contractors')
          .select('id, status, verification_status')
          .eq('email', email)
          .single()

        if (contractorError || !contractorData) {
          // Create pending contractor record if doesn't exist
          const { error: insertError } = await supabase
            .from('contractors')
            .insert({
              email,
              name: data.user.user_metadata?.full_name || email.split('@')[0],
              status: 'pending_verification',
              verification_status: 'pending',
              created_at: new Date().toISOString()
            })

          if (insertError) {
            // Error creating contractor record - will be handled by the pending verification error
          }

          throw new Error('Your contractor account is pending verification. Please contact contracts@limnsystems.com to complete your account setup.')
        }

        // Check contractor status
        if (contractorData.status !== 'active') {
          throw new Error(`Your contractor account is ${contractorData.status}. Please contact contracts@limnsystems.com for assistance.`)
        }

        if (contractorData.verification_status !== 'verified') {
          throw new Error('Your contractor account verification is pending. Please contact contracts@limnsystems.com to complete verification.')
        }

        // Contractor login successful
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setMessage('Password reset email sent! Check your inbox.')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to send reset email')
    } finally {
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
                Contractor Login
              </h1>
              <p className="text-slate-600 mt-2">
                Sign in to access your contractor dashboard
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                {error}
              </div>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="contractor@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-green-600 hover:text-green-500 font-medium"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  Need access?
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Don&apos;t have a contractor account?{' '}
              <a 
                href="mailto:contracts@limnsystems.com" 
                className="text-green-600 hover:text-green-500 font-medium"
              >
                Contact us to get started
              </a>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Having trouble signing in?{' '}
              <a 
                href="mailto:support@limnsystems.com" 
                className="text-green-600 hover:text-green-500 font-medium"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}