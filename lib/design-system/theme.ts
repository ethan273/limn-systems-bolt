// Centralized Design System Theme Configuration
// This file defines the complete design system for consistent UI across the application

export const theme = {
  // Color Palette - Based on existing CSS variables with expanded semantic colors
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#f2f7f7',
      100: '#daecec', 
      200: '#b8d9d8',
      300: '#95c6c5',
      400: '#88c0c0', // Main brand color - glacier
      500: '#88c0c0',
      600: '#6ba3a3',
      700: '#558686',
      800: '#446969',
      900: '#364d4d'
    },

    // Secondary - Graphite palette
    secondary: {
      50: '#f0f0f2',
      100: '#ced3d4',
      200: '#9ca4ab',
      300: '#788592',
      400: '#606c78', // Main graphite
      500: '#606c78',
      600: '#4d5660',
      700: '#3a4148',
      800: '#272b30',
      900: '#141518'
    },

    // Semantic Status Colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d'
    },

    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },

    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    },

    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },

    // Neutral Grays - Enhanced slate palette
    neutral: {
      0: '#ffffff',
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    },

    // Accent Color - Amber
    accent: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#db7f38', // From CSS
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    }
  },

  // Typography Scale
  typography: {
    fontFamily: {
      sans: ['Roboto', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      mono: ['Consolas', 'Monaco', 'Courier New', 'monospace']
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }]
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    }
  },

  // Spacing Scale (consistent with Tailwind)
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem'
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  },

  // Shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none'
  },

  // Z-Index Scale
  zIndex: {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    auto: 'auto',
    // Semantic z-index values
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modalBackdrop: '1040',
    modal: '1050',
    popover: '1060',
    tooltip: '1070'
  },

  // Animation & Transitions
  animation: {
    duration: {
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms'
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },

  // Breakpoints (for responsive design)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
} as const

// Semantic Color Mappings for specific UI elements
export const semanticColors = {
  // Text Colors
  text: {
    primary: theme.colors.neutral[900],
    secondary: theme.colors.neutral[700], 
    muted: theme.colors.neutral[500],
    disabled: theme.colors.neutral[400],
    inverse: theme.colors.neutral[0]
  },

  // Background Colors
  background: {
    primary: theme.colors.neutral[0],
    secondary: theme.colors.neutral[50],
    muted: theme.colors.neutral[100],
    elevated: theme.colors.neutral[0]
  },

  // Border Colors
  border: {
    light: theme.colors.neutral[200],
    DEFAULT: theme.colors.neutral[300],
    dark: theme.colors.neutral[400]
  },

  // Interactive States
  interactive: {
    hover: theme.colors.neutral[100],
    pressed: theme.colors.neutral[200],
    disabled: theme.colors.neutral[100],
    focus: theme.colors.primary[600]
  },

  // Status Indicators
  status: {
    success: theme.colors.success[500],
    warning: theme.colors.warning[500],
    error: theme.colors.error[500],
    info: theme.colors.info[500]
  }
}

// Component-specific styling presets
export const componentStyles = {
  // Card component styles
  card: {
    base: 'bg-white rounded-lg shadow-sm border border-neutral-200',
    hover: 'hover:shadow-md transition-shadow duration-200',
    elevated: 'shadow-lg'
  },

  // Button component styles
  button: {
    base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizes: {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    },
    variants: {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
      secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 focus:ring-secondary-500',
      outline: 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 focus:ring-primary-500'
    }
  },

  // Input component styles
  input: {
    base: 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500',
    error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
    disabled: 'bg-neutral-100 cursor-not-allowed'
  },

  // Badge component styles  
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    variants: {
      primary: 'bg-primary-100 text-primary-800',
      success: 'bg-success-100 text-success-800',
      warning: 'bg-warning-100 text-warning-800', 
      error: 'bg-error-100 text-error-800',
      neutral: 'bg-neutral-100 text-neutral-800'
    }
  },

  // Alert component styles
  alert: {
    base: 'p-4 rounded-md',
    variants: {
      success: 'bg-success-50 text-success-800 border border-success-200',
      warning: 'bg-warning-50 text-warning-800 border border-warning-200',
      error: 'bg-error-50 text-error-800 border border-error-200',
      info: 'bg-info-50 text-info-800 border border-info-200'
    }
  }
}

// Accessibility helpers
export const accessibilityHelpers = {
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
  screenReaderOnly: 'sr-only',
  skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white p-2 rounded'
}

// CSS custom property generators
export function generateCSSCustomProperties() {
  const cssVars: Record<string, string> = {}
  
  // Generate color custom properties
  Object.entries(theme.colors).forEach(([colorName, colorScale]) => {
    if (typeof colorScale === 'object') {
      Object.entries(colorScale).forEach(([shade, value]) => {
        cssVars[`--color-${colorName}-${shade}`] = value
      })
    } else {
      cssVars[`--color-${colorName}`] = colorScale
    }
  })
  
  // Generate spacing custom properties
  Object.entries(theme.spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = value
  })
  
  return cssVars
}

// Type definitions for TypeScript
export type ThemeColors = typeof theme.colors
export type ThemeSpacing = typeof theme.spacing
export type ComponentVariant = keyof typeof componentStyles
export type SemanticColor = keyof typeof semanticColors