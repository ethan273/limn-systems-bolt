'use client'

import React, { useState, useRef, useEffect } from 'react'

interface DropdownMenuItem {
  label: string
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
  destructive?: boolean
}

interface DropdownMenuProps {
  trigger?: React.ReactNode
  items?: DropdownMenuItem[]
  align?: 'left' | 'right'
  className?: string
  children?: React.ReactNode
}

export function DropdownMenu({ trigger, items, align = 'right', className = '', children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // If children are provided, render as a simple container
  if (children) {
    return <div className={className}>{children}</div>
  }

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick()
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-48 rounded-md bg-white shadow-lg border border-gray-200 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="py-1">
            {items?.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={index}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                    item.disabled
                      ? 'text-slate-500 cursor-not-allowed'
                      : item.destructive
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-700'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 mr-3" />}
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Modern dropdown menu components for newer portal components
interface DropdownMenuRootProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DropdownMenuRoot({ children, open, onOpenChange }: DropdownMenuRootProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  return (
    <div className="relative">
      {(React.Children || []).map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isOpen, setOpen } as Record<string, unknown>)
        }
        return child
      })}
    </div>
  )
}

export function DropdownMenuTrigger({ 
  children, 
  isOpen, 
  setOpen,
  asChild = false,
  ...props 
}: { 
  children: React.ReactNode
  isOpen?: boolean
  setOpen?: (open: boolean) => void
  asChild?: boolean
  [key: string]: unknown
}) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: () => setOpen?.(!isOpen)
    } as Record<string, unknown>)
  }
  
  return (
    <button
      {...props}
      onClick={() => setOpen?.(!isOpen)}
    >
      {children}
    </button>
  )
}

export function DropdownMenuContent({ 
  children, 
  isOpen, 
  align = 'end',
  className = '',
  ...props 
}: { 
  children: React.ReactNode
  isOpen?: boolean
  align?: 'start' | 'end'
  className?: string
  [key: string]: unknown
}) {
  if (!isOpen) return null

  return (
    <div
      className={`absolute z-50 mt-2 w-48 rounded-md bg-white shadow-lg border border-gray-200 ${
        align === 'start' ? 'left-0' : 'right-0'
      } ${className}`}
      {...props}
    >
      <div className="py-1">
        {children}
      </div>
    </div>
  )
}

export function DropdownMenuItem({ 
  children, 
  onClick,
  className = '',
  ...props 
}: { 
  children: React.ReactNode
  onClick?: () => void
  className?: string
  [key: string]: unknown
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition-colors text-slate-700 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownMenuLabel({ 
  children,
  className = '',
  ...props 
}: { 
  children: React.ReactNode
  className?: string
  [key: string]: unknown
}) {
  return (
    <div
      className={`px-4 py-2 text-sm font-medium text-slate-900 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function DropdownMenuSeparator({ 
  className = '',
  ...props 
}: { 
  className?: string
  [key: string]: unknown
}) {
  return (
    <div
      className={`h-px bg-slate-200 my-1 ${className}`}
      {...props}
    />
  )
}

// Export both APIs for compatibility
export { DropdownMenuRoot as DropdownMenuNew }