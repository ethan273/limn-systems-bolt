/**
 * Centralized error handling utilities for the application
 */

export interface ApiError extends Error {
  status?: number
  statusText?: string
  code?: string
}

export interface ErrorHandlerOptions {
  fallbackData?: unknown
  showToast?: boolean
  logError?: boolean
  retryable?: boolean
  context?: string
}

/**
 * Enhanced fetch wrapper with automatic retry and error handling
 */
export async function apiRequest<T>(
  url: string, 
  options: RequestInit = {},
  handlerOptions: ErrorHandlerOptions = {}
): Promise<T> {
  const {
    fallbackData = null,
    logError = true,
    retryable = true,
    context = 'API Request'
  } = handlerOptions

  const maxRetries = retryable ? 3 : 0
  let lastError: ApiError | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as ApiError
        error.status = response.status
        error.statusText = response.statusText
        
        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500 && attempt === 0) {
          throw error
        }
        
        throw error
      }

      const data = await response.json()
      return data.data || data
    } catch (error) {
      lastError = error as ApiError
      
      if (logError && attempt === maxRetries) {
        console.error(`${context} failed after ${maxRetries + 1} attempts:`, {
          url,
          error: error instanceof Error ? error.message : error,
          attempt: attempt + 1
        })
      }

      // If this is the last attempt, handle the error
      if (attempt === maxRetries) {
        if (fallbackData !== null) {
          if (logError) {
            console.warn(`${context}: Using fallback data due to error:`, error)
          }
          return fallbackData as T
        }
        throw lastError
      }

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Standardized error message formatter
 */
export function formatErrorMessage(error: unknown, context?: string): string {
  if (error instanceof Error) {
    const apiError = error as ApiError
    
    // Handle specific HTTP status codes
    if (apiError.status) {
      switch (apiError.status) {
        case 400:
          return 'Bad request. Please check your input and try again.'
        case 401:
          return 'Authentication required. Please log in and try again.'
        case 403:
          return 'Access denied. You don\'t have permission for this action.'
        case 404:
          return 'Resource not found. It may have been deleted or moved.'
        case 409:
          return 'Conflict detected. The resource may have been modified by another user.'
        case 422:
          return 'Validation error. Please check your input and try again.'
        case 429:
          return 'Too many requests. Please wait a moment and try again.'
        case 500:
          return 'Server error. Please try again later.'
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again later.'
        default:
          return apiError.message || 'An unexpected error occurred.'
      }
    }

    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return context ? `Failed to ${context.toLowerCase()}` : 'An unexpected error occurred'
}

/**
 * Error boundary hook for React components
 */
export function useErrorHandler() {
  const handleError = (error: unknown, context?: string) => {
    const message = formatErrorMessage(error, context)
    console.error('Error handled:', { error, context, message })
    return message
  }

  const handleAsyncError = async <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      return await asyncFn()
    } catch (error) {
      const message = handleError(error, context)
      
      if (fallback !== undefined) {
        return fallback
      }
      
      throw new Error(message)
    }
  }

  return { handleError, handleAsyncError }
}

/**
 * Retry mechanism for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    delay?: number
    exponentialBackoff?: boolean
    condition?: (error: unknown) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    exponentialBackoff = true,
    condition = () => true
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry if condition is not met
      if (!condition(error)) {
        throw error
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const waitTime = exponentialBackoff 
          ? delay * Math.pow(2, attempt) 
          : delay
        
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError
}

/**
 * Network status checker
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('fetch') || 
           error.message.includes('NetworkError') ||
           error.message.includes('Failed to fetch')
  }
  return false
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const apiError = error as ApiError
    
    // Network errors are retryable
    if (isNetworkError(error)) {
      return true
    }
    
    // Server errors (5xx) are retryable
    if (apiError.status && apiError.status >= 500) {
      return true
    }
    
    // Rate limiting is retryable
    if (apiError.status === 429) {
      return true
    }
  }
  
  return false
}