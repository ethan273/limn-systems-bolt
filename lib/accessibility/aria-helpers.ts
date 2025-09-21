import { useId } from 'react'

// ARIA label generators for common patterns
export const ariaLabels = {
  // Form elements
  required: (label: string) => `${label} (required)`,
  optional: (label: string) => `${label} (optional)`,
  invalid: (label: string, error: string) => `${label}, ${error}`,
  
  // Loading states
  loading: (action?: string) => action ? `Loading ${action}...` : 'Loading...',
  
  // Actions
  delete: (item: string) => `Delete ${item}`,
  edit: (item: string) => `Edit ${item}`,
  view: (item: string) => `View ${item}`,
  download: (item: string) => `Download ${item}`,
  upload: (type?: string) => type ? `Upload ${type}` : 'Upload file',
  
  // Navigation
  breadcrumb: 'Breadcrumb navigation',
  pagination: 'Pagination navigation',
  mainNav: 'Main navigation',
  userMenu: 'User account menu',
  
  // Status indicators
  success: (message: string) => `Success: ${message}`,
  error: (message: string) => `Error: ${message}`,
  warning: (message: string) => `Warning: ${message}`,
  info: (message: string) => `Information: ${message}`,
  
  // Data tables
  sortAsc: (column: string) => `Sort ${column} ascending`,
  sortDesc: (column: string) => `Sort ${column} descending`,
  sortable: (column: string) => `${column}, sortable column`,
  
  // Modal and overlays
  closeModal: 'Close modal',
  closeDialog: 'Close dialog',
  closeDrawer: 'Close drawer',
  
  // Expandable content
  expand: (content: string) => `Expand ${content}`,
  collapse: (content: string) => `Collapse ${content}`,
  
  // Search
  searchResults: (count: number, query?: string) => {
    const results = count === 1 ? 'result' : 'results'
    return query ? 
      `${count} search ${results} for "${query}"` : 
      `${count} search ${results}`
  },
  
  // Charts and data visualization
  chart: (type: string, title?: string) => 
    title ? `${type} chart: ${title}` : `${type} chart`,
  
  // Progress indicators
  progress: (current: number, total: number, label?: string) => 
    label ? 
      `${label}: ${current} of ${total}` : 
      `Progress: ${current} of ${total}`,
}

// Hook for generating consistent IDs for accessibility
export function useAccessibleIds(prefix = 'accessible') {
  const baseId = useId()
  
  return {
    id: `${prefix}-${baseId}`,
    labelId: `${prefix}-${baseId}-label`,
    descriptionId: `${prefix}-${baseId}-description`,
    errorId: `${prefix}-${baseId}-error`,
    helpId: `${prefix}-${baseId}-help`
  }
}

// ARIA attributes generators
export const ariaAttributes = {
  // Form field with label and description
  formField: (ids: ReturnType<typeof useAccessibleIds>, isRequired = false, isInvalid = false) => ({
    id: ids.id,
    'aria-labelledby': ids.labelId,
    'aria-describedby': `${ids.descriptionId} ${isInvalid ? ids.errorId : ''}`.trim(),
    'aria-required': isRequired,
    'aria-invalid': isInvalid
  }),
  
  // Button with loading state
  button: (isLoading = false, loadingText = 'Loading...') => ({
    'aria-busy': isLoading,
    'aria-live': isLoading ? 'polite' : undefined,
    'aria-label': isLoading ? loadingText : undefined
  }),
  
  // Expandable content
  expandable: (isExpanded: boolean, controlsId: string) => ({
    'aria-expanded': isExpanded,
    'aria-controls': controlsId
  }),
  
  // Modal dialog
  modal: (titleId: string, descriptionId?: string) => ({
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    'aria-describedby': descriptionId
  }),
  
  // Alert/status message
  alert: (type: 'error' | 'warning' | 'info' | 'success' = 'info') => ({
    role: type === 'error' ? 'alert' : 'status',
    'aria-live': type === 'error' ? 'assertive' : 'polite',
    'aria-atomic': true
  }),
  
  // Data table
  table: (caption?: string) => ({
    role: 'table',
    'aria-label': caption
  }),
  
  // Sortable table header
  tableHeader: (sortDirection?: 'asc' | 'desc') => ({
    role: 'columnheader',
    'aria-sort': sortDirection || 'none',
    tabIndex: 0
  }),
  
  // Navigation landmark
  navigation: (label: string) => ({
    role: 'navigation',
    'aria-label': label
  }),
  
  // Search landmark
  search: () => ({
    role: 'search'
  }),
  
  // Tab panel
  tabPanel: (tabId: string, isSelected: boolean) => ({
    role: 'tabpanel',
    'aria-labelledby': tabId,
    hidden: !isSelected
  }),
  
  // Tab button
  tab: (panelId: string, isSelected: boolean) => ({
    role: 'tab',
    'aria-controls': panelId,
    'aria-selected': isSelected,
    tabIndex: isSelected ? 0 : -1
  })
}

// Screen reader utilities
export const screenReader = {
  // Text that's only visible to screen readers
  only: (text: string) => ({
    className: 'sr-only',
    children: text
  }),
  
  // Announce dynamic content changes
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (typeof window === 'undefined') return
    
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }
}

// Focus management utilities
export const focusManagement = {
  // Get all focusable elements within a container
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(', ')
    
    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter((element): element is HTMLElement => {
        return element instanceof HTMLElement && 
               element.offsetParent !== null && // Not hidden
               !element.hasAttribute('hidden')
      })
  },
  
  // Trap focus within a container (for modals, dialogs)
  trapFocus: (container: HTMLElement) => {
    const focusableElements = focusManagement.getFocusableElements(container)
    if (focusableElements.length === 0) return () => {}
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }
    
    container.addEventListener('keydown', handleKeyDown)
    
    // Focus first element
    firstElement.focus()
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  },
  
  // Save and restore focus
  saveFocus: () => {
    const activeElement = document.activeElement as HTMLElement
    
    return () => {
      if (activeElement && activeElement.focus) {
        activeElement.focus()
      }
    }
  }
}

// Keyboard navigation helpers
export const keyboardNavigation = {
  // Standard arrow key navigation for lists/grids
  arrowKeyHandler: (
    event: React.KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    orientation: 'horizontal' | 'vertical' | 'both' = 'vertical'
  ) => {
    let newIndex = currentIndex
    
    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
        }
        break
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
        }
        break
      case 'Home':
        event.preventDefault()
        newIndex = 0
        break
      case 'End':
        event.preventDefault()
        newIndex = items.length - 1
        break
    }
    
    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus()
      return newIndex
    }
    
    return currentIndex
  }
}

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance
  getLuminance: (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  },
  
  // Calculate contrast ratio between two colors
  getContrastRatio: (color1: string, color2: string): number => {
    // This is a simplified version - in production, you'd want a more robust color parser
    const hex1 = color1.replace('#', '')
    const hex2 = color2.replace('#', '')
    
    const r1 = parseInt(hex1.substr(0, 2), 16)
    const g1 = parseInt(hex1.substr(2, 2), 16)
    const b1 = parseInt(hex1.substr(4, 2), 16)
    
    const r2 = parseInt(hex2.substr(0, 2), 16)
    const g2 = parseInt(hex2.substr(2, 2), 16)
    const b2 = parseInt(hex2.substr(4, 2), 16)
    
    const lum1 = colorContrast.getLuminance(r1, g1, b1)
    const lum2 = colorContrast.getLuminance(r2, g2, b2)
    
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    
    return (brightest + 0.05) / (darkest + 0.05)
  },
  
  // Check if contrast ratio meets WCAG standards
  meetsWCAG: (color1: string, color2: string, level: 'AA' | 'AAA' = 'AA', size: 'normal' | 'large' = 'normal'): boolean => {
    const ratio = colorContrast.getContrastRatio(color1, color2)
    
    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7
    } else {
      return size === 'large' ? ratio >= 3 : ratio >= 4.5
    }
  }
}

// Reduced motion utilities
export const reducedMotion = {
  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },
  
  // Conditional animation styles
  respectMotionPreference: (animationStyles: React.CSSProperties, staticStyles?: React.CSSProperties): React.CSSProperties => {
    if (reducedMotion.prefersReducedMotion()) {
      return staticStyles || {}
    }
    return animationStyles
  }
}

// Export all utilities as a single object
export const a11y = {
  labels: ariaLabels,
  attributes: ariaAttributes,
  screenReader,
  focus: focusManagement,
  keyboard: keyboardNavigation,
  contrast: colorContrast,
  motion: reducedMotion,
  useIds: useAccessibleIds
}