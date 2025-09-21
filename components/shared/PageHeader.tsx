import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export default function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 mb-3 leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-slate-700 text-lg font-medium leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}