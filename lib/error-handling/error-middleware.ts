/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { clientLogger as secureLogger, LogCategory } from '@/lib/logging/client-logger';

// Local safe property access to avoid circular dependencies
function safeGet<T>(obj: unknown, path: string[]): T | undefined {
  let current = obj
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return current as T
}

// Error types for classification
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR', 
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Structured error interface
export interface StructuredError {
  type: ErrorType;
  message: string;
  statusCode: number;
  severity: ErrorSeverity;
  userId?: string;
  context?: Record<string, unknown>;
  originalError?: Error;
  timestamp?: Date;
  requestId?: string;
}

// Production-safe error responses (sanitized for client)
export interface ClientErrorResponse {
  error: string;
  code: string;
  timestamp: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

// Error classification helpers
export class ErrorClassifier {
  static classifyDatabaseError(error: Error & { code?: string }): StructuredError {
    // Remove unused variable
    // const message = error?.message || 'Database operation failed';
    
    // Classify by PostgreSQL error codes
    if (error?.code === 'PGRST116') {
      return {
        type: ErrorType.NOT_FOUND,
        message: 'Resource not found',
        statusCode: 404,
        severity: ErrorSeverity.LOW,
        originalError: error
      };
    }
    
    if (error?.code?.startsWith('23')) { // Integrity constraint violations
      return {
        type: ErrorType.VALIDATION,
        message: 'Data validation failed',
        statusCode: 400,
        severity: ErrorSeverity.MEDIUM,
        originalError: error
      };
    }
    
    if (error?.code === '42501') { // Insufficient privilege
      return {
        type: ErrorType.AUTHORIZATION,
        message: 'Insufficient permissions',
        statusCode: 403,
        severity: ErrorSeverity.HIGH,
        originalError: error
      };
    }
    
    // Generic database error
    return {
      type: ErrorType.DATABASE,
      message: 'Database operation failed',
      statusCode: 500,
      severity: ErrorSeverity.HIGH,
      originalError: error
    };
  }
  
  static classifyValidationError(error: z.ZodError): StructuredError {
    return {
      type: ErrorType.VALIDATION,
      message: 'Request validation failed',
      statusCode: 400,
      severity: ErrorSeverity.LOW,
      context: {
        validationErrors: (safeGet(error, ['errors']) as Array<any> || []).map((err: any) => ({
          path: (safeGet(err, ['path']) as Array<string> || []).join('.'),
          message: String(safeGet(err, ['message']) || 'Validation error')
        }))
      },
      originalError: error
    };
  }
  
  static classifyAuthError(message: string, isAuthorization = false): StructuredError {
    return {
      type: isAuthorization ? ErrorType.AUTHORIZATION : ErrorType.AUTHENTICATION,
      message,
      statusCode: isAuthorization ? 403 : 401,
      severity: ErrorSeverity.MEDIUM
    };
  }
  
  static classifyGenericError(error: Error): StructuredError {
    return {
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred',
      statusCode: 500,
      severity: ErrorSeverity.CRITICAL,
      originalError: error
    };
  }
}

// Centralized error handler
export class ErrorHandler {
  private static generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
  
  static async handleError(
    error: StructuredError,
    request: NextRequest,
    userId?: string
  ): Promise<NextResponse> {
    const requestId = this.generateRequestId();
    const timestamp = new Date();
    
    // Enrich error with request context
    
    // Log error securely (never expose sensitive data)
    await secureLogger.error(LogCategory.API, 'API Error', undefined, {
      requestId,
      type: error.type,
      severity: error.severity,
      statusCode: error.statusCode,
      method: request.method,
      url: request.url,
      userId,
      timestamp: timestamp.toISOString(),
      // Only log safe error details
      errorMessage: error.severity === ErrorSeverity.CRITICAL ? 
        'Critical system error' : error.message
    });
    
    // Create sanitized client response
    const clientResponse: ClientErrorResponse = {
      error: this.sanitizeErrorMessage(error),
      code: error.type,
      timestamp: timestamp.toISOString(),
      requestId
    };
    
    // Add details for non-sensitive validation errors
    if (error.type === ErrorType.VALIDATION && error.context?.validationErrors) {
      clientResponse.details = {
        validationErrors: error.context.validationErrors
      };
    }
    
    const response = NextResponse.json(clientResponse, { 
      status: error.statusCode 
    });
    
    // Add security headers
    this.addSecurityHeaders(response);
    
    return response;
  }
  
  private static sanitizeErrorMessage(error: StructuredError): string {
    // Never expose internal details in production
    if (process.env.NODE_ENV === 'production') {
      switch (error.type) {
        case ErrorType.VALIDATION:
          return 'Invalid request data';
        case ErrorType.AUTHENTICATION:
          return 'Authentication required';
        case ErrorType.AUTHORIZATION:
          return 'Access denied';
        case ErrorType.NOT_FOUND:
          return 'Resource not found';
        case ErrorType.RATE_LIMIT:
          return 'Rate limit exceeded';
        case ErrorType.DATABASE:
        case ErrorType.INTERNAL:
          return 'Internal server error';
        case ErrorType.EXTERNAL_API:
          return 'Service temporarily unavailable';
        case ErrorType.BUSINESS_LOGIC:
          return 'Operation not allowed';
        default:
          return 'An error occurred';
      }
    }
    
    // In development, show more details
    return error.message;
  }
  
  private static addSecurityHeaders(response: NextResponse): void {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
}

// Convenience functions for common error scenarios
export const errorResponses = {
  async validation(error: z.ZodError, request: NextRequest, userId?: string) {
    const structuredError = ErrorClassifier.classifyValidationError(error);
    return ErrorHandler.handleError(structuredError, request, userId);
  },
  
  async unauthorized(message: string, request: NextRequest) {
    const structuredError = ErrorClassifier.classifyAuthError(message, false);
    return ErrorHandler.handleError(structuredError, request);
  },
  
  async forbidden(message: string, request: NextRequest, userId?: string) {
    const structuredError = ErrorClassifier.classifyAuthError(message, true);
    return ErrorHandler.handleError(structuredError, request, userId);
  },
  
  async notFound(message: string, request: NextRequest, userId?: string) {
    const structuredError: StructuredError = {
      type: ErrorType.NOT_FOUND,
      message,
      statusCode: 404,
      severity: ErrorSeverity.LOW
    };
    return ErrorHandler.handleError(structuredError, request, userId);
  },
  
  async database(error: Error & { code?: string }, request: NextRequest, userId?: string) {
    const structuredError = ErrorClassifier.classifyDatabaseError(error);
    return ErrorHandler.handleError(structuredError, request, userId);
  },
  
  async internal(error: Error, request: NextRequest, userId?: string) {
    const structuredError = ErrorClassifier.classifyGenericError(error);
    return ErrorHandler.handleError(structuredError, request, userId);
  },
  
  async businessLogic(message: string, request: NextRequest, userId?: string, context?: Record<string, unknown>) {
    const structuredError: StructuredError = {
      type: ErrorType.BUSINESS_LOGIC,
      message,
      statusCode: 422,
      severity: ErrorSeverity.MEDIUM,
      context
    };
    return ErrorHandler.handleError(structuredError, request, userId);
  }
};

// Error boundary wrapper for API routes
export function withErrorHandler<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      // Handle unexpected errors
      if (error instanceof z.ZodError) {
        return errorResponses.validation(error, request);
      }
      
      if (error instanceof Error) {
        return errorResponses.internal(error, request);
      }
      
      // Handle unknown error types
      const unknownError = new Error('Unknown error occurred');
      return errorResponses.internal(unknownError, request);
    }
  };
}

// Legacy alias for backwards compatibility
export const handleAPIError = errorResponses.internal;