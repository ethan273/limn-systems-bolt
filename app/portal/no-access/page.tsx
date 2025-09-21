'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, Mail, Phone } from 'lucide-react'

export default function PortalNoAccessPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          router.push('/auth')
          return
        }
        
        setUser(session.user)
      } catch (error) {
        console.error('Error checking user:', error)
        router.push('/auth')
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth')
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/auth')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Portal Access Required
              </h1>
              <p className="text-gray-600">
                Your account doesn&apos;t have portal access yet
              </p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-800 font-medium mb-1">Access Not Granted</p>
                <p className="text-red-700">
                  Portal access must be granted by a Limn Systems administrator before you can view your project dashboard.
                </p>
              </div>
            </div>
          </div>

          {user?.email && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Account:</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Need Portal Access?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Contact your sales representative or our support team to request portal access.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <a
                href="mailto:support@limnsystems.com"
                className="flex items-center justify-center px-4 py-3 bg-[#91bdbd] hover:bg-[#7da9a9] text-white rounded-lg font-medium transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Support
              </a>
              
              <a
                href="tel:+1-555-0123"
                className="flex items-center justify-center px-4 py-3 border border-[#91bdbd] text-[#91bdbd] hover:bg-[#91bdbd] hover:text-white rounded-lg font-medium transition-colors"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Support
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}