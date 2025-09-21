// Safe rendering utilities to prevent "Objects are not valid as a React child" errors
// Following Limn Systems coding standards: zero tolerance for runtime errors

/**
 * Safely converts any value to a string for rendering
 * Prevents "Objects are not valid as a React child" errors
 */
export function safeRender(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  if (typeof value === 'string') {
    return value
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(item => safeRender(item)).join(', ')
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString()
    }
    
    if (isAddressObject(value)) {
      return formatAddress(value)
    }
    
    return ''
  }
  
  return String(value)
}

/**
 * Type guard for address objects
 */
function isAddressObject(obj: unknown): obj is AddressObject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (
      'street' in obj ||
      'city' in obj ||
      'state' in obj ||
      'zip' in obj ||
      'country' in obj
    )
  )
}

/**
 * Address object interface
 */
interface AddressObject {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

/**
 * Safely format address objects into readable strings
 */
export function formatAddress(address: unknown): string {
  if (!isAddressObject(address)) {
    return safeRender(address)
  }
  
  const parts: string[] = []
  
  if (address.street) {
    parts.push(address.street)
  }
  
  const cityStateZip = [address.city, address.state, address.zip]
    .filter(Boolean)
    .join(', ')
  
  if (cityStateZip) {
    parts.push(cityStateZip)
  }
  
  if (address.country && address.country !== 'US') {
    parts.push(address.country)
  }
  
  return parts.join(', ')
}

/**
 * Safe property access with fallback
 */
export function safeProperty<T>(obj: unknown, key: string, fallback: T): T {
  if (obj && typeof obj === 'object' && key in obj) {
    const value = (obj as Record<string, unknown>)[key]
    return (value as T) ?? fallback
  }
  return fallback
}

/**
 * Safe nested property access
 */
export function safeNestedProperty<T>(obj: unknown, path: string[], fallback: T): T {
  let current = obj
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return fallback
    }
  }
  return (current as T) ?? fallback
}

/**
 * Safe contact information rendering
 */
export function formatContact(contact: unknown): string {
  if (typeof contact === 'string') {
    return contact
  }
  
  if (contact && typeof contact === 'object') {
    const obj = contact as Record<string, unknown>
    const name = safeRender(obj.name)
    const email = safeRender(obj.email)
    const phone = safeRender(obj.phone)
    
    const parts = [name, email, phone].filter(Boolean)
    return parts.join(' • ')
  }
  
  return safeRender(contact)
}

/**
 * Safe array rendering with custom separator
 */
export function safeArrayRender(arr: unknown, separator: string = ', '): string {
  if (!Array.isArray(arr)) {
    return safeRender(arr)
  }
  
  return arr.map(item => safeRender(item)).filter(Boolean).join(separator)
}

/**
 * Safe JSON rendering for debugging (only in development)
 */
export function safeJsonRender(value: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return '[Circular Reference]'
    }
  }
  
  // In production, never render raw JSON
  return safeRender(value)
}