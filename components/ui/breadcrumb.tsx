"use client"

import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-slate-700 mb-6", className)} aria-label="Breadcrumb">
      <Link 
        href="/dashboard" 
        className="flex items-center hover:text-slate-900 transition-colors"
      >
        <Home className="h-4 w-4 mr-1" />
        Dashboard
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-slate-500" />
          {item.href && index < items.length - 1 ? (
            <Link 
              href={item.href}
              className="hover:text-slate-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

// Modern breadcrumb components for compatibility
export function BreadcrumbList({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <ol className={cn("flex items-center space-x-1 text-sm text-slate-700", className)}>
      {children}
    </ol>
  )
}

export function BreadcrumbItem({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <li className={cn("flex items-center", className)}>
      {children}
    </li>
  )
}

export function BreadcrumbSeparator({ children, className }: { children?: React.ReactNode, className?: string }) {
  return (
    <li className={cn("flex items-center text-slate-500", className)}>
      {children || <ChevronRight className="h-4 w-4" />}
    </li>
  )
}

export function BreadcrumbLink({ href, children, className }: { href: string, children: React.ReactNode, className?: string }) {
  return (
    <Link 
      href={href}
      className={cn("hover:text-slate-900 transition-colors", className)}
    >
      {children}
    </Link>
  )
}

export function BreadcrumbPage({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("font-medium text-slate-900", className)}>
      {children}
    </span>
  )
}

// Shadcn-style Breadcrumb nav component
export function BreadcrumbNav({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-slate-700 mb-6", className)} aria-label="Breadcrumb">
      {children}
    </nav>
  )
}