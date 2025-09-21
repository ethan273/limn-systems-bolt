import * as React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = 'md', text, className = '' }, ref) => {
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6', 
      lg: 'w-8 h-8'
    }

    return (
      <div ref={ref} className={`flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center space-y-3">
          <div 
            className={`${sizes[size]} border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin`}
          />
          {text && (
            <p className="text-sm font-medium text-slate-600">{text}</p>
          )}
        </div>
      </div>
    )
  }
)

LoadingSpinner.displayName = 'LoadingSpinner'

export { LoadingSpinner }