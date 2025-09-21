'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, 
  ChevronRight, 
  Home, 
  Package, 
  Users, 
 
  BarChart3, 
  Settings,
  Search,
  Bell,
  Menu,
  X
} from 'lucide-react'

// Enhanced breadcrumb component
interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface EnhancedBreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function EnhancedBreadcrumb({ items, className }: EnhancedBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <div className="flex items-center space-x-1">
            {item.icon && (
              <span className="text-gray-500">{item.icon}</span>
            )}
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
            )}
          </div>
        </React.Fragment>
      ))}
    </nav>
  )
}

// Smart navigation with context awareness
interface NavigationItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string
  children?: NavigationItem[]
  description?: string
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-4 w-4" />,
    description: 'Overview and analytics'
  },
  {
    label: 'Orders',
    href: '/dashboard/orders',
    icon: <Package className="h-4 w-4" />,
    badge: '12',
    description: 'Manage customer orders',
    children: [
      {
        label: 'All Orders',
        href: '/dashboard/orders',
        icon: <Package className="h-3 w-3" />
      },
      {
        label: 'Create Order',
        href: '/dashboard/orders/new',
        icon: <Package className="h-3 w-3" />
      },
      {
        label: 'Order Tracking',
        href: '/dashboard/order-tracking',
        icon: <Package className="h-3 w-3" />
      }
    ]
  },
  {
    label: 'Customers',
    href: '/dashboard/customers',
    icon: <Users className="h-4 w-4" />,
    description: 'Customer management',
    children: [
      {
        label: 'All Customers',
        href: '/dashboard/customers',
        icon: <Users className="h-3 w-3" />
      },
      {
        label: 'Add Customer',
        href: '/dashboard/customers/new',
        icon: <Users className="h-3 w-3" />
      }
    ]
  },
  {
    label: 'Inventory',
    href: '/dashboard/inventory',
    icon: <Package className="h-4 w-4" />,
    description: 'Product and material inventory',
    children: [
      {
        label: 'Items',
        href: '/dashboard/items',
        icon: <Package className="h-3 w-3" />
      },
      {
        label: 'Materials',
        href: '/dashboard/materials',
        icon: <Package className="h-3 w-3" />
      },
      {
        label: 'Collections',
        href: '/dashboard/collections',
        icon: <Package className="h-3 w-3" />
      }
    ]
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Analytics and reporting'
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings className="h-4 w-4" />,
    description: 'System configuration'
  }
]

interface SmartNavigationProps {
  className?: string
  variant?: 'sidebar' | 'horizontal' | 'mobile'
  collapsed?: boolean
}

export function SmartNavigation({
  className,
  variant = 'sidebar',
  collapsed = false
}: SmartNavigationProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Auto-expand parent items based on current path
  useEffect(() => {
    const pathSegments = pathname?.split('/') || []
    const newExpanded: string[] = []
    
    navigationItems.forEach(item => {
      if (item.children && pathSegments.some(segment => item.href.includes(segment))) {
        newExpanded.push(item.href)
      }
    })
    
    setExpandedItems(newExpanded)
  }, [pathname])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href) || false
  }

  const filteredItems = navigationItems.filter(item =>
    searchQuery === '' || 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (variant === 'horizontal') {
    return (
      <nav className={cn('flex items-center space-x-6', className)}>
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-1">
                {item.badge}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <nav className={cn('space-y-1', className)}>
      {/* Search bar for large navigation */}
      {!collapsed && variant === 'sidebar' && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search navigation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {filteredItems.map((item) => (
        <div key={item.href}>
          <div
            className={cn(
              'flex items-center justify-between w-full group',
              collapsed ? 'px-2' : 'px-3'
            )}
          >
            <Link
              href={item.href}
              className={cn(
                'flex items-center flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                collapsed ? 'justify-center' : 'space-x-3',
                isActive(item.href)
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
            
            {/* Expand/collapse button for items with children */}
            {item.children && !collapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(item.href)}
                className="p-1 ml-1"
              >
                {expandedItems.includes(item.href) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Submenu */}
          {item.children && expandedItems.includes(item.href) && !collapsed && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'flex items-center space-x-2 py-2 px-3 text-sm rounded-md transition-colors',
                    isActive(child.href)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {child.icon}
                  <span>{child.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Tooltip for collapsed sidebar */}
          {collapsed && item.description && (
            <div className="sr-only">{item.description}</div>
          )}
        </div>
      ))}
    </nav>
  )
}

// Mobile navigation overlay
interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function MobileNavigation({ isOpen, onClose, className }: MobileNavigationProps) {

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Navigation panel */}
      <div className={cn(
        'fixed inset-y-0 left-0 w-64 bg-white shadow-xl transform transition-transform',
        className
      )}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4">
          <SmartNavigation variant="sidebar" />
        </div>
      </div>
    </div>
  )
}

// Navigation header with user menu and notifications
interface NavigationHeaderProps {
  onMobileMenuToggle?: () => void
  showMobileMenuButton?: boolean
  className?: string
}

export function NavigationHeader({ 
  onMobileMenuToggle, 
  showMobileMenuButton = false,
  className 
}: NavigationHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className={cn(
      'flex items-center justify-between px-6 py-4 bg-white border-b',
      className
    )}>
      <div className="flex items-center space-x-4">
        {showMobileMenuButton && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMobileMenuToggle}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <div className="text-xl font-semibold text-gray-900">
          Limn Systems
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Global search - desktop only */}
        <div className="hidden md:flex relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            <Bell className="h-5 w-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              3
            </Badge>
          </Button>
          
          {/* Notification dropdown would go here */}
        </div>

        {/* User menu */}
        <div className="flex items-center space-x-2">
          <div className="hidden md:block text-sm text-gray-700">
            Welcome back, Ethan
          </div>
          <div className="h-8 w-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            E
          </div>
        </div>
      </div>
    </header>
  )
}

// Page header with breadcrumbs and actions
interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ 
  title, 
  description, 
  breadcrumbs, 
  actions, 
  className 
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {breadcrumbs && (
        <EnhancedBreadcrumb items={breadcrumbs} />
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
