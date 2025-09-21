'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if this is a valid reset session
    const checkResetSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          // Invalid reset session, redirect to auth page
          router.push('/auth?error=invalid_reset_session')
        }
      } catch {
        // Reset session check error
        router.push('/auth?error=reset_session_error')
      }
    }

    checkResetSession()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate passwords
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      
      // Redirect after successful reset
      setTimeout(() => {
        router.push('/auth?message=password_reset_success')
      }, 2000)

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white shadow-lg rounded-lg px-8 py-10 text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Password Updated Successfully
            </h1>
            <p className="text-slate-600 mb-6">
              Your password has been updated. You&apos;ll be redirected to login shortly.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
          </div>
        </div>
      </div>
    )
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
              Back to login
            </Link>
            
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <Logo width={120} height={52} />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">
                Reset Your Password
              </h1>
              <p className="text-slate-600 mt-2">
                Enter your new password below
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                  minLength={8}
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
              <p className="mt-1 text-xs text-slate-600">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || password !== confirmPassword}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Password...
                </div>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Need help?{' '}
              <a 
                href="mailto:support@limnsystems.com" 
                className="text-blue-600 hover:text-blue-500 font-medium"
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white shadow-lg rounded-lg px-8 py-10 text-center">
            <div className="mb-6 flex justify-center">
              <Logo width={120} height={52} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Loading...
            </h1>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}