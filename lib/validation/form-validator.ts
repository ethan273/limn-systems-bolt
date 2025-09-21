/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Standardized Form Validation System for Limn Systems
 * 
 * This module provides consistent validation patterns and error handling
 * across all forms in the application.
 */

import { z } from 'zod'

// Standard validation patterns
export const ValidationPatterns = {
  // Text fields
  requiredString: (fieldName: string, minLength = 1) => 
    z.string()
      .trim()
      .min(minLength, `${fieldName} is required`)
      .max(255, `${fieldName} must be less than 255 characters`),

  optionalString: (maxLength = 255) =>
    z.string().max(maxLength).optional(),

  // Names and titles
  name: (fieldName: string) =>
    z.string()
      .trim()
      .min(2, `${fieldName} must be at least 2 characters`)
      .max(100, `${fieldName} must be less than 100 characters`)
      .regex(/^[a-zA-Z0-9\s\-_]+$/, `${fieldName} contains invalid characters`),

  title: (fieldName: string) =>
    z.string()
      .trim()
      .min(3, `${fieldName} must be at least 3 characters`)
      .max(100, `${fieldName} must be less than 100 characters`),

  // Numbers
  positiveNumber: (fieldName: string) =>
    z.number()
      .positive(`${fieldName} must be greater than 0`)
      .finite(`${fieldName} must be a valid number`),

  optionalPositiveNumber: () =>
    z.number()
      .positive()
      .finite()
      .optional(),

  // Currency/Price
  currency: (fieldName: string) =>
    z.number()
      .min(0, `${fieldName} cannot be negative`)
      .max(999999.99, `${fieldName} is too large`)
      .multipleOf(0.01, `${fieldName} must have at most 2 decimal places`),

  // Quantity
  quantity: () =>
    z.number()
      .int('Quantity must be a whole number')
      .min(1, 'Quantity must be at least 1')
      .max(9999, 'Quantity cannot exceed 9999'),

  // Dates
  futureDate: (fieldName: string) =>
    z.string()
      .refine(
        (date) => new Date(date) > new Date(),
        `${fieldName} must be in the future`
      ),

  dateRange: (startDate: string) =>
    z.string()
      .refine(
        (date) => new Date(date) >= new Date(startDate),
        `End date must be after start date`
      ),

  // Email
  email: () =>
    z.string()
      .email('Please enter a valid email address')
      .max(255, 'Email must be less than 255 characters'),

  // Phone
  phone: () =>
    z.string()
      .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
      .min(10, 'Phone number must be at least 10 digits')
      .max(20, 'Phone number must be less than 20 characters'),

  // Select/Enum values
  enum: <T extends string>(values: readonly T[], fieldName: string) =>
    z.enum(values as [T, ...T[]], {
      message: `Please select a valid ${fieldName}`
    }),

  // Arrays
  nonEmptyArray: <T>(schema: z.ZodType<T>, fieldName: string) =>
    z.array(schema)
      .min(1, `At least one ${fieldName} is required`),

  // File uploads
  file: (maxSize: number, allowedTypes: string[]) =>
    z.object({
      name: z.string(),
      size: z.number().max(maxSize, `File size must be less than ${maxSize / 1024 / 1024}MB`),
      type: z.string().refine(
        (type) => allowedTypes.includes(type),
        `File type must be one of: ${allowedTypes.join(', ')}`
      )
    }),

  // URLs
  url: (fieldName: string) =>
    z.string()
      .url(`${fieldName} must be a valid URL`)
      .max(500, `${fieldName} must be less than 500 characters`),

  // Description/Text areas
  description: (maxLength = 500) =>
    z.string()
      .max(maxLength, `Description must be less than ${maxLength} characters`)
      .optional(),

  // Passwords
  password: () =>
    z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain at least one number')
}

// Common form schemas
export const CommonSchemas: Record<string, any> = {
  // Order Creation Form
  orderItem: z.object({
    collection_id: ValidationPatterns.requiredString('Collection'),
    item_id: ValidationPatterns.requiredString('Item'),
    price: ValidationPatterns.currency('Price'),
    quantity: ValidationPatterns.quantity(),
    is_rush: z.boolean().default(false),
    materials: z.record(z.string(), z.string()).optional()
  }),

  orderForm: z.object({
    client_name: ValidationPatterns.name('Client name'),
    estimated_delivery: ValidationPatterns.futureDate('Estimated delivery'),
    items: ValidationPatterns.nonEmptyArray(z.lazy(() => CommonSchemas.orderItem), 'item'),
    project_id: z.string().optional()
  }),

  // Budget Form
  budgetForm: z.object({
    name: ValidationPatterns.title('Budget name'),
    category: ValidationPatterns.enum(['Production', 'Design', 'Marketing', 'Operations', 'Technology', 'Administration', 'Sales', 'Shipping'], 'category'),
    department: ValidationPatterns.enum(['Design', 'Production', 'Sales', 'Administration', 'Finance', 'Operations'], 'department'),
    period_id: ValidationPatterns.requiredString('Period'),
    amount: ValidationPatterns.currency('Amount')
  }),

  // Task Form
  taskForm: z.object({
    title: ValidationPatterns.title('Task title'),
    description: ValidationPatterns.description(500),
    priority: ValidationPatterns.enum(['low', 'medium', 'high', 'urgent'], 'priority'),
    department: ValidationPatterns.enum(['design', 'production', 'sales', 'admin', 'finance'], 'department'),
    visibility: ValidationPatterns.enum(['private', 'department', 'company'], 'visibility'),
    mentioned_users: z.array(z.string()).optional()
  }),

  // User Profile
  userProfile: z.object({
    first_name: ValidationPatterns.name('First name'),
    last_name: ValidationPatterns.name('Last name'),
    email: ValidationPatterns.email(),
    phone: ValidationPatterns.phone().optional(),
    department: ValidationPatterns.enum(['Design', 'Production', 'Sales', 'Administration', 'Finance', 'Operations'], 'department').optional()
  }),

  // Collection Form
  collectionForm: z.object({
    name: ValidationPatterns.title('Collection name'),
    description: ValidationPatterns.description(1000),
    category: ValidationPatterns.requiredString('Category')
  }),

  // Item Form
  itemForm: z.object({
    name: ValidationPatterns.title('Item name'),
    description: ValidationPatterns.description(500),
    base_price: ValidationPatterns.currency('Base price'),
    collection_id: ValidationPatterns.requiredString('Collection'),
    sku: ValidationPatterns.requiredString('SKU').optional()
  })
}

// Validation helper functions
export class FormValidator {
  /**
   * Validates form data against a schema and returns formatted errors
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean
    data?: T
    errors?: Record<string, string>
  } {
    try {
      const result = schema.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.issues.forEach((err) => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        return { success: false, errors }
      }
      return { success: false, errors: { general: 'Validation failed' } }
    }
  }

  /**
   * Validates a single field
   */
  static validateField<T>(schema: z.ZodSchema<T>, value: unknown): {
    success: boolean
    error?: string
  } {
    try {
      schema.parse(value)
      return { success: true }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.issues[0]?.message || 'Invalid value' }
      }
      return { success: false, error: 'Validation failed' }
    }
  }

  /**
   * Sanitizes string input by trimming whitespace and removing dangerous characters
   */
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
  }

  /**
   * Formats currency value for display
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  /**
   * Parses currency string to number
   */
  static parseCurrency(value: string): number {
    const cleaned = value.replace(/[^0-9.-]+/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100
  }

  /**
   * Validates file upload
   */
  static validateFile(
    file: File,
    maxSize: number,
    allowedTypes: string[]
  ): { valid: boolean; error?: string } {
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
      }
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type must be one of: ${allowedTypes.join(', ')}`
      }
    }

    return { valid: true }
  }
}

// Error message constants
export const ErrorMessages = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_WEAK: 'Password must contain uppercase, lowercase, and numbers',
  AMOUNT_NEGATIVE: 'Amount cannot be negative',
  QUANTITY_INVALID: 'Quantity must be a positive whole number',
  DATE_FUTURE: 'Date must be in the future',
  FILE_TOO_LARGE: 'File size is too large',
  FILE_TYPE_INVALID: 'File type is not supported',
  GENERIC_ERROR: 'An error occurred. Please try again.'
} as const

// Success message constants
export const SuccessMessages = {
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SAVED: 'Saved successfully',
  SUBMITTED: 'Submitted successfully'
} as const

export type ValidationError = {
  field: string
  message: string
}

export type ValidationResult<T> = {
  success: boolean
  data?: T
  errors?: ValidationError[]
}