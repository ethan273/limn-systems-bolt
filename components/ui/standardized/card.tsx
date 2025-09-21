import React from 'react'
import { cn, designSystem } from '@/lib/design-system/utils'

interface StandardizedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'filled' | 'elevated'
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  loading?: boolean
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function StandardizedCard({
  variant = 'default',
  size = 'md',
  interactive = false,
  loading = false,
  children,
  header,
  footer,
  className,
  ...props
}: StandardizedCardProps) {
  
  const baseClasses = cn(
    // Base styles
    'bg-white rounded-lg border transition-all duration-200',
    // Variant styles
    {
      'border-neutral-200 shadow-sm': variant === 'default',
      'border-neutral-300 shadow-none': variant === 'outlined', 
      'bg-neutral-50 border-neutral-200 shadow-sm': variant === 'filled',
      'border-neutral-200 shadow-lg': variant === 'elevated'
    },
    // Size styles
    {
      'p-4': size === 'sm',
      'p-6': size === 'md', 
      'p-8': size === 'lg'
    },
    // Interactive styles
    {
      'hover:shadow-md hover:-translate-y-1 cursor-pointer': interactive && !loading,
      'opacity-60 pointer-events-none': loading
    },
    className
  )

  return (
    <div className={baseClasses} {...props}>
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      )}
      
      {header && (
        <div className="mb-4 pb-4 border-b border-neutral-200">
          {header}
        </div>
      )}
      
      <div className={cn('relative', { 'min-h-[100px]': loading })}>
        {children}
      </div>
      
      {footer && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          {footer}
        </div>
      )}
    </div>
  )
}

// Card Header Component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  icon?: React.ReactNode
}

export function StandardizedCardHeader({
  title,
  subtitle, 
  actions,
  icon,
  children,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between', className)} {...props}>
      <div className="flex items-start space-x-3">
        {icon && (
          <div className="flex-shrink-0 text-neutral-500 mt-1">
            {icon}
          </div>
        )}
        <div>
          {title && (
            <h3 className={designSystem.typography.heading(4)}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={designSystem.typography.caption()}>
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

// Card Content Component
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function StandardizedCardContent({
  children,
  className,
  ...props
}: CardContentProps) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {children}
    </div>
  )
}

// Card Footer Component  
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right' | 'between'
}

export function StandardizedCardFooter({
  children,
  align = 'right',
  className,
  ...props
}: CardFooterProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end', 
    between: 'justify-between'
  }

  return (
    <div 
      className={cn('flex items-center', alignClasses[align], className)} 
      {...props}
    >
      {children}
    </div>
  )
}

// Metric Card - Specialized for dashboard metrics
interface MetricCardProps extends Omit<StandardizedCardProps, 'children'> {
  title: string
  value: string | number
  change?: {
    value: number
    trend: 'up' | 'down' | 'neutral'
    period?: string
  }
  icon?: React.ReactNode
  color?: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
}

export function StandardizedMetricCard({
  title,
  value,
  change,
  icon,
  color = 'neutral',
  ...cardProps
}: MetricCardProps) {
  const colorClasses = {
    primary: 'text-primary-600 bg-primary-50',
    success: 'text-success-600 bg-success-50',
    warning: 'text-warning-600 bg-warning-50', 
    error: 'text-error-600 bg-error-50',
    neutral: 'text-neutral-600 bg-neutral-50'
  }

  const trendClasses = {
    up: 'text-success-600',
    down: 'text-error-600',
    neutral: 'text-neutral-600'
  }

  return (
    <StandardizedCard {...cardProps}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-600 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-neutral-900 mb-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <div className="flex items-center space-x-2">
              <span className={cn('text-sm font-medium', trendClasses[change.trend])}>
                {change.trend === 'up' ? '↑' : change.trend === 'down' ? '↓' : '→'} 
                {Math.abs(change.value)}%
              </span>
              {change.period && (
                <span className="text-sm text-neutral-500">
                  {change.period}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-lg', colorClasses[color])}>
            {icon}
          </div>
        )}
      </div>
    </StandardizedCard>
  )
}