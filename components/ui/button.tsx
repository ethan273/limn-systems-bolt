import * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      default: 'bg-primary text-white hover:bg-glacier-600 active:bg-glacier-700 focus:ring-blue-500 shadow-sm hover:shadow-md',
      outline: 'border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 focus:ring-blue-500 font-semibold',
      ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus:ring-blue-500'
    }
    
    const sizes = {
      sm: 'h-9 px-3 text-sm font-semibold',
      md: 'h-11 px-4 py-2 text-sm font-semibold',
      lg: 'h-12 px-6 text-base font-semibold'
    }
    
    const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`
    
    return (
      <button className={classes} ref={ref} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }