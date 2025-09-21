'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function PortalResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Handle the password reset token from URL
    const handlePasswordReset = async () => {
      try {
        // Get the session from the URL parameters (access_token, refresh_token)
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setError('Invalid or expired reset link. Please request a new password reset.')
          setValidatingToken(false)
          return
        }

        if (!data.session) {
          setError('Invalid or expired reset link. Please request a new password reset.')
          setValidatingToken(false)
          return
        }

        // Token is valid, show the reset form
        setValidatingToken(false)
      } catch (error) {
        console.error('Password reset validation error:', error)
        setError('An error occurred validating the reset link.')
        setValidatingToken(false)
      }
    }

    handlePasswordReset()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

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

      setIsSuccess(true)
      setMessage('Password updated successfully! You can now sign in with your new password.')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/portal/login')
      }, 3000)

    } catch (error: unknown) {
      setError((error as { message?: string }).message || 'An error occurred updating your password')
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white shadow-lg rounded-lg px-8 py-10">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <Logo width={120} height={52} />
              </div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#91bdbd] mx-auto mb-4"></div>
              <p className="text-gray-600">Validating reset link...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white shadow-lg rounded-lg px-8 py-10">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <Logo width={120} height={52} />
              </div>
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-[#4b4949] mb-4">
                Password Reset Complete
              </h1>
              <p className="text-gray-700 mb-6">
                Your password has been successfully updated. You&apos;ll be redirected to the login page shortly.
              </p>
              <Link
                href="/portal/login"
                className="inline-flex items-center px-4 py-2 bg-[#91bdbd] hover:bg-[#7da9a9] text-white font-medium rounded-lg transition-colors"
              >
                Sign In Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-lg px-8 py-10">
          <div className="mb-8">
            <Link 
              href="/portal/login" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Link>
            
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <Logo width={120} height={52} />
              </div>
              <h1 className="text-3xl font-bold text-[#4b4949]">
                Reset Your Password
              </h1>
              <p className="text-gray-700 mt-2">
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
              <div className="mt-3">
                <Link
                  href="/portal/login"
                  className="text-[#91bdbd] hover:text-[#7da9a9] font-medium underline"
                >
                  Request a new password reset
                </Link>
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
              <label htmlFor="password" className="block text-sm font-medium text-[#4b4949] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  required
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#4b4949] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
              disabled={loading}
              className="w-full py-2 px-4 bg-[#91bdbd] hover:bg-[#7da9a9] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Need help?{' '}
              <a 
                href="mailto:support@limnsystems.com" 
                className="text-[#91bdbd] hover:text-[#7da9a9] font-medium"
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