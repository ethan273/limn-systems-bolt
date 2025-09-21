'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Enhanced loading spinner with better animations
interface EnhancedLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  className?: string
}

export function EnhancedLoadingSpinner({ 
  size = 'md', 
  variant = 'default',
  className 
}: EnhancedLoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const variantClasses = {
    default: 'border-gray-300 border-t-primary',
    primary: 'border-blue-200 border-t-blue-600',
    success: 'border-green-200 border-t-green-600',
    warning: 'border-yellow-200 border-t-yellow-600',
    error: 'border-red-200 border-t-red-600'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Smart loading state with progress and estimated time
interface SmartLoadingStateProps {
  type?: 'skeleton' | 'progressive' | 'pulsing' | 'shimmer'
  message?: string
  progress?: number
  estimatedTime?: string
  showProgress?: boolean
  className?: string
}

export function SmartLoadingState({ 
  type = 'skeleton',
  message = 'Loading...',
  progress,
  estimatedTime,
  showProgress = false,
  className 
}: SmartLoadingStateProps) {
  const [currentProgress, setCurrentProgress] = useState(progress || 0)

  useEffect(() => {
    if (progress !== undefined) {
      setCurrentProgress(progress)
    }
  }, [progress])

  const loadingVariants = {
    skeleton: (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    ),
    progressive: (
      <div className="space-y-6">
        <div className="text-center">
          <EnhancedLoadingSpinner size="lg" className="mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{message}</h3>
          {estimatedTime && (
            <p className="text-sm text-muted-foreground">
              Estimated time: {estimatedTime}
            </p>
          )}
        </div>
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{currentProgress}%</span>
            </div>
            <Progress value={currentProgress} className="h-2" />
          </div>
        )}
      </div>
    ),
    pulsing: (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="rounded-full bg-slate-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    ),
    shimmer: (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="relative overflow-hidden bg-slate-200 rounded h-4">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <div className={cn(
      'flex items-center justify-center min-h-[400px] p-8',
      className
    )}>
      <div className="w-full max-w-md">
        {loadingVariants[type]}
      </div>
    </div>
  )
}

// Interactive dashboard loading with metrics preview
function DashboardLoadingState() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-6 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-16" />
            </div>
          </Card>
        ))}
      </div>

      {/* Chart placeholder */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="relative h-[300px] bg-slate-100 rounded animate-pulse">
            <div className="absolute inset-0 flex items-end justify-around p-4">
              {[40, 70, 30, 90, 60, 80, 45].map((height, i) => (
                <div
                  key={i}
                  className="bg-slate-300 rounded-t w-8 animate-pulse"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Table loading with realistic structure
interface EnhancedTableLoadingProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  showActions?: boolean
}

export function EnhancedTableLoading({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  showActions = false 
}: EnhancedTableLoadingProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Enhanced header with sorting indicators */}
      {showHeader && (
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-8">
            {[...Array(columns)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-3" />
              </div>
            ))}
            {showActions && <Skeleton className="h-4 w-12 ml-auto" />}
          </div>
        </div>
      )}
      
      {/* Enhanced rows with varied content */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
          <div className="flex items-center space-x-8">
            {[...Array(columns)].map((_, j) => (
              <div key={j} className="flex items-center space-x-2">
                {j === 0 && (
                  <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                )}
                <Skeleton 
                  className="h-4 rounded"
                  style={{ 
                    width: j === 0 ? '120px' : 
                           j === 1 ? '80px' : 
                           j === 2 ? '60px' : '40px' 
                  }} 
                />
              </div>
            ))}
            {showActions && (
              <div className="flex space-x-2 ml-auto">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-16 rounded" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Form loading with field structure
export function EnhancedFormLoading() {
  return (
    <div className="space-y-6">
      {/* Form sections */}
      {[
        { fields: 2, title: 'Basic Information' },
        { fields: 3, title: 'Details' },
        { fields: 1, title: 'Additional Options' }
      ].map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(section.fields)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Action buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  )
}

// Loading button with enhanced states
interface EnhancedLoadingButtonProps {
  children: React.ReactNode
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  [key: string]: unknown
}

export function EnhancedLoadingButton({
  children,
  loading = false,
  loadingText = "Loading...",
  disabled = false,
  variant = 'default',
  size = 'md',
  className,
  ...props
}: EnhancedLoadingButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
  }
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 text-lg'
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading && <EnhancedLoadingSpinner size="sm" />}
      <span className={cn(loading && "opacity-70")}>
        {loading ? loadingText : children}
      </span>
    </button>
  )
}

// Card grid loading with varied layouts
interface CardGridLoadingProps {
  count?: number
  layout?: 'grid' | 'list' | 'masonry'
  variant?: 'default' | 'compact' | 'detailed'
}

export function CardGridLoading({ 
  count = 6, 
  layout = 'grid',
  variant = 'default' 
}: CardGridLoadingProps) {
  const layoutClasses = {
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    list: 'space-y-4',
    masonry: 'columns-1 md:columns-2 lg:columns-3 gap-6'
  }

  const cardHeights = {
    default: 'h-48',
    compact: 'h-32',
    detailed: 'h-64'
  }

  return (
    <div className={layoutClasses[layout]}>
      {[...Array(count)].map((_, i) => (
        <Card 
          key={i} 
          className={cn(
            'p-6 space-y-4 animate-pulse',
            layout === 'masonry' && 'break-inside-avoid mb-6'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Badge variant="outline" className="opacity-50">
              <Skeleton className="h-4 w-12" />
            </Badge>
          </div>
          
          {/* Content area */}
          <div className={cn('bg-slate-100 rounded', cardHeights[variant])}>
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// Export all components
export {
  EnhancedLoadingSpinner as LoadingSpinner,
  SmartLoadingState as PageLoading,
  EnhancedTableLoading as TableLoading,
  CardGridLoading as CardLoading,
  EnhancedFormLoading as FormLoading,
  EnhancedLoadingButton as LoadingButton,
  DashboardLoadingState
}