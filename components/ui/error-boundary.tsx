'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'section' | 'component'
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: Math.random().toString(36).substring(7)
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(7)
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString()
    })

    // Report to error tracking service
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // In production, send to error tracking service
      this.reportError(error, errorInfo)
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorId: this.state.errorId,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          level: this.props.level || 'component',
          context: {
            pathname: window.location.pathname,
            search: window.location.search
          }
        })
      })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: Math.random().toString(36).substring(7)
    })
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { level = 'component', showDetails = false } = this.props
      const { error, errorId } = this.state

      // Different UI based on error level
      if (level === 'page') {
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                Something went wrong
              </h1>
              
              <p className="text-slate-600 mb-6">
                We encountered an unexpected error. Our team has been notified and is working on a fix.
              </p>

              {showDetails && error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                    Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-slate-50 rounded text-xs font-mono text-slate-700 overflow-auto max-h-32">
                    <p><strong>Error ID:</strong> {errorId}</p>
                    <p><strong>Message:</strong> {error.message}</p>
                    {error.stack && (
                      <div className="mt-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs">{(error.stack || "").substring(0, 300)}...</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-6">
                Error ID: {errorId}
              </p>
            </div>
          </div>
        )
      }

      if (level === 'section') {
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 my-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  Section Error
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  This section encountered an error and couldn&apos;t load properly.
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={this.handleRetry}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Retry
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={this.handleReload}
                    className="text-red-700 hover:bg-red-100"
                  >
                    Refresh Page
                  </Button>
                </div>
                {showDetails && (
                  <p className="text-xs text-red-600 mt-3 font-mono">
                    Error ID: {errorId}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      }

      // Component level error
      return (
        <div className="bg-slate-50 border border-slate-200 rounded p-4 text-center">
          <AlertTriangle className="w-4 h-4 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-600 mb-2">
            Component failed to load
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={this.handleRetry}
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Hook for error reporting in functional components
export function useErrorHandler() {
  const reportError = React.useCallback((error: Error, context?: Record<string, unknown>) => {
    console.error('Manual error report:', error)
    
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          errorId: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          level: 'manual',
          context: {
            pathname: window.location.pathname,
            search: window.location.search,
            ...context
          }
        })
      }).catch(console.error)
    }
  }, [])

  return { reportError }
}