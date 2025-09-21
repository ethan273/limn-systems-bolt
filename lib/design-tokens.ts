// Design tokens for Limn Systems UI consistency
// Based on Phase 4 UI optimization requirements

export const designTokens = {
  // Spacing system - consistent spacing throughout the application
  spacing: {
    xs: '0.25rem',    // 4px - tight spacing
    sm: '0.5rem',     // 8px - small spacing
    md: '1rem',       // 16px - default spacing
    lg: '1.5rem',     // 24px - large spacing
    xl: '2rem',       // 32px - extra large spacing
    xxl: '3rem',      // 48px - maximum spacing
    section: '4rem',  // 64px - section spacing
  },
  
  // Color palette - semantic and brand colors
  colors: {
    // Primary brand colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',  // Main primary
      600: '#0284c7',  // Hover state
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',  // Dark mode
    },
    
    // Semantic colors for status and feedback
    semantic: {
      success: {
        light: '#22c55e',
        DEFAULT: '#16a34a',
        dark: '#15803d'
      },
      warning: {
        light: '#f59e0b',
        DEFAULT: '#d97706',
        dark: '#b45309'
      },
      error: {
        light: '#ef4444',
        DEFAULT: '#dc2626',
        dark: '#b91c1c'
      },
      info: {
        light: '#3b82f6',
        DEFAULT: '#2563eb',
        dark: '#1d4ed8'
      }
    },
    
    // Gray scale for text and backgrounds
    gray: {
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
    }
  },
  
  // Typography system - consistent text styles
  typography: {
    // Headings
    h1: 'text-4xl font-bold tracking-tight text-gray-900',
    h2: 'text-3xl font-semibold tracking-tight text-gray-900', 
    h3: 'text-2xl font-semibold text-gray-900',
    h4: 'text-xl font-semibold text-gray-900',
    h5: 'text-lg font-semibold text-gray-900',
    h6: 'text-base font-semibold text-gray-900',
    
    // Body text
    body: 'text-sm font-medium text-gray-700',
    bodyLarge: 'text-base font-medium text-gray-700',
    bodySmall: 'text-xs font-medium text-gray-600',
    
    // Special text
    caption: 'text-xs text-gray-500',
    label: 'text-sm font-medium text-gray-700',
    muted: 'text-sm text-gray-500',
    
    // Interactive text
    link: 'text-sm font-medium text-primary-600 hover:text-primary-700',
    button: 'text-sm font-semibold',
  },
  
  // Border radius system
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    xxl: '1rem',      // 16px
    full: '9999px',   // Fully rounded
  },
  
  // Shadow system for depth
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  },
  
  // Animation durations
  animation: {
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
  },
  
  // Z-index layers
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  }
}

// Component-specific design tokens
export const componentTokens = {
  // Card components
  card: {
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.lg,
    shadow: designTokens.shadows.sm,
    backgroundColor: '#ffffff',
    borderColor: designTokens.colors.gray[200],
  },
  
  // Button components
  button: {
    paddingX: designTokens.spacing.md,
    paddingY: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    fontSize: designTokens.typography.button,
    transition: `all ${designTokens.animation.DEFAULT} ease-in-out`,
  },
  
  // Input components
  input: {
    padding: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    borderColor: designTokens.colors.gray[300],
    focusColor: designTokens.colors.primary[500],
    fontSize: designTokens.typography.body,
  },
  
  // Modal components
  modal: {
    backdropColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: designTokens.borderRadius.xl,
    shadow: designTokens.shadows.xl,
    maxWidth: '32rem', // 512px
  },
  
  // Table components
  table: {
    headerBackground: designTokens.colors.gray[50],
    borderColor: designTokens.colors.gray[200],
    rowHoverBackground: designTokens.colors.gray[50],
    cellPadding: designTokens.spacing.md,
  },
  
  // Dashboard components
  dashboard: {
    sidebarWidth: '16rem', // 256px
    headerHeight: '4rem',  // 64px
    contentPadding: designTokens.spacing.lg,
    cardSpacing: designTokens.spacing.lg,
  }
}

// Utility functions for consistent styling
export const styleUtils = {
  // Get consistent spacing
  spacing: (size: keyof typeof designTokens.spacing) => designTokens.spacing[size],
  
  // Get semantic color
  semanticColor: (type: keyof typeof designTokens.colors.semantic, variant: 'light' | 'DEFAULT' | 'dark' = 'DEFAULT') => {
    return designTokens.colors.semantic[type][variant]
  },
  
  // Get primary color variant
  primaryColor: (shade: keyof typeof designTokens.colors.primary) => {
    return designTokens.colors.primary[shade]
  },
  
  // Get gray color
  grayColor: (shade: keyof typeof designTokens.colors.gray) => {
    return designTokens.colors.gray[shade]
  },
  
  // Create consistent shadow
  shadow: (size: keyof typeof designTokens.shadows = 'DEFAULT') => designTokens.shadows[size],
  
  // Create consistent border radius
  rounded: (size: keyof typeof designTokens.borderRadius = 'DEFAULT') => designTokens.borderRadius[size],
}

// Export default for easy importing
export default designTokens
