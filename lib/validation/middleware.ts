import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export type ValidationTarget = 'body' | 'query' | 'params' | 'headers'

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult<T = unknown> {
  success: boolean
  data?: T
  errors?: ValidationError[]
}

// Custom error class for validation errors
export class ValidationException extends Error {
  public errors: ValidationError[]
  public statusCode: number

  constructor(errors: ValidationError[], message = 'Validation failed') {
    super(message)
    this.name = 'ValidationException'
    this.errors = errors
    this.statusCode = 400
  }
}

// Helper function to format Zod errors
export function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }))
}

// Validate request data against a schema
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  target: ValidationTarget = 'body'
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data)
    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error)
      }
    }
    
    return {
      success: false,
      errors: [{
        field: target,
        message: 'Unknown validation error',
        code: 'custom'
      }]
    }
  }
}

// Middleware factory for API route validation
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  target: ValidationTarget = 'body'
) {
  return function validationMiddleware(
    handler: (req: NextRequest, validatedData: T, ...args: unknown[]) => Promise<NextResponse>
  ) {
    return async function (req: NextRequest, ...args: unknown[]): Promise<NextResponse> {
      try {
        let data: unknown

        switch (target) {
          case 'body':
            try {
              data = await req.json()
            } catch {
              return NextResponse.json(
                { 
                  error: 'Invalid JSON in request body',
                  code: 'INVALID_JSON'
                },
                { 
                  status: 400,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }
              )
            }
            break
          
          case 'query':
            data = Object.fromEntries(req.nextUrl.searchParams.entries())
            break
          
          case 'params':
            // Extract params from the URL - this would typically be handled by Next.js
            // In practice, params come from the route handler arguments
            data = args[0] || {}
            break
          
          case 'headers':
            data = Object.fromEntries(req.headers.entries())
            break
          
          default:
            return NextResponse.json(
              { 
                error: 'Invalid validation target',
                code: 'INVALID_TARGET'
              },
              { 
                status: 500,
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            )
        }

        const validation = validateData(schema, data, target)
        
        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: validation.errors
            },
            { 
              status: 400,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )
        }

        // Call the original handler with validated data
        return handler(req, validation.data as T, ...args)
        
      } catch (error) {
        console.error('Validation middleware error:', error)
        
        if (error instanceof ValidationException) {
          return NextResponse.json(
            {
              error: error.message,
              code: 'VALIDATION_ERROR',
              details: error.errors
            },
            { 
              status: error.statusCode,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )
        }
        
        return NextResponse.json(
          {
            error: 'Internal validation error',
            code: 'INTERNAL_ERROR'
          },
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      }
    }
  }
}

// Utility function for manual validation in route handlers
export async function validateRequest<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
  target: ValidationTarget = 'body'
): Promise<T> {
  let data: unknown

  switch (target) {
    case 'body':
      data = await req.json()
      break
    case 'query':
      data = Object.fromEntries(req.nextUrl.searchParams.entries())
      break
    case 'headers':
      data = Object.fromEntries(req.headers.entries())
      break
    default:
      throw new Error(`Invalid validation target: ${target}`)
  }

  const result = validateData(schema, data, target)
  
  if (!result.success) {
    throw new ValidationException(result.errors || [])
  }
  
  return result.data as T
}

// Sanitization utilities
export const sanitizers = {
  // Remove HTML tags and scripts
  stripHtml: (input: string): string => {
    return input.replace(/<[^>]*>/g, '').trim()
  },

  // Remove potentially dangerous characters
  stripDangerous: (input: string): string => {
    return input.replace(/[<>'"&]/g, '').trim()
  },

  // Normalize whitespace
  normalizeWhitespace: (input: string): string => {
    return input.replace(/\s+/g, ' ').trim()
  },

  // Ensure URL has protocol
  normalizeUrl: (input: string): string => {
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      return `https://${input}`
    }
    return input
  },

  // Remove non-alphanumeric characters from phone numbers
  normalizePhone: (input: string): string => {
    return input.replace(/[^\d+\-\(\)\s]/g, '').trim()
  }
}

// Rate limiting validation
export const rateLimitSchemas = {
  // Basic API rate limiting
  api: z.object({
    requests: z.number().max(100),
    windowMs: z.number().min(60000) // minimum 1 minute
  }),

  // Authentication rate limiting
  auth: z.object({
    requests: z.number().max(5),
    windowMs: z.number().min(900000) // minimum 15 minutes
  }),

  // File upload rate limiting
  upload: z.object({
    requests: z.number().max(10),
    windowMs: z.number().min(300000), // minimum 5 minutes
    maxFileSize: z.number().max(10 * 1024 * 1024) // 10MB
  })
}

// Security validation helpers
export const securityValidators = {
  // Check for SQL injection patterns
  hasSqlInjection: (input: string): boolean => {
    const sqlPatterns = [
      /union\s+select/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+set/i,
      /drop\s+table/i,
      /alter\s+table/i,
      /create\s+table/i,
      /exec\s*\(/i,
      /script\s*>/i
    ]
    return sqlPatterns.some(pattern => pattern.test(input))
  },

  // Check for XSS patterns
  hasXss: (input: string): boolean => {
    const xssPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
      /<form[^>]*>/i
    ]
    return xssPatterns.some(pattern => pattern.test(input))
  },

  // Check for path traversal
  hasPathTraversal: (input: string): boolean => {
    const pathPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
      /\.\.%2f/i,
      /\.\.%5c/i
    ]
    return pathPatterns.some(pattern => pattern.test(input))
  },

  // Validate that input doesn't contain suspicious patterns
  isSafe: (input: string): boolean => {
    return !securityValidators.hasSqlInjection(input) &&
           !securityValidators.hasXss(input) &&
           !securityValidators.hasPathTraversal(input)
  }
}

// Comprehensive validation middleware that includes security checks
export function withSecureValidation<T>(
  schema: z.ZodSchema<T>,
  target: ValidationTarget = 'body'
) {
  return withValidation(
    schema.refine((data) => {
      // Check all string fields for security issues
      const checkStrings = (obj: unknown): boolean => {
        if (typeof obj !== 'object' || obj === null) return true
        const record = obj as Record<string, unknown>
        for (const [key, value] of Object.entries(record)) {
          if (typeof value === 'string') {
            if (!securityValidators.isSafe(value)) {
              throw new z.ZodError([{
                code: 'custom',
                message: `Security validation failed for field: ${key}`,
                path: [key]
              }])
            }
          } else if (typeof value === 'object' && value !== null) {
            if (!checkStrings(value)) return false
          }
        }
        return true
      }
      
      return checkStrings(data)
    }, 'Security validation failed'),
    target
  )
}