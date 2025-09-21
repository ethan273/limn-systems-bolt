'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface InteractiveCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  scale?: boolean
  glow?: boolean
}

export function InteractiveCard({
  children,
  className,
  onClick,
  hover = true,
  scale = true,
  glow = false
}: InteractiveCardProps) {
  const baseClasses = [
    'transition-all duration-300 ease-out',
    'transform-gpu',
  ]

  if (hover) {
    baseClasses.push('hover:shadow-lg hover:shadow-slate-200/50')
  }

  if (scale) {
    baseClasses.push('hover:scale-[1.02] active:scale-[0.98]')
  }

  if (glow) {
    baseClasses.push('hover:ring-2 hover:ring-blue-100 hover:ring-opacity-50')
  }

  if (onClick) {
    baseClasses.push('cursor-pointer select-none')
  }

  return (
    <div
      className={cn(baseClasses, className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface AnimatedBadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  pulse?: boolean
}

export function AnimatedBadge({
  children,
  className,
  variant = 'default',
  pulse = false
}: AnimatedBadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  }

  const baseClasses = [
    'px-2 py-1 rounded-full text-xs font-medium',
    'transition-all duration-200 ease-out',
    'hover:scale-105 hover:shadow-sm',
    variantClasses[variant]
  ]

  if (pulse) {
    baseClasses.push('animate-pulse')
  }

  return (
    <span className={cn(baseClasses, className)}>
      {children}
    </span>
  )
}

interface FloatingActionButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary'
}

export function FloatingActionButton({
  children,
  className,
  onClick,
  size = 'md',
  variant = 'primary'
}: FloatingActionButtonProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  }

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 shadow-lg border border-gray-200'
  }

  return (
    <button
      className={cn(
        'fixed bottom-6 right-6 rounded-full',
        'flex items-center justify-center',
        'transition-all duration-300 ease-out',
        'hover:scale-110 hover:shadow-xl active:scale-95',
        'transform-gpu backdrop-blur-sm',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

interface SlideInProps {
  children: React.ReactNode
  direction?: 'left' | 'right' | 'up' | 'down'
  delay?: number
  className?: string
}

export function SlideIn({
  children,
  direction = 'up',
  delay = 0,
  className
}: SlideInProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  const directionClasses = {
    left: 'translate-x-[-20px]',
    right: 'translate-x-[20px]',
    up: 'translate-y-[20px]',
    down: 'translate-y-[-20px]'
  }

  return (
    <div
      className={cn(
        'transition-all duration-700 ease-out',
        !isVisible && `opacity-0 ${directionClasses[direction]}`,
        isVisible && 'opacity-100 translate-x-0 translate-y-0',
        className
      )}
    >
      {children}
    </div>
  )
}

interface PulseOnUpdateProps {
  children: React.ReactNode
  value: unknown
  className?: string
}

export function PulseOnUpdate({
  children,
  value,
  className
}: PulseOnUpdateProps) {
  const [isUpdating, setIsUpdating] = React.useState(false)
  const prevValueRef = React.useRef(value)

  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsUpdating(true)
      const timer = setTimeout(() => {
        setIsUpdating(false)
      }, 300)

      prevValueRef.current = value
      return () => clearTimeout(timer)
    }
  }, [value])

  return (
    <div
      className={cn(
        'transition-all duration-300',
        isUpdating && 'scale-105 bg-blue-50 rounded-md',
        className
      )}
    >
      {children}
    </div>
  )
}

interface ProgressiveLoadProps {
  children: React.ReactNode
  index: number
  className?: string
}

export function ProgressiveLoad({
  children,
  index,
  className
}: ProgressiveLoadProps) {
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-4 duration-700',
        className
      )}
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'both'
      }}
    >
      {children}
    </div>
  )
}

const EnhancedInteractions = {
  InteractiveCard,
  AnimatedBadge,
  FloatingActionButton,
  SlideIn,
  PulseOnUpdate,
  ProgressiveLoad
}

export default EnhancedInteractions