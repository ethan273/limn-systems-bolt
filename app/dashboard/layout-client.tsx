/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { usePermissions } from '@/hooks/usePermissions'
import { CollapsibleNavigation } from '@/components/ui/collapsible-navigation'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { NotificationCenter } from '@/components/portal/notification-center'
import { GlobalSearch } from '@/components/ui/global-search'
import { EnhancedNotificationCenter } from '@/components/ui/enhanced-notifications'
import {
  LayoutDashboard,
  CheckSquare,
  Package,
  Layers,
  Box,
  Users,
  UserPlus,
  Building2,
  FolderOpen,
  ShoppingCart,
  Factory,
  Truck,
  BarChart3,
  Settings,
  Database,
  GitBranch,
  DollarSign,
  Palette,
  FileText,
  TrendingUp,
  FileSignature,
  Receipt,
  Target,
  Cog,
  Activity,
  Heart,
  Zap,
  Menu,
  X,
  ClipboardList,
  Hammer,
  PenTool,
  Calendar,
  CreditCard,
  FileCheck,
  Ship,
  Timer,
  Paintbrush,
  ClipboardCheck
} from 'lucide-react'

interface DashboardLayoutClientProps {
  children: React.ReactNode
}

export default function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
  const [user, setUser] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { loading: permissionsLoading } = usePermissions()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        setUser(user)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = useCallback(async () => {
    try {
      setSigningOut(true)
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      setSigningOut(false)
    }
  }, [router])

  // Safe user property accessors
  const getUserId = (): string => {
    if (user && typeof user === 'object' && 'id' in user && typeof user.id === 'string') {
      return user.id
    }
    return ''
  }

  const getUserEmail = (): string => {
    if (user && typeof user === 'object' && 'email' in user && typeof user.email === 'string') {
      return user.email
    }
    return ''
  }

  const getUserRole = (): string => {
    if (user && typeof user === 'object' && 'user_metadata' in user) {
      const metadata = user.user_metadata
      if (metadata && typeof metadata === 'object' && 'role' in metadata && typeof metadata.role === 'string') {
        return metadata.role
      }
    }
    return 'user'
  }

  if (loading || permissionsLoading) {
    return null
  }

  // Base navigation items (always visible)
  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pipeline', href: '/dashboard/pipeline', icon: GitBranch },
    { name: 'Activity', href: '/dashboard/activity', icon: Activity },
  ]

  // Navigation sections for collapsible menu
  const navigationSections = [
    {
      title: 'Task Management',
      items: [
        { name: 'All Tasks', href: '/dashboard/tasks', icon: CheckSquare },
        { name: 'My Tasks', href: '/dashboard/my-tasks', icon: ClipboardList },
      ]
    },
    {
      title: 'CRM & Sales',
      items: [
        { name: 'CRM Dashboard', href: '/dashboard/crm', icon: BarChart3 },
        { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
        { name: 'Leads', href: '/dashboard/leads', icon: UserPlus },
        { name: 'Clients', href: '/dashboard/clients', icon: Building2 },
        { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
      ]
    },
    {
      title: 'Product Management',
      items: [
        { name: 'Ordered Items', href: '/dashboard/products', icon: Package },
        { name: 'Collections', href: '/dashboard/collections', icon: Layers },
        { name: 'Materials', href: '/dashboard/materials', icon: Box },
      ]
    },
    {
      title: 'Catalog Items',
      items: [
        { name: 'Catalog Items', href: '/dashboard/items', icon: Box },
        { name: 'Prototype Items', href: '/dashboard/prototype-items', icon: Package },
        { name: 'Concept Items', href: '/dashboard/concept-items', icon: PenTool },
      ]
    },
    {
      title: 'Orders & Production',
      items: [
        { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
        { name: 'Order Tracking', href: '/dashboard/order-tracking', icon: Package },
        { name: 'Production', href: '/dashboard/production', icon: Settings },
        { name: 'Production Tracking', href: '/dashboard/production-tracking', icon: Factory },
        { name: 'Production Analytics', href: '/dashboard/production/analytics', icon: BarChart3 },
        { name: 'Capacity Planning', href: '/dashboard/production/capacity', icon: Target },
        { name: 'QC Tracking', href: '/dashboard/qc-tracking', icon: CheckSquare },
      ]
    },
    {
      title: 'Manufacturing & Tracking',
      items: [
        { name: 'Manufacturers', href: '/dashboard/manufacturers', icon: Building2 },
        { name: 'Prototypes', href: '/dashboard/prototypes', icon: Hammer },
        { name: 'Factory Reviews', href: '/dashboard/factory-reviews', icon: ClipboardCheck },
        { name: 'Shop Drawings', href: '/dashboard/shop-drawings', icon: PenTool },
        { name: 'Packing', href: '/dashboard/packing', icon: Package },
        { name: 'Shipping', href: '/dashboard/shipping', icon: Truck },
        { name: 'Shipping Management', href: '/dashboard/shipping-management', icon: Truck },
        { name: 'Shipping Quotes', href: '/dashboard/shipping-quotes', icon: Ship },
      ]
    },
    {
      title: 'Design & Creative',
      items: [
        { name: 'Design Dashboard', href: '/dashboard/design', icon: LayoutDashboard },
        { name: 'Designers', href: '/dashboard/designers', icon: Palette },
        { name: 'Design Briefs', href: '/dashboard/design-briefs', icon: FileText },
        { name: 'Design Projects', href: '/dashboard/design-projects', icon: FileText },
        { name: 'Design Boards', href: '/dashboard/design-boards', icon: Paintbrush },
      ]
    },
    {
      title: 'Financial Management',
      items: [
        { name: 'Finance Dashboard', href: '/dashboard/finance', icon: DollarSign },
        { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
        { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
        { name: 'AR Aging', href: '/dashboard/ar-aging', icon: Timer },
        { name: 'Budgets', href: '/dashboard/budgets', icon: Target },
        { name: 'Budget Variance', href: '/dashboard/budget-variance', icon: BarChart3 },
        { name: 'Contracts', href: '/dashboard/contracts', icon: FileCheck },
      ]
    },
    {
      title: 'Teams & Workflow',
      items: [
        { name: 'Production Team', href: '/dashboard/production-team', icon: Cog },
        { name: 'Sales Team', href: '/dashboard/sales-team', icon: Target },
        { name: 'Workflows', href: '/dashboard/workflows', icon: Zap },
        { name: 'Workflow Builder', href: '/dashboard/workflows/builder', icon: Settings },
      ]
    },
    {
      title: 'Customer Analytics',
      items: [
        { name: 'Customer Analytics', href: '/dashboard/customers/analytics', icon: Users },
        { name: 'Retention Analysis', href: '/dashboard/customers/retention', icon: Heart },
      ]
    },
    {
      title: 'Document Management',
      items: [
        { name: 'Documents', href: '/dashboard/documents', icon: FileText },
        { name: 'PandaDoc Integration', href: '/dashboard/pandadoc', icon: FileSignature },
      ]
    },
    {
      title: 'Analytics & Reports',
      items: [
        { name: 'Analytics Dashboard', href: '/dashboard/analytics', icon: BarChart3 },
        { name: 'Reports', href: '/dashboard/reports', icon: TrendingUp },
      ]
    },
    {
      title: 'Administration',
      items: [
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
        { name: 'Seed Test Data', href: '/dashboard/seed-test-data', icon: Database },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-glacier-50 font-roboto">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Logo width={60} height={26} />
          <div className="flex items-center space-x-2">
            <NotificationCenter />
            <button
              type="button"
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-stone-200">
          <div className="flex items-center flex-shrink-0 px-4">
            <Logo width={120} height={52} />
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {/* Base navigation */}
              {baseNavigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'bg-glacier-100 border-r-2 border-primary text-glacier-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <Icon
                      className={`${
                        isActive ? 'text-glacier-500' : 'text-slate-400 group-hover:text-slate-500'
                      } mr-3 flex-shrink-0 h-6 w-6`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                )
              })}

              {/* Collapsible navigation sections */}
              <CollapsibleNavigation
                sections={navigationSections}
                baseItems={[]}
                userId={getUserId()}
              />
            </nav>
          </div>

          {/* User info and logout */}
          <div className="flex-shrink-0 flex border-t border-stone-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    {getUserEmail()}
                  </p>
                  <p className="text-xs font-medium text-slate-500 group-hover:text-slate-700">
                    {getUserRole()}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                disabled={signingOut}
                variant="outline"
                className="w-full mt-2"
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 flex z-40">
            <div className="fixed inset-0 bg-slate-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-shrink-0 flex items-center px-4">
                <Logo width={120} height={52} />
              </div>
              <div className="mt-5 flex-1 h-0 overflow-y-auto">
                <nav className="px-2 space-y-1">
                  {/* Base navigation */}
                  {baseNavigation.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`${
                          isActive
                            ? 'bg-glacier-100 border-r-2 border-primary text-glacier-900'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon
                          className={`${
                            isActive ? 'text-glacier-500' : 'text-slate-400 group-hover:text-slate-500'
                          } mr-4 flex-shrink-0 h-6 w-6`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    )
                  })}

                  {/* Collapsible navigation sections */}
                  <CollapsibleNavigation
                    sections={navigationSections}
                    baseItems={[]}
                    userId={getUserId()}
                  />
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col">
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
              <GlobalSearch />
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <EnhancedNotificationCenter />
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}