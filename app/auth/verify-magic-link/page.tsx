'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { portalNotificationService } from '@/lib/services/portal-notification'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface VerificationState {
  status: 'verifying' | 'success' | 'error' | 'expired'
  message: string
  email?: string
}

function MagicLinkVerifier() {
  const [state, setState] = useState<VerificationState>({
    status: 'verifying',
    message: 'Verifying your magic link...'
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    verifyMagicLink()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const verifyMagicLink = async () => {
    try {
      if (!searchParams) {
        setState({
          status: 'error',
          message: 'Invalid magic link. No parameters found.',
        })
        return
      }
      
      const token = searchParams.get('token')
      const email = searchParams.get('email')

      if (!token || !email) {
        setState({
          status: 'error',
          message: 'Invalid magic link. The link appears to be malformed.',
          email: email || undefined
        })
        return
      }

      // Validate the magic link token
      const validation = await portalNotificationService.validateMagicLinkToken(token, email)

      if (!validation.valid) {
        if (validation.expired) {
          setState({
            status: 'expired',
            message: 'This magic link has expired. Please request a new one from your sales representative.',
            email
          })
        } else {
          setState({
            status: 'error',
            message: validation.error || 'Invalid magic link token.',
            email
          })
        }
        return
      }

      // Check if customer exists and has portal access
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, portal_access')
        .eq('email', email)
        .single()

      if (customerError || !customer) {
        setState({
          status: 'error',
          message: 'Customer account not found. Please contact support.',
          email
        })
        return
      }

      if (!customer.portal_access) {
        setState({
          status: 'error',
          message: 'Portal access has not been granted for this account. Please contact your sales representative.',
          email
        })
        return
      }

      // Sign in the user using Supabase magic link
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          data: {
            user_type: 'customer',
            portal_access: true,
            customer_id: customer.id
          }
        }
      })

      if (signInError) {
        console.error('Magic link sign-in error:', signInError)
        setState({
          status: 'error',
          message: 'Failed to authenticate. Please try again or contact support.',
          email
        })
        return
      }

      // Success - show success message and redirect
      setState({
        status: 'success',
        message: `Welcome back, ${customer.first_name || 'Customer'}! Redirecting to your portal...`,
        email
      })

      // Redirect to portal dashboard after short delay
      setTimeout(() => {
        router.push('/portal')
      }, 2000)

    } catch (error) {
      console.error('Magic link verification error:', error)
      setState({
        status: 'error',
        message: 'An unexpected error occurred during verification. Please try again.',
        email: searchParams?.get('email') || undefined
      })
    }
  }

  const handleRequestNewLink = () => {
    // Redirect to contact form or display instructions
    if (state.email) {
      setState({
        ...state,
        message: 'Please contact your sales representative to request a new magic link for your account.'
      })
    }
  }

  const getStatusIcon = () => {
    switch (state.status) {
      case 'verifying':
        return <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case 'error':
      case 'expired':
        return <AlertCircle className="w-8 h-8 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (state.status) {
      case 'verifying':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
      case 'expired':
        return 'text-red-600'
      default:
        return 'text-slate-600'
    }
  }

  const getBorderColor = () => {
    switch (state.status) {
      case 'verifying':
        return 'border-blue-200'
      case 'success':
        return 'border-green-200'
      case 'error':
      case 'expired':
        return 'border-red-200'
      default:
        return 'border-slate-200'
    }
  }

  const getBackgroundColor = () => {
    switch (state.status) {
      case 'verifying':
        return 'bg-blue-50'
      case 'success':
        return 'bg-green-50'
      case 'error':
      case 'expired':
        return 'bg-red-50'
      default:
        return 'bg-slate-50'
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
                Client Portal Access
              </h1>
              <p className="text-slate-600 mt-2">
                Verifying your secure login link
              </p>
            </div>
          </div>

          <div className={`mb-6 p-6 ${getBackgroundColor()} border ${getBorderColor()} rounded-lg text-center`}>
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            
            <h3 className={`text-lg font-semibold mb-2 ${getStatusColor()}`}>
              {state.status === 'verifying' && 'Verifying Access'}
              {state.status === 'success' && 'Access Granted!'}
              {state.status === 'error' && 'Verification Failed'}
              {state.status === 'expired' && 'Link Expired'}
            </h3>
            
            <p className="text-slate-700 text-sm leading-relaxed">
              {state.message}
            </p>

            {state.email && (
              <p className="text-slate-500 text-xs mt-2">
                Account: {state.email}
              </p>
            )}
          </div>

          {(state.status === 'error' || state.status === 'expired') && (
            <div className="space-y-3">
              {state.status === 'expired' && (
                <Button
                  onClick={handleRequestNewLink}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
                >
                  Request New Link
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={() => router.push('/auth/customer')}
                className="w-full text-slate-600 hover:text-slate-900"
              >
                Try Password Login Instead
              </Button>
            </div>
          )}

          {state.status === 'success' && (
            <div className="text-center">
              <Button
                onClick={() => router.push('/portal')}
                className="bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                Continue to Portal
              </Button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Having trouble accessing your portal?{' '}
              <a 
                href="mailto:support@limnsystems.com" 
                className="text-purple-600 hover:text-purple-500 font-medium"
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

export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white shadow-lg rounded-lg px-8 py-10 text-center">
            <div className="mb-6 flex justify-center">
              <Logo width={120} height={52} />
            </div>
            <div className="flex justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <p className="text-slate-600">Loading verification...</p>
          </div>
        </div>
      </div>
    }>
      <MagicLinkVerifier />
    </Suspense>
  )
}