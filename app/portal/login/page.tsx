'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkExistingSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const userEmail = session.user.email
        // Check if user is customer and has portal access
        if (userEmail && !userEmail.endsWith('@limn.us.com')) {
          const { data: customer } = await supabase
            .from('customers')
            .select('portal_access')
            .eq('email', userEmail)
            .single()
          
          if (customer?.portal_access) {
            router.push('/portal')
          } else {
            setError('Portal access not granted. Contact support for assistance.')
          }
        }
      }
    } catch (error) {
      console.error('Session check error:', error)
    }
  }

  const logPortalSession = async (customerId: string, userId: string) => {
    try {
      const userAgent = navigator.userAgent
      const ipAddress = 'unknown' // Would need IP service in production
      
      await supabase
        .from('portal_sessions')
        .insert({
          customer_id: customerId,
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          started_at: new Date().toISOString(),
          activity_log: [{
            action: 'login',
            timestamp: new Date().toISOString(),
            details: { method: 'email_password' }
          }]
        })
    } catch (error) {
      console.error('Error logging portal session:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Prevent @limn.us.com emails from using customer portal
      if (email.endsWith('@limn.us.com')) {
        throw new Error('Limn Systems employees must use the Employee Login with Google SSO')
      }

      if (isSignUp) {
        // Sign up validation
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long')
        }
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error('First name and last name are required')
        }

        // Create account
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?type=customer`,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              company: company.trim(),
              user_type: 'customer'
            }
          },
        })

        if (error) throw error

        if (data?.user && !data?.user?.email_confirmed_at) {
          setMessage('Account created! Please check your email to verify your account before signing in. Note: Portal access must be granted by an administrator.')
          setIsSignUp(false)
          setPassword('')
          setConfirmPassword('')
        } else if (data?.user) {
          // Check portal access after signup
          const { data: customer } = await supabase
            .from('customers')
            .select('id, portal_access')
            .eq('email', email)
            .single()
          
          if (!customer?.portal_access) {
            throw new Error('Portal access not granted. Contact support for assistance.')
          }

          // Log session and update last login
          await logPortalSession(customer.id, data.user.id)
          await supabase
            .from('customers')
            .update({ last_portal_login: new Date().toISOString() })
            .eq('id', customer.id)

          router.push('/portal')
        }
      } else {
        // Sign in - check portal access before authentication
        const { data: customer } = await supabase
          .from('customers')
          .select('id, portal_access')
          .eq('email', email)
          .single()
        
        if (!customer) {
          throw new Error('Customer account not found. Please create an account or contact support.')
        }
        
        if (!customer.portal_access) {
          throw new Error('Portal access not granted. Contact support for assistance.')
        }

        // Proceed with authentication
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          // Log session and update last login
          await logPortalSession(customer.id, data.user.id)
          await supabase
            .from('customers')
            .update({ last_portal_login: new Date().toISOString() })
            .eq('id', customer.id)

          console.log('Customer portal login successful for:', email)
          router.push('/portal')
        }
      }
    } catch (error: unknown) {
      setError((error as { message?: string }).message || 'An error occurred during authentication')
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
      setError((error as { message?: string }).message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-lg px-8 py-10">
          <div className="mb-8">
            <Link 
              href="/auth" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login options
            </Link>
            
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <Logo width={120} height={52} />
              </div>
              <h1 className="text-3xl font-bold text-[#4b4949]">
                {isSignUp ? 'Create Portal Account' : 'Client Portal'}
              </h1>
              <p className="text-gray-700 mt-2">
                {isSignUp ? 'Request access to your project dashboard' : 'Sign in to view your projects and orders'}
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
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="block text-sm font-medium text-[#4b4949] mb-1">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="focus-visible:ring-[#91bdbd]"
                      required={isSignUp}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="block text-sm font-medium text-[#4b4949] mb-1">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Smith"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="focus-visible:ring-[#91bdbd]"
                      required={isSignUp}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company" className="block text-sm font-medium text-[#4b4949] mb-1">
                    Company <span className="text-gray-500">(optional)</span>
                  </Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Your company name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="focus-visible:ring-[#91bdbd]"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-[#4b4949] mb-1">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus-visible:ring-[#91bdbd]"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-[#4b4949] mb-1">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSignUp ? "Create a secure password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 focus-visible:ring-[#91bdbd]"
                  required
                  disabled={loading}
                  minLength={isSignUp ? 8 : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 h-auto text-gray-400 hover:text-gray-600 hover:bg-transparent"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {isSignUp && (
                <p className="mt-1 text-xs text-gray-600">
                  Password must be at least 8 characters long
                </p>
              )}
            </div>

            {isSignUp && (
              <div>
                <Label htmlFor="confirmPassword" className="block text-sm font-medium text-[#4b4949] mb-1">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 focus-visible:ring-[#91bdbd]"
                    required={isSignUp}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 h-auto text-gray-400 hover:text-gray-600 hover:bg-transparent"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleForgotPassword}
                    className="text-[#91bdbd] hover:text-[#7da9a9] font-medium p-0 h-auto hover:bg-transparent"
                    disabled={loading}
                  >
                    Forgot password?
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignUp ? 'Request Portal Access' : 'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isSignUp ? 'Already have an account?' : 'New customer?'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setMessage('')
                setPassword('')
                setConfirmPassword('')
                setFirstName('')
                setLastName('')
                setCompany('')
              }}
              className="inline-flex items-center text-sm text-[#91bdbd] hover:text-[#7da9a9] font-medium p-0 h-auto hover:bg-transparent"
              disabled={loading}
            >
              {isSignUp ? (
                'Sign in to existing account'
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Create new customer account
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Questions about your project?{' '}
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