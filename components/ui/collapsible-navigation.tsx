"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
  condition?: () => boolean // Optional condition for showing the section
}

interface CollapsibleNavigationProps {
  userId?: string
  sections: NavigationSection[]
  baseItems: NavigationItem[]
}

export function CollapsibleNavigation({ userId, sections, baseItems }: CollapsibleNavigationProps) {
  const pathname = usePathname()
  const { canView } = usePermissions()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Get the storage key for this user
  const getStorageKey = useCallback(() => userId ? `nav-expanded-${userId}` : 'nav-expanded-guest', [userId])

  // Load expanded state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getStorageKey())
      if (saved) {
        setExpandedSections(new Set(JSON.parse(saved)))
      }
    } catch (error) {
      console.error('Failed to load navigation state:', error)
    }
  }, [userId, getStorageKey])

  // Auto-expand section based on current page
  useEffect(() => {
    const currentSection = sections.find(section =>
      section.items.some(item => pathname?.startsWith(item.href))
    )
    
    if (currentSection) {
      setExpandedSections(prev => {
        const newExpanded = new Set(prev)
        newExpanded.add(currentSection.title)
        
        // Save to localStorage
        try {
          localStorage.setItem(getStorageKey(), JSON.stringify(Array.from(newExpanded)))
        } catch (error) {
          console.error('Failed to save navigation state:', error)
        }
        
        return newExpanded
      })
    }
  }, [pathname, sections, userId, getStorageKey])

  // Toggle section expansion
  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(sectionTitle)) {
        newExpanded.delete(sectionTitle)
      } else {
        newExpanded.add(sectionTitle)
      }
      
      // Save to localStorage
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(Array.from(newExpanded)))
      } catch (error) {
        console.error('Failed to save navigation state:', error)
      }
      
      return newExpanded
    })
  }

  // Filter sections based on permissions
  const visibleSections = sections.filter(section => {
    if (section.condition) {
      return section.condition()
    }
    return true
  }).map(section => ({
    ...section,
    items: (section.items || []).filter(item => {
      // If item has explicit permission field, check that
      if (item.permission) {
        return canView(item.permission as any)
      }
      
      // Extract permission key from href (e.g., '/dashboard/contacts' -> 'contacts')
      const permissionKey = (item.href || "").split('/').pop()
      if (!permissionKey) return true
      
      // Check if this is a conditional item that requires permission mapping
      if (['shipping-management'].includes(permissionKey)) {
        const key = permissionKey.replace('-', '_') as 'shipping'
        return canView(key)
      }
      
      // Manufacturers should always be visible
      if (permissionKey === 'manufacturers') {
        return true
      }
      
      // Production items should always be visible for now
      if (['production', 'production-tracking'].includes(permissionKey)) {
        return true
      }
      
      // Design and creative items should always be visible
      if (['design-projects', 'design-briefs', 'design-team', 'designers', 'shop-drawings'].includes(permissionKey)) {
        return true
      }
      
      // Financial items should always be visible
      if (['finance', 'invoices', 'payments', 'ar-aging', 'budgets', 'budget-variance', 'contracts'].includes(permissionKey)) {
        return true
      }
      
      // Quality control and tracking items should always be visible
      if (['qc-tracking', 'prototypes', 'packing', 'shipping', 'shipping-quotes', 'order-tracking'].includes(permissionKey)) {
        return true
      }
      
      // Product and inventory items should always be visible
      if (['products', 'collections', 'items', 'materials'].includes(permissionKey)) {
        return true
      }
      
      // Analytics and reporting should always be visible
      if (['analytics', 'reports'].includes(permissionKey)) {
        return true
      }
      
      // Document management should always be visible
      if (['documents', 'pandadoc'].includes(permissionKey)) {
        return true
      }
      
      // Settings and admin should always be visible
      if (['settings', 'seed-test-data'].includes(permissionKey)) {
        return true
      }
      
      // Workflow and team items should always be visible
      if (['workflows', 'production-team', 'sales-team'].includes(permissionKey)) {
        return true
      }
      
      return true
    })
  })).filter(section => (section.items || []).length > 0)

  return (
    <nav className="flex-1 px-4 py-6 space-y-1">
      {/* Base Navigation Items */}
      {baseItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Icon className="w-4 h-4 mr-3" />
            {item.name}
          </Link>
        )
      })}

      {/* Collapsible Sections */}
      {visibleSections.map((section) => {
        const isExpanded = expandedSections.has(section.title)
        const ChevronIcon = isExpanded ? ChevronDown : ChevronRight
        
        return (
          <div key={section.title} className="space-y-1">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.title)}
              className={cn(
                "flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-md transition-colors",
                "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <span>{section.title}</span>
              <ChevronIcon className={cn(
                "w-4 h-4 transition-transform duration-200"
              )} />
            </button>

            {/* Section Items */}
            {isExpanded && (
              <div className="ml-4 space-y-1">
                {(section.items || []).map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        pathname === item.href
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}