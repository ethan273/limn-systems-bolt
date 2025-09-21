'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
  adaptToContent?: boolean
}

export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, md: 2, lg: 3, xl: 4 },
  gap = 6,
  adaptToContent = false
}: ResponsiveGridProps) {
  const gridClasses = React.useMemo(() => {
    const classes = ['grid']

    // Add responsive column classes
    if (cols.default) classes.push(`grid-cols-${cols.default}`)
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`)
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`)
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`)
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`)

    // Add gap class
    classes.push(`gap-${gap}`)

    // Add auto-fit for content adaptation
    if (adaptToContent) {
      classes.push('auto-rows-max')
    }

    return classes.join(' ')
  }, [cols, gap, adaptToContent])

  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  )
}

// Responsive stats grid specifically for dashboard metrics
interface StatsGridProps {
  children: React.ReactNode
  className?: string
  statsCount?: number
}

export function StatsGrid({ children, className, statsCount = 4 }: StatsGridProps) {
  const getStatsGridClass = () => {
    switch (statsCount) {
      case 2:
        return 'grid-cols-1 sm:grid-cols-2'
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      case 6:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    }
  }

  return (
    <div className={cn('grid gap-4 md:gap-6', getStatsGridClass(), className)}>
      {children}
    </div>
  )
}

// Mobile-first responsive container
interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'full',
  padding = 'md'
}: ResponsiveContainerProps) {
  const containerClasses = React.useMemo(() => {
    const classes = ['w-full', 'mx-auto']

    // Max width classes
    const maxWidthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
      '2xl': 'max-w-7xl',
      full: 'max-w-full'
    }
    classes.push(maxWidthClasses[maxWidth])

    // Padding classes
    const paddingClasses = {
      none: '',
      sm: 'px-2 sm:px-4',
      md: 'px-4 sm:px-6 lg:px-8',
      lg: 'px-6 sm:px-8 lg:px-12'
    }
    if (paddingClasses[padding]) {
      classes.push(paddingClasses[padding])
    }

    return classes.join(' ')
  }, [maxWidth, padding])

  return (
    <div className={cn(containerClasses, className)}>
      {children}
    </div>
  )
}

// Hook for responsive breakpoint detection
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('md')

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width < 640) setBreakpoint('sm')
      else if (width < 768) setBreakpoint('md')
      else if (width < 1024) setBreakpoint('lg')
      else if (width < 1280) setBreakpoint('xl')
      else setBreakpoint('2xl')
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return {
    breakpoint,
    isMobile: breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: ['lg', 'xl', '2xl'].includes(breakpoint)
  }
}

export default ResponsiveGrid