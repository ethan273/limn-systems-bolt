"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success" | "info"
  duration?: number
}

interface ToastContextType {
  toast: (props: ToastProps) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = React.useCallback((props: ToastProps) => {
    const message = props.title || props.description || 'Notification'
    const options = {
      duration: props.duration || 4000,
    }

    switch (props.variant) {
      case 'destructive':
        sonnerToast.error(message, options)
        break
      case 'success':
        sonnerToast.success(message, options)
        break
      case 'info':
        sonnerToast.info(message, options)
        break
      default:
        sonnerToast(message, options)
        break
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Direct export for convenience
export const toast = {
  success: (message: string, duration?: number) => sonnerToast.success(message, { duration }),
  error: (message: string, duration?: number) => sonnerToast.error(message, { duration }),
  info: (message: string, duration?: number) => sonnerToast.info(message, { duration }),
  default: (message: string, duration?: number) => sonnerToast(message, { duration }),
}