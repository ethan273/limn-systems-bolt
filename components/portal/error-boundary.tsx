'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, MessageCircle, Bug } from 'lucide-react';
import { AnimatedButton } from './animated';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'section';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }

    // In production, log to error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/portal/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/portal';
  };

  private handleContactSupport = () => {
    // Open support chat or email
    window.open('mailto:support@limnsystems.com?subject=Portal Error Report', '_blank');
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component', showDetails = false } = this.props;
      const { error, errorInfo } = this.state;

      // Different error UIs based on error level
      if (level === 'page') {
        return <PageErrorFallback 
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          onContactSupport={this.handleContactSupport}
          onReload={this.handleReload}
          showDetails={showDetails}
        />;
      }

      if (level === 'section') {
        return <SectionErrorFallback 
          error={error}
          onRetry={this.handleRetry}
          showDetails={showDetails}
        />;
      }

      // Default component-level error
      return <ComponentErrorFallback 
        error={error}
        onRetry={this.handleRetry}
        showDetails={showDetails}
      />;
    }

    return this.props.children;
  }
}

// Page-level error fallback
function PageErrorFallback({
  error,
  errorInfo,
  onRetry,
  onGoHome,
  onContactSupport,
  onReload,
  showDetails,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
  onGoHome: () => void;
  onContactSupport: () => void;
  onReload: () => void;
  showDetails: boolean;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="mb-6 text-red-500"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <AlertTriangle className="h-16 w-16 mx-auto" />
        </motion.div>

        <motion.h1
          className="text-2xl font-bold text-gray-900 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Oops! Something went wrong
        </motion.h1>

        <motion.p
          className="text-gray-600 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          We encountered an unexpected error. Our team has been notified and is working to fix this issue.
        </motion.p>

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <AnimatedButton onClick={onRetry} variant="primary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </AnimatedButton>
            
            <AnimatedButton onClick={onGoHome} variant="secondary">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </AnimatedButton>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <AnimatedButton onClick={onReload} variant="ghost">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </AnimatedButton>
            
            <AnimatedButton onClick={onContactSupport} variant="ghost">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </AnimatedButton>
          </div>
        </motion.div>

        {showDetails && error && (
          <motion.details
            className="mt-8 text-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <summary className="cursor-pointer text-sm text-gray-500 mb-2">
              <Bug className="h-4 w-4 inline mr-1" />
              Error Details (for developers)
            </summary>
            <div className="bg-gray-100 p-4 rounded text-xs font-mono text-gray-700 overflow-auto max-h-40">
              <div className="mb-2">
                <strong>Error:</strong> {error.message}
              </div>
              <div>
                <strong>Stack:</strong>
                <pre className="whitespace-pre-wrap">{error.stack}</pre>
              </div>
              {errorInfo && (
                <div className="mt-2">
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          </motion.details>
        )}
      </motion.div>
    </div>
  );
}

// Section-level error fallback
function SectionErrorFallback({
  error,
  onRetry,
  showDetails,
}: {
  error: Error | null;
  onRetry: () => void;
  showDetails: boolean;
}) {
  return (
    <motion.div
      className="bg-red-50 border border-red-200 rounded-lg p-6 m-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Section Error</h3>
          <p className="text-sm text-red-700 mt-1">
            This section failed to load. Please try again.
          </p>
          <div className="mt-3">
            <AnimatedButton onClick={onRetry} variant="secondary" className="text-sm">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </AnimatedButton>
          </div>
          
          {showDetails && error && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-red-600">
                Error Details
              </summary>
              <pre className="text-xs text-red-600 mt-1 overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Component-level error fallback
function ComponentErrorFallback({
  error,
  onRetry,
  showDetails,
}: {
  error: Error | null;
  onRetry: () => void;
  showDetails: boolean;
}) {
  return (
    <motion.div
      className="bg-yellow-50 border border-yellow-200 rounded p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-2 text-yellow-800">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Component failed to load</span>
        <button
          onClick={onRetry}
          className="text-xs text-yellow-700 hover:text-yellow-900 underline ml-2"
        >
          Retry
        </button>
      </div>
      
      {showDetails && error && (
        <div className="mt-2 text-xs text-yellow-700">
          {error.message}
        </div>
      )}
    </motion.div>
  );
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    
    // Log error
    console.error('useErrorHandler caught error:', error);
    
    // Report to error service in production
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/portal/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(console.error);
    }
  }, []);

  // Re-throw error to trigger error boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
}

export default ErrorBoundary;