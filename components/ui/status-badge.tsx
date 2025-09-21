import * as React from 'react'

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  children: React.ReactNode
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className = '', variant = 'neutral', size = 'md', children, ...props }, ref) => {
    const variants = {
      success: 'bg-green-100 text-green-800 border-green-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-amber-100 text-amber-800 border-amber-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      neutral: 'bg-slate-100 text-slate-700 border-slate-200'
    }

    const sizes = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1 text-sm'
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center font-semibold rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    )
  }
)

StatusBadge.displayName = 'StatusBadge'

export { StatusBadge }