'use client'

import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { a11y } from '@/lib/accessibility/aria-helpers'
import { X, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Base Modal Component
interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  preventScroll?: boolean
  className?: string
  overlayClassName?: string
  contentClassName?: string
  initialFocus?: React.RefObject<HTMLElement | null>
}

export function AccessibleModal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventScroll = true,
  className,
  overlayClassName,
  contentClassName,
  initialFocus
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = a11y.useIds('modal-title').id
  const descriptionId = a11y.useIds('modal-description').id
  const previouslyFocusedElement = useRef<HTMLElement | null>(null)

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape])

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Save currently focused element
      previouslyFocusedElement.current = document.activeElement as HTMLElement

      // Focus management
      const focusElement = initialFocus?.current || modalRef.current
      if (focusElement) {
        setTimeout(() => {
          focusElement.focus()
        }, 100)
      }

      // Trap focus within modal
      let cleanup: (() => void) | undefined
      if (modalRef.current) {
        cleanup = a11y.focus.trapFocus(modalRef.current)
      }

      return () => {
        cleanup?.()
        // Restore focus to previously focused element
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus()
        }
      }
    }
  }, [isOpen, initialFocus])

  // Handle body scroll prevention
  useEffect(() => {
    if (isOpen && preventScroll) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen, preventScroll])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4 h-[calc(100vh-2rem)]'
  }

  const modalContent = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        className
      )}
    >
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black bg-opacity-50 transition-opacity",
          overlayClassName
        )}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={cn(
          "relative w-full bg-white dark:bg-gray-900 rounded-lg shadow-xl transition-all",
          "max-h-[90vh] overflow-y-auto",
          sizeClasses[size],
          contentClassName
        )}
        {...a11y.attributes.modal(title ? titleId : '', description ? descriptionId : '')}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              {title && (
                <h2 
                  id={titleId}
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p 
                  id={descriptionId}
                  className="mt-1 text-sm text-gray-600 dark:text-gray-400"
                >
                  {description}
                </p>
              )}
            </div>
            
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex-shrink-0"
                aria-label={a11y.labels.closeModal}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )

  // Render in portal
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}

// Confirmation Dialog
interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
}

export function AccessibleConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false
}: ConfirmationDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      initialFocus={confirmButtonRef as React.RefObject<HTMLElement | null>}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          {message}
        </p>
        
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          
          <Button
            ref={confirmButtonRef}
            variant={variant === 'destructive' ? 'default' : 'default'}
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? 'Processing...' : undefined}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </AccessibleModal>
  )
}

// Alert Dialog
interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  actionText?: string
  onAction?: () => void
}

export function AccessibleAlertDialog({
  isOpen,
  onClose,
  type,
  title,
  message,
  actionText = 'OK',
  onAction
}: AlertDialogProps) {
  const actionButtonRef = useRef<HTMLButtonElement>(null)

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const iconColors = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400'
  }

  const Icon = icons[type]

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      initialFocus={actionButtonRef}
      showCloseButton={false}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Icon className={cn('h-6 w-6', iconColors[type])} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              {message}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-2">
          <Button
            ref={actionButtonRef}
            onClick={() => {
              onAction?.()
              onClose()
            }}
          >
            {actionText}
          </Button>
        </div>
      </div>
    </AccessibleModal>
  )
}

// Form Dialog
interface FormDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  onSubmit?: (formData: FormData) => void
  submitText?: string
  cancelText?: string
  loading?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function AccessibleFormDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  loading = false,
  size = 'md'
}: FormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (onSubmit && formRef.current) {
      const formData = new FormData(formRef.current)
      onSubmit(formData)
    }
  }

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {children}
        </div>
        
        {onSubmit && (
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            
            <Button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? 'Submitting...' : undefined}
            >
              {loading ? 'Submitting...' : submitText}
            </Button>
          </div>
        )}
      </form>
    </AccessibleModal>
  )
}

// Drawer/Sidebar Modal
interface AccessibleDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  side?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
}

export function AccessibleDrawer({
  isOpen,
  onClose,
  children,
  title,
  side = 'right',
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true
}: AccessibleDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const titleId = a11y.useIds('drawer-title').id

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape])

  // Focus management
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const cleanup = a11y.focus.trapFocus(drawerRef.current)
      drawerRef.current.focus()
      
      return cleanup
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[28rem]'
  }

  const slideClasses = {
    left: 'left-0',
    right: 'right-0'
  }

  const drawerContent = (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          "absolute inset-y-0 bg-white dark:bg-gray-900 shadow-xl",
          "flex flex-col max-w-full",
          slideClasses[side],
          sizeClasses[size]
        )}
        {...a11y.attributes.modal(title ? titleId : '')}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            {title && (
              <h2 
                id={titleId}
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label={a11y.labels.closeDrawer}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' 
    ? createPortal(drawerContent, document.body)
    : null
}

// Custom hook for modal state management
export function useAccessibleModal(initialState = false) {
  const [isOpen, setIsOpen] = React.useState(initialState)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle
  }
}