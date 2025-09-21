'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// Standard loading spinner component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-primary',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Page loading component
interface PageLoadingProps {
  message?: string
  showSpinner?: boolean
}

export function PageLoading({ message = "Loading...", showSpinner = true }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {showSpinner && <LoadingSpinner size="lg" className="mb-4" />}
      <div className="text-lg font-medium text-slate-600 mb-2">{message}</div>
      <div className="text-sm text-slate-500">Please wait while we load your content</div>
    </div>
  )
}

// Table loading component
interface TableLoadingProps {
  rows?: number
  columns?: number
}

export function TableLoading({ rows = 5, columns = 4 }: TableLoadingProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-8">
          {[...Array(columns)].map((_, i) => (
            <div
              key={i}
              className="h-4 bg-gray-300 rounded animate-pulse"
              style={{ width: `${80 + Math.random() * 40}px` }}
            />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-100 last:border-0">
          <div className="flex items-center space-x-8">
            {[...Array(columns)].map((_, j) => (
              <div
                key={j}
                className="h-4 bg-gray-200 rounded animate-pulse"
                style={{ width: `${60 + Math.random() * 80}px` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Card loading component
interface CardLoadingProps {
  count?: number
  layout?: 'grid' | 'list'
}

export function CardLoading({ count = 3, layout = 'grid' }: CardLoadingProps) {
  const gridClass = layout === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
    : 'space-y-4'

  return (
    <div className={gridClass}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 rounded-lg p-6 space-y-4 animate-pulse"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-300 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Form loading component
export function FormLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-24" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
      ))}
      
      <div className="flex justify-end space-x-4 pt-6">
        <div className="h-10 bg-gray-200 rounded w-20" />
        <div className="h-10 bg-gray-300 rounded w-24" />
      </div>
    </div>
  )
}

// Button loading state
interface LoadingButtonProps {
  children: React.ReactNode
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  className?: string
  [key: string]: unknown
}

export function LoadingButton({
  children,
  loading = false,
  loadingText = "Loading...",
  disabled = false,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading && <LoadingSpinner size="sm" />}
      {loading ? loadingText : children}
    </button>
  )
}

// Dashboard stats loading
export function DashboardStatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 bg-gray-300 rounded" />
            <div className="h-4 w-4 bg-gray-200 rounded" />
          </div>
          <div className="space-y-1">
            <div className="h-8 bg-gray-300 rounded w-20" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// List item loading
interface ListLoadingProps {
  items?: number
  showAvatar?: boolean
  showActions?: boolean
}

export function ListLoading({ items = 5, showAvatar = false, showActions = false }: ListLoadingProps) {
  return (
    <div className="space-y-3">
      {[...Array(items)].map((_, i) => (
        <div
          key={i}
          className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg animate-pulse"
        >
          {showAvatar && <div className="h-10 w-10 bg-gray-300 rounded-full flex-shrink-0" />}
          
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          
          {showActions && (
            <div className="flex space-x-2">
              <div className="h-8 w-16 bg-gray-200 rounded" />
              <div className="h-8 w-8 bg-gray-200 rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Generic content loading with shimmer effect
interface ContentLoadingProps {
  lines?: number
  className?: string
}

export function ContentLoading({ lines = 3, className }: ContentLoadingProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-gray-200 rounded animate-pulse',
            i === 0 && 'w-3/4',
            i === 1 && 'w-full',
            i === 2 && 'w-5/6',
            i > 2 && 'w-4/5'
          )}
        />
      ))}
    </div>
  )
}