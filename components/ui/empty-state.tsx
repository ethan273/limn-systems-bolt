import * as React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ 
    icon: Icon,
    title, 
    description, 
    actionLabel, 
    onAction,
    className = ''
  }, ref) => {
    return (
      <div 
        ref={ref}
        className={`text-center py-12 px-6 ${className}`}
      >
        {Icon && (
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-slate-500" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 font-medium max-w-md mx-auto mb-6">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    )
  }
)

EmptyState.displayName = 'EmptyState'

export { EmptyState }