'use client'

import React from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  showBreadcrumbs?: boolean
  breadcrumbClassName?: string
  headerClassName?: string
  contentClassName?: string
}

export function PageWrapper({
  children,
  title,
  description,
  className,
  showBreadcrumbs = true,
  breadcrumbClassName,
  headerClassName,
  contentClassName
}: PageWrapperProps) {
  const breadcrumbItems = useBreadcrumbs()

  return (
    <div className={cn("space-y-6", className)}>
      {showBreadcrumbs && breadcrumbItems.length > 0 && (
        <Breadcrumb 
          items={breadcrumbItems} 
          className={breadcrumbClassName}
        />
      )}
      
      {(title || description) && (
        <div className={cn("space-y-2", headerClassName)}>
          {title && (
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-lg text-slate-600 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className={contentClassName}>
        {children}
      </div>
    </div>
  )
}

// Alternative minimal wrapper for pages that need custom headers
export function PageContent({
  children,
  className,
  showBreadcrumbs = true,
  breadcrumbClassName
}: {
  children: React.ReactNode
  className?: string
  showBreadcrumbs?: boolean
  breadcrumbClassName?: string
}) {
  const breadcrumbItems = useBreadcrumbs()

  return (
    <div className={cn("space-y-6", className)}>
      {showBreadcrumbs && breadcrumbItems.length > 0 && (
        <Breadcrumb 
          items={breadcrumbItems} 
          className={breadcrumbClassName}
        />
      )}
      {children}
    </div>
  )
}