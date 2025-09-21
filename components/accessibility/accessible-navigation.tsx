'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { a11y } from '@/lib/accessibility/aria-helpers'
import { ChevronRight, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Accessible Breadcrumb Component
interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface AccessibleBreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function AccessibleBreadcrumb({ items, className }: AccessibleBreadcrumbProps) {
  return (
    <nav 
      className={cn("flex", className)}
      {...a11y.attributes.navigation(a11y.labels.breadcrumb)}
    >
      <ol className="flex items-center space-x-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isCurrent = item.current || isLast
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-gray-400 mx-2" aria-hidden="true" />
              )}
              
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm px-1 py-0.5"
                >
                  {item.label}
                </Link>
              ) : (
                <span 
                  className={cn(
                    "px-1 py-0.5",
                    isCurrent 
                      ? "text-gray-900 dark:text-gray-100 font-medium" 
                      : "text-gray-600 dark:text-gray-400"
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Accessible Skip Link
interface SkipLinkProps {
  href: string
  children: React.ReactNode
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="absolute left-0 top-0 -translate-y-full bg-blue-600 text-white px-4 py-2 text-sm font-medium focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50 transition-transform duration-200"
    >
      {children}
    </a>
  )
}

// Accessible Mobile Menu
interface AccessibleMobileMenuProps {
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  menuLabel?: string
}

export function AccessibleMobileMenu({ 
  isOpen, 
  onToggle, 
  children, 
  menuLabel = "Main navigation" 
}: AccessibleMobileMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onToggle()
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onToggle])

  // Trap focus when menu is open
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const cleanup = a11y.focus.trapFocus(menuRef.current)
      return cleanup
    }
  }, [isOpen])

  return (
    <>
      {/* Menu Toggle Button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="md:hidden"
        {...a11y.attributes.expandable(isOpen, 'mobile-menu')}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {isOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </Button>

      {/* Mobile Menu */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={onToggle}
            aria-hidden="true"
          />
          
          {/* Menu Content */}
          <div
            ref={menuRef}
            id="mobile-menu"
            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out"
            {...a11y.attributes.navigation(menuLabel)}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {menuLabel}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-4 space-y-2">
              {children}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Accessible Navigation Item
interface NavItemProps {
  href: string
  children: React.ReactNode
  isActive?: boolean
  onClick?: () => void
  className?: string
  external?: boolean
}

export function AccessibleNavItem({ 
  href, 
  children, 
  isActive, 
  onClick, 
  className,
  external = false 
}: NavItemProps) {
  const baseStyles = cn(
    "block px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
    isActive
      ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
    className
  )

  if (external) {
    return (
      <a
        href={href}
        className={baseStyles}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
        aria-current={isActive ? "page" : undefined}
      >
        {children}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    )
  }

  return (
    <Link
      href={href}
      className={baseStyles}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  )
}

// Accessible Tab Navigation
interface TabItem {
  id: string
  label: string
  content: React.ReactNode
  disabled?: boolean
}

interface AccessibleTabsProps {
  tabs: TabItem[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function AccessibleTabs({ 
  tabs, 
  activeTab, 
  onTabChange,
  className,
  orientation = 'horizontal' 
}: AccessibleTabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id || '')
  const [, setFocusedTab] = useState(0)
  const tabListRef = useRef<HTMLDivElement>(null)
  
  const currentActiveTab = activeTab || internalActiveTab
  
  const handleTabChange = (tabId: string) => {
    onTabChange?.(tabId)
    setInternalActiveTab(tabId)
  }

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const tabButtons = tabListRef.current?.querySelectorAll('[role="tab"]:not([disabled])') || []
    const newFocusedIndex = a11y.keyboard.arrowKeyHandler(
      event,
      Array.from(tabButtons) as HTMLElement[],
      index,
      orientation
    )
    
    if (newFocusedIndex !== index) {
      setFocusedTab(newFocusedIndex)
      const newTab = tabs.filter(tab => !tab.disabled)[newFocusedIndex]
      if (newTab) {
        handleTabChange(newTab.id)
      }
    }
  }


  return (
    <div className={className}>
      {/* Tab List */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation={orientation}
        className={cn(
          "flex border-b border-gray-200 dark:border-gray-700",
          orientation === 'vertical' && "flex-col border-b-0 border-r"
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === currentActiveTab
          const enabledIndex = tabs.filter(t => !t.disabled).findIndex(t => t.id === tab.id)
          
          return (
            <button
              key={tab.id}
              {...a11y.attributes.tab(`panel-${tab.id}`, isActive)}
              disabled={tab.disabled}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, enabledIndex)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
                isActive
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600",
                tab.disabled && "opacity-50 cursor-not-allowed",
                orientation === 'vertical' && "border-b-0 border-r-2 text-left"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            {...a11y.attributes.tabPanel(tab.id, tab.id === currentActiveTab)}
            id={`panel-${tab.id}`}
          >
            {tab.id === currentActiveTab && tab.content}
          </div>
        ))}
      </div>
    </div>
  )
}

// Accessible Pagination
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisible?: number
  className?: string
}

export function AccessiblePagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisible = 7,
  className
}: PaginationProps) {
  const getVisiblePages = () => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const delta = Math.floor(maxVisible / 2)
    const range: number[] = []
    const rangeWithDots: (number | string)[] = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const visiblePages = getVisiblePages()

  return (
    <nav 
      className={cn("flex items-center justify-center space-x-1", className)}
      {...a11y.attributes.navigation(a11y.labels.pagination)}
      aria-label={`Page ${currentPage} of ${totalPages}`}
    >
      {/* First Page */}
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          aria-label="Go to first page"
          className="px-3 py-2"
        >
          First
        </Button>
      )}

      {/* Previous Page */}
      {showPrevNext && currentPage > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={`Go to page ${currentPage - 1}`}
          className="px-3 py-2"
        >
          Previous
        </Button>
      )}

      {/* Page Numbers */}
      {visiblePages.map((page, index) => {
        if (typeof page === 'string') {
          return (
            <span key={index} className="px-3 py-2 text-gray-500" aria-hidden="true">
              {page}
            </span>
          )
        }

        const isCurrent = page === currentPage

        return (
          <Button
            key={page}
            variant={isCurrent ? "default" : "ghost"}
            size="sm"
            onClick={() => onPageChange(page)}
            aria-label={isCurrent ? `Current page, page ${page}` : `Go to page ${page}`}
            aria-current={isCurrent ? "page" : undefined}
            className="px-3 py-2 min-w-[40px]"
          >
            {page}
          </Button>
        )
      })}

      {/* Next Page */}
      {showPrevNext && currentPage < totalPages && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={`Go to page ${currentPage + 1}`}
          className="px-3 py-2"
        >
          Next
        </Button>
      )}

      {/* Last Page */}
      {showFirstLast && currentPage < totalPages && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          aria-label="Go to last page"
          className="px-3 py-2"
        >
          Last
        </Button>
      )}
    </nav>
  )
}

// Main Layout with Accessibility Features
interface AccessibleLayoutProps {
  children: React.ReactNode
  skipLinks?: Array<{ href: string; label: string }>
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

export function AccessibleLayout({ 
  children, 
  skipLinks = [{ href: "#main-content", label: "Skip to main content" }],
  breadcrumbs,
  className 
}: AccessibleLayoutProps) {
  return (
    <div className={className}>
      {/* Skip Links */}
      {skipLinks.map((link) => (
        <SkipLink key={link.href} href={link.href}>
          {link.label}
        </SkipLink>
      ))}

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 1 && (
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <AccessibleBreadcrumb items={breadcrumbs} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main id="main-content" role="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}