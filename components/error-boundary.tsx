'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { config } from '@/lib/config/environment'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  level?: 'page' | 'component' | 'critical'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(2, 15)
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    })

    // Log error to console in development
    if (config.isDevelopment()) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Report error to monitoring service
    this.reportError(error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
        level: this.props.level || 'component'
      }

      // Send to error tracking service (e.g., Sentry)
      if (config.logging().sentryEnabled) {
        // This would integrate with Sentry or similar service
        console.log('Error report would be sent to monitoring service:', errorReport)
      }

      // Send to internal logging API
      if (typeof window !== 'undefined') {
        fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorReport),
        }).catch(err => {
          console.error('Failed to send error report:', err)
        })
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Render different error UI based on level
      return this.renderErrorUI()
    }

    return this.props.children
  }

  private renderErrorUI() {
    const { level = 'component', showDetails = config.isDevelopment() } = this.props

    if (level === 'critical') {
      return this.renderCriticalError(showDetails)
    }

    if (level === 'page') {
      return this.renderPageError(showDetails)
    }

    return this.renderComponentError(showDetails)
  }

  private renderCriticalError(showDetails: boolean) {
    const { error, errorId } = this.state

    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Critical Error</CardTitle>
            <CardDescription className="text-red-700">
              The application encountered a critical error and needs to restart.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorId && (
              <div className="text-sm text-gray-600 text-center">
                Error ID: <code className="bg-gray-100 px-1 rounded">{errorId}</code>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <Button onClick={this.handleReload} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart Application
              </Button>
              
              <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            </div>

            {showDetails && error && (
              <details className="mt-4 p-2 bg-gray-100 rounded text-xs">
                <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  private renderPageError(showDetails: boolean) {
    const { error, errorId } = this.state

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              This page encountered an error. Please try refreshing or navigate to a different page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorId && (
              <div className="text-sm text-gray-600 text-center">
                Error ID: <code className="bg-gray-100 px-1 rounded">{errorId}</code>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={this.handleRetry} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {showDetails && error && (
              <details className="mt-4 p-2 bg-gray-100 rounded text-xs">
                <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  private renderComponentError(showDetails: boolean) {
    const { error, errorId } = this.state

    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-yellow-800">
                Component Error
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                This component failed to load properly.
              </p>
              {errorId && (
                <p className="text-xs text-yellow-600 mt-1">
                  Error ID: {errorId}
                </p>
              )}
            </div>
            <Button 
              onClick={this.handleRetry}
              size="sm"
              variant="outline"
              className="flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>

          {showDetails && error && (
            <details className="mt-3 p-2 bg-yellow-100 rounded text-xs">
              <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-xs">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    )
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Specialized error boundaries for different use cases
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">
    {children}
  </ErrorBoundary>
)

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component">
    {children}
  </ErrorBoundary>
)

export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="critical">
    {children}
  </ErrorBoundary>
)

// Hook for reporting errors manually
export function useErrorReporter() {
  const reportError = React.useCallback((error: Error, context?: Record<string, unknown>) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
    }

    // Send to error tracking service
    if (config.isDevelopment()) {
      console.error('Manual error report:', errorReport)
    }

    // Send to API
    if (typeof window !== 'undefined') {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      }).catch(err => {
        console.error('Failed to send error report:', err)
      })
    }
  }, [])

  return { reportError }
}