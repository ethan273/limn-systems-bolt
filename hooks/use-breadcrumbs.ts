'use client'

import { usePathname, useParams } from 'next/navigation'
import { getBreadcrumbs } from '@/lib/breadcrumbs'
import type { BreadcrumbItem } from '@/components/ui/breadcrumb'

export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname()
  const params = useParams()
  
  // Convert params to string record for breadcrumb generation
  const paramRecord: Record<string, string> = {}
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        paramRecord[key] = value
      } else if (Array.isArray(value)) {
        paramRecord[key] = value.join('/')
      }
    })
  }
  
  return getBreadcrumbs(pathname || '', paramRecord)
}