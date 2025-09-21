import * as React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:shadow-md transition-shadow ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col space-y-2 p-6 pb-4 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`text-lg font-bold leading-tight tracking-tight text-slate-900 ${className}`}
        {...props}
      >
        {children}
      </h3>
    )
  }
)

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`p-6 pt-4 ${className}`} {...props}>
        {children}
      </div>
    )
  }
)

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-sm text-slate-600 ${className}`}
        {...props}
      >
        {children}
      </p>
    )
  }
)

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardTitle.displayName = 'CardTitle'
CardContent.displayName = 'CardContent'
CardDescription.displayName = 'CardDescription'

export { Card, CardHeader, CardTitle, CardContent, CardDescription }