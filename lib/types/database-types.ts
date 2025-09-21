/* eslint-disable @typescript-eslint/no-explicit-any */
// Database types and utilities for common TypeScript issues
// This file provides utility types to fix common database query patterns

import { PostgrestQueryBuilder } from '@supabase/postgrest-js'

// Common database row types
export interface BaseRow {
  id: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

// Production tracking types
export interface ProductionTracking extends BaseRow {
  order_id: string
  current_stage: string
  completed_at?: string | null
  estimated_completion?: string | null
  orders?: {
    id: string
    order_number: string
    customer_name: string
    priority: string
  }
  stage_history?: Array<{
    stage: string
    started_at: string
    completed_at?: string | null
    duration_hours?: number
  }>
}

export interface ProductionMilestone extends BaseRow {
  order_id: string
  milestone_type: string
  target_date: string
  completed_at?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
}

// Query result types
export interface QueryResult<T = BaseRow> {
  data: T[] | null
  error: Error | null
  count?: number | null
}

// Generic typed query builder utility
export type TypedQueryBuilder<T extends BaseRow> = PostgrestQueryBuilder<any, any, any, string, T>

// Helper function to safely access unknown properties
export function safeProp<T>(obj: unknown, prop: string): T | undefined {
  if (obj && typeof obj === 'object' && prop in obj) {
    return (obj as Record<string, unknown>)[prop] as T
  }
  return undefined
}

// Helper function for safe arithmetic operations
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }
  return fallback
}

// Helper function for safe string operations
export function safeString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') {
    return value
  }
  return fallback
}

// Helper for safe array operations
export function safeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }
  return []
}

// Validation error type for Zod compatibility
export interface TypedValidationError {
  path: string[]
  message: string
  code: string
  expected?: string
}

// Convert unknown validation errors to typed ones
export function toTypedValidationError(error: unknown): TypedValidationError {
  if (error && typeof error === 'object') {
    const typedError = error as any
    return {
      path: Array.isArray(typedError.path) ? typedError.path : [],
      message: typeof typedError.message === 'string' ? typedError.message : 'Validation error',
      code: typeof typedError.code === 'string' ? typedError.code : 'invalid_type',
      expected: typeof typedError.expected === 'string' ? typedError.expected : undefined
    }
  }
  return {
    path: [],
    message: 'Unknown validation error',
    code: 'invalid_type'
  }
}