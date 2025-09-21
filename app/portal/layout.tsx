'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  User,
  CreditCard,
  CheckSquare,
  Truck,
  Bell
} from 'lucide-react'
import { NotificationCenter } from '@/components/portal/notification-center'
import { ErrorBoundary } from '@/components/portal/error-boundary'
import { QueryProvider } from '@/components/portal/providers/query-provider'
import { PWAProvider } from '@/components/portal/pwa-provider'
import { PageLoadingSkeleton } from '@/components/portal/skeletons'
import { SkipLink } from '@/components/portal/accessible'
import { analytics, portalEvents } from '@/lib/portal/analytics'

interface LayoutProps {
  children: React.ReactNode
}

export default function PortalLayout({ children }: LayoutProps) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [portalSettings, setPortalSettings] = useState<{ allow_design_approval?: boolean; show_shipping_info?: boolean } | null>(null)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname()

  const checkAuth = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        console.log('Portal access granted for:', session.user.email)
        
        // Load portal settings and pending approvals count
        try {
          const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('email', session.user.email)
            .single()

          if (customer) {
            const { data: settings } = await supabase
              .from('portal_settings')
              .select('allow_design_approval, show_shipping_info')
              .eq('customer_id', customer.id)
              .single()

            setPortalSettings(settings)

            if (settings?.allow_design_approval) {
              const { data: approvals } = await supabase
                .from('design_approvals')
                .select('id')
                .eq('customer_id', customer.id)
                .in('status', ['pending', 'reviewing'])

              setPendingApprovalsCount(approvals?.length || 0)
            }
          }
        } catch (error) {
          console.error('Error loading portal settings:', error)
          // Set fallback values for testing
          setPortalSettings({ allow_design_approval: true, show_shipping_info: true })
          setPendingApprovalsCount(2)
        }
      } else {
        router.push('/auth')
        return
      }
    } catch (error) {
      console.error('Portal auth error:', error)
      router.push('/auth')
      return
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize analytics when user is loaded
  useEffect(() => {
    if (user) {
      analytics.initialize(user.id)
      analytics.trackEvent(portalEvents.PAGE_VIEW, {
        page: pathname,
        user_email: user.email
      })
    }
  }, [user, pathname])

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
      <QueryProvider>
        <div className="min-h-screen bg-white flex items-center justify-center font-roboto">
          <PageLoadingSkeleton />
        </div>
      </QueryProvider>
    )
  }

  if (!user) {
    return null
  }

  const navigation = [
    { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
    { name: 'Orders', href: '/portal/orders', icon: ShoppingCart },
    ...(portalSettings?.show_shipping_info ? [
      { name: 'Shipping', href: '/portal/shipping', icon: Truck }
    ] : []),
    { name: 'Financials', href: '/portal/financials', icon: CreditCard },
    { name: 'Documents', href: '/portal/documents', icon: FileText },
    ...(portalSettings?.allow_design_approval ? [
      { name: 'Approvals', href: '/portal/approvals', icon: CheckSquare }
    ] : []),
    { name: 'Notifications', href: '/portal/notifications', icon: Bell },
    { name: 'Profile', href: '/portal/profile', icon: User },
  ]

  return (
    <QueryProvider>
      <PWAProvider>
        <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === 'development'}>
          <div className="min-h-screen bg-gray-50 font-roboto">
            {/* Skip Navigation Links */}
            <SkipLink href="#main-content">Skip to main content</SkipLink>
            <SkipLink href="#navigation">Skip to navigation</SkipLink>
            
            <div className="flex">
              {/* Sidebar */}
              <aside 
                className="w-64 bg-white shadow-sm border-r border-gray-200"
                role="navigation"
                aria-label="Portal navigation"
              >
                <div className="flex flex-col h-screen">
                  {/* Logo Header */}
                  <header className="flex items-center h-16 px-6 border-b border-gray-200">
                    <Logo width={70} height={30} />
                    <span 
                      className="ml-2 px-2 py-1 bg-[#91bdbd] text-white text-xs font-medium rounded"
                      role="status"
                      aria-label="Client portal"
                    >
                      CLIENT
                    </span>
                  </header>

                  {/* Navigation Menu */}
                  <nav 
                    id="navigation"
                    className="flex-1 px-4 py-6 space-y-1"
                    role="navigation"
                    aria-label="Main navigation"
                  >
                    {navigation.map((item) => {
                      const Icon = item.icon
                      const showBadge = item.name === 'Approvals' && pendingApprovalsCount > 0
                      const isActive = pathname === item.href
                      
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:ring-offset-2 ${
                            isActive
                              ? 'bg-[#91bdbd] text-white'
                              : 'text-[#4b4949] hover:bg-[#7da9a9] hover:text-white'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => {
                            analytics.trackEvent(portalEvents.SECTION_VIEW, {
                              section: (item.name || "").toLowerCase(),
                              from_page: pathname
                            })
                          }}
                        >
                          <Icon className="w-4 h-4 mr-3" aria-hidden="true" />
                          {item.name}
                          {showBadge && (
                            <Badge 
                              className="ml-auto bg-yellow-100 text-yellow-800 border-yellow-200 text-xs"
                              variant="secondary"
                              aria-label={`${pendingApprovalsCount} pending approvals`}
                            >
                              {pendingApprovalsCount}
                            </Badge>
                          )}
                        </Link>
                      )
                    })}
                  </nav>

                  {/* User Profile Section */}
                  <footer className="border-t border-gray-200 p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div 
                        className="w-8 h-8 bg-[#91bdbd] rounded-full flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <span className="text-white text-sm font-medium">
                          {user.email?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-[#4b4949]">{user.email}</div>
                        <div className="text-[#91bdbd] text-xs">Client Portal</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full border-[#91bdbd] text-[#91bdbd] hover:bg-[#91bdbd] hover:text-white focus:ring-2 focus:ring-[#91bdbd] focus:ring-offset-2"
                      aria-describedby="sign-out-description"
                    >
                      {signingOut ? 'Signing Out...' : 'Sign Out'}
                    </Button>
                    <div id="sign-out-description" className="sr-only">
                      Sign out of your Limn Systems portal account
                    </div>
                  </footer>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col">
                {/* Header with Notifications */}
                <header 
                  className="bg-white border-b border-gray-200 px-8 py-4"
                  role="banner"
                >
                  <div className="flex items-center justify-between">
                    <div aria-live="polite" aria-atomic="true" className="sr-only">
                      Current page: {navigation.find(nav => nav.href === pathname)?.name || 'Portal'}
                    </div>
                    <div className="flex items-center space-x-4">
                      <Suspense fallback={<div className="w-8 h-8 animate-pulse bg-gray-200 rounded"></div>}>
                        <ErrorBoundary level="component">
                          <NotificationCenter />
                        </ErrorBoundary>
                      </Suspense>
                    </div>
                  </div>
                </header>
                
                {/* Main Content */}
                <main 
                  id="main-content"
                  className="flex-1 p-8"
                  role="main"
                  tabIndex={-1}
                >
                  <ErrorBoundary level="section">
                    <Suspense fallback={<PageLoadingSkeleton />}>
                      {children}
                    </Suspense>
                  </ErrorBoundary>
                </main>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </PWAProvider>
    </QueryProvider>
  )
}