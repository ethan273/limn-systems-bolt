import * as React from 'react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info'
  children: React.ReactNode
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'info', children, ...props }, ref) => {
    const variants = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    }

    return (
      <div
        ref={ref}
        className={`p-4 border rounded-lg font-medium ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Alert.displayName = 'Alert'

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-sm leading-relaxed ${className}`}
        {...props}
      >
        {children}
      </p>
    )
  }
)

AlertDescription.displayName = 'AlertDescription'

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`font-semibold text-sm mb-1 ${className}`}
        {...props}
      >
        {children}
      </h3>
    )
  }
)

AlertTitle.displayName = 'AlertTitle'

export { Alert, AlertDescription, AlertTitle }