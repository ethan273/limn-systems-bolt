'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { ToastProvider } from '@/components/ui/use-toast'
import { 
  Shield, 
  Users, 
  FileText, 
  Truck,
  Factory
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: LayoutProps) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [userProfile, setUserProfile] = useState<{ title: string; user_type: string; department: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const checkAuth = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        // Mock user profile data - in production this would come from the database
        setUserProfile({
          title: 'System Administrator',
          user_type: 'Super Admin',
          department: 'IT'
        })
      } else {
        router.push('/auth')
        return
      }
    } catch {
      router.push('/auth')
      return
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      const supabase = createClient()
      
      await supabase.auth.signOut()
      window.location.href = '/auth'
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/auth')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-roboto">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo width={140} height={60} />
          </div>
          <div className="text-gray-800">Loading Admin...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navigation = [
    { name: 'Admin Overview', href: '/admin', icon: Shield },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Audit Logs', href: '/admin/audit', icon: FileText },
  ]

  const operationsNav = [
    { name: 'Production Tracking', href: '/admin/production', icon: Factory },
    { name: 'Shipping Management', href: '/admin/shipping', icon: Truck },
  ]

  return (
    <div className="min-h-screen bg-gray-50 font-roboto">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-200">
          <div className="flex flex-col h-screen">
            {/* Logo */}
            <div className="flex items-center h-16 px-6 border-b border-gray-200">
              <Logo width={70} height={30} />
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded">ADMIN</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center px-4 py-3 text-sm font-medium rounded-md text-gray-800 hover:bg-gray-50"
              >
                ← Back to Dashboard
              </Link>
              
              <div className="border-t border-gray-200 my-4"></div>
              
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                      pathname === item.href
                        ? 'bg-red-50 text-red-700 border-l-4 border-red-500'
                        : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Operations Section */}
              <div className="mt-6">
                <h3 className="px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Operations</h3>
                <div className="mt-2 space-y-1">
                  {operationsNav.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                          pathname === item.href
                            ? 'bg-red-50 text-red-700 border-l-4 border-red-500'
                            : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </nav>

            {/* User info and sign out */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{user.email}</div>
                  {userProfile && (
                    <>
                      <div className="text-xs text-gray-600 truncate">{userProfile.title}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          {userProfile.user_type}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full"
              >
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="p-8">
            <ToastProvider>
              {children}
            </ToastProvider>
          </div>
        </div>
      </div>
    </div>
  )
}