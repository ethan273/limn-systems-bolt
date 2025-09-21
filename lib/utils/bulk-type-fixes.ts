// Bulk TypeScript error fix utilities
// Common patterns to fix TypeScript errors efficiently

import { NextRequest } from 'next/server'

// Safe error handler that ensures proper types
export function safeHandleAPIError(error: unknown, message: string, request: NextRequest, userId?: string) {
  // Implement basic error handling without circular dependency
  console.error('API Error:', { error, message, userId })
  return new Response(
    JSON.stringify({ error: message }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}

// Safe property access for unknown objects
export function safeGet<T>(obj: unknown, path: string[]): T | undefined {
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

// Safe string formatting for undefined/null values
export function safeStringReplace(value: unknown, search: string, replace: string, fallback: string = 'unknown'): string {
  if (value == null || value === undefined) return fallback
  return String(value).replace(search, replace)
}

// Safe underscore formatting - prevents contact.source.replace runtime errors
export function safeUnderscoreFormat(value: unknown, fallback: string = 'unknown'): string {
  return safeStringReplace(value, '_', ' ', fallback)
}

// Safe arithmetic operations
export function safeAdd(a: unknown, b: unknown): number {
  const numA = typeof a === 'number' ? a : 0
  const numB = typeof b === 'number' ? b : 0
  return numA + numB
}

export function safeDivide(a: unknown, b: unknown): number {
  const numA = typeof a === 'number' ? a : 0
  const numB = typeof b === 'number' && b !== 0 ? b : 1
  return numA / numB
}

export function safeMultiply(a: unknown, b: unknown): number {
  const numA = typeof a === 'number' ? a : 0
  const numB = typeof b === 'number' ? b : 0
  return numA * numB
}

// Safe array access
export function safeArrayAccess<T>(arr: unknown): T[] {
  return Array.isArray(arr) ? arr : []
}

// Safe object spread
export function safeSpread<T extends Record<string, unknown>>(obj: unknown): T {
  return (obj && typeof obj === 'object') ? obj as T : {} as T
}

// Type-safe property checker
export function hasProperty<K extends string>(
  obj: unknown, 
  prop: K
): obj is Record<K, unknown> {
  return obj !== null && typeof obj === 'object' && prop in obj
}

// Rate limit config helper
export interface SafeRateLimitConfig {
  window: number
  requests: number
  skipOnError?: boolean
}

export function createSafeRateLimitConfig(
  window: number, 
  requests: number,
  skipOnError: boolean = false
): SafeRateLimitConfig {
  return { window, requests, skipOnError }
}

// Permission checking utilities
export interface PermissionCheckResult {
  valid: boolean
  error?: string
  statusCode?: number
  user?: {
    id: string
    email: string
    role: string
  }
}

// Validation error utilities
export interface SafeValidationError {
  path: string[]
  message: string
  code: 'invalid_type' | 'invalid_literal' | 'custom'
  expected?: string
}

export function createValidationError(
  path: string[] = [], 
  message: string = 'Validation failed',
  expected?: string
): SafeValidationError {
  return {
    path,
    message,
    code: expected ? 'invalid_type' : 'custom',
    expected
  }
}

// Database query result handler
export function safeDatabaseResult<T>(result: {
  data: unknown
  error: unknown
}): {
  data: T[] | null
  error: Error | null
} {
  return {
    data: Array.isArray(result.data) ? result.data as T[] : null,
    error: result.error instanceof Error ? result.error : null
  }
}