/**
 * Safe string utility functions for handling potentially null/undefined values
 * Prevents runtime errors when calling string methods on non-string values
 * 
 * ✅ CRITICAL: Always use these utilities instead of direct .replace() calls
 * ❌ NEVER: object.property.replace('_', ' ')  -- causes runtime errors
 * ✅ ALWAYS: safeFormatString(object.property, 'fallback')
 */

/**
 * Safely formats a string by replacing underscores with spaces and capitalizing
 * @param value - The value to format (can be null, undefined, or any type)
 * @param fallback - Fallback string to use if value is null/undefined (default: 'unknown')
 * @returns Formatted string with underscores replaced by spaces
 */
export function safeFormatString(value: unknown, fallback: string = 'unknown'): string {
  if (value == null) return fallback
  return String(value).replace('_', ' ')
}

/**
 * Safely formats a string by replacing ALL underscores with spaces
 * @param value - The value to format (can be null, undefined, or any type)
 * @param fallback - Fallback string to use if value is null/undefined (default: 'unknown')
 * @returns Formatted string with all underscores replaced by spaces
 */
export function safeFormatStringAll(value: unknown, fallback: string = 'unknown'): string {
  if (value == null) return fallback
  return String(value).replaceAll('_', ' ')
}

/**
 * Safely capitalizes the first letter of each word in a string
 * @param value - The value to capitalize (can be null, undefined, or any type)
 * @param fallback - Fallback string to use if value is null/undefined (default: 'unknown')
 * @returns Capitalized string
 */
export function safeCapitalize(value: unknown, fallback: string = 'unknown'): string {
  if (value == null) return fallback
  return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/**
 * Safely formats and capitalizes a string (combines safeFormatString + safeCapitalize)
 * @param value - The value to format (can be null, undefined, or any type)
 * @param fallback - Fallback string to use if value is null/undefined (default: 'unknown')
 * @returns Formatted and capitalized string
 */
export function safeFormatAndCapitalize(value: unknown, fallback: string = 'unknown'): string {
  if (value == null) return fallback
  const formatted = String(value).replace('_', ' ')
  return formatted.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/**
 * Safely converts a value to uppercase string
 * @param value - The value to convert (can be null, undefined, or any type)
 * @param fallback - Fallback string to use if value is null/undefined (default: 'UNKNOWN')
 * @returns Uppercase string
 */
export function safeToUpperCase(value: unknown, fallback: string = 'UNKNOWN'): string {
  if (value == null) return fallback
  return String(value).toUpperCase()
}