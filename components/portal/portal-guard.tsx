'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAccess } from '@/hooks/usePortalAccess'
import { AlertCircle, Shield } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

interface PortalGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PortalGuard({ children, fallback }: PortalGuardProps) {
  const { hasAccess, loading, error } = usePortalAccess()
  const router = useRouter()

  useEffect(() => {
    if (!loading && hasAccess === false && !error) {
      // Redirect to portal login if no access and no specific error
      router.push('/portal/login')
    }
  }, [hasAccess, loading, error, router])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-6">
            <Logo width={120} height={52} />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#91bdbd] mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying portal access...</p>
        </div>
      </div>
    )
  }

  // Error state - show error message
  if (error) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full">
            <div className="bg-white shadow-lg rounded-lg px-8 py-10 text-center">
              <div className="mb-6">
                <Logo width={120} height={52} />
              </div>
              
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-[#4b4949] mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-4">{error}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/portal/login')}
                  className="w-full py-2 px-4 bg-[#91bdbd] hover:bg-[#7da9a9] text-white font-medium rounded-lg transition-colors"
                >
                  Try Login Again
                </button>
                
                <a
                  href="mailto:support@limnsystems.com"
                  className="block w-full py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Contact Support
                </a>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  If you believe this is an error, please contact our support team.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    )
  }

  // No access state - redirect to login
  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="bg-white shadow-lg rounded-lg px-8 py-10 text-center">
            <div className="mb-6">
              <Logo width={120} height={52} />
            </div>
            
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-[#91bdbd]/20 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-[#91bdbd]" />
              </div>
              <h1 className="text-2xl font-bold text-[#4b4949] mb-2">Portal Access Required</h1>
              <p className="text-gray-600 mb-4">
                You need to sign in to access the customer portal.
              </p>
            </div>

            <button
              onClick={() => router.push('/portal/login')}
              className="w-full py-2 px-4 bg-[#91bdbd] hover:bg-[#7da9a9] text-white font-medium rounded-lg transition-colors"
            >
              Sign In to Portal
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Access granted - show protected content
  if (hasAccess === true) {
    return <>{children}</>
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#91bdbd]"></div>
    </div>
  )
}

export default PortalGuard