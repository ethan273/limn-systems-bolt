import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { theme, semanticColors, componentStyles } from './theme'

// Enhanced className utility that merges Tailwind classes intelligently
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate consistent component classes based on design system
export function createComponentClasses(
  component: keyof typeof componentStyles,
  variant?: string,
  size?: string,
  state?: 'hover' | 'pressed' | 'disabled' | 'focus'
) {
  const baseStyles = componentStyles[component]
  
  if (typeof baseStyles === 'string') {
    return baseStyles
  }
  
  let classes = baseStyles.base || ''
  
  // Add variant styles
  if (variant && 'variants' in baseStyles && baseStyles.variants) {
    const variantStyles = (baseStyles.variants as Record<string, string>)[variant]
    if (variantStyles) {
      classes = cn(classes, variantStyles)
    }
  }
  
  // Add size styles
  if (size && 'sizes' in baseStyles && baseStyles.sizes) {
    const sizeStyles = (baseStyles.sizes as Record<string, string>)[size]
    if (sizeStyles) {
      classes = cn(classes, sizeStyles)
    }
  }
  
  // Add state styles
  if (state && (baseStyles as Record<string, unknown>)[state]) {
    classes = cn(classes, (baseStyles as Record<string, unknown>)[state] as string)
  }
  
  return classes
}

// Color utility functions
export const colorUtils = {
  // Get semantic color by category and type
  getSemantic: (category: keyof typeof semanticColors, type?: string) => {
    const colorCategory = semanticColors[category]
    if (typeof colorCategory === 'string') {
      return colorCategory
    }
    if (type && colorCategory[type as keyof typeof colorCategory]) {
      return colorCategory[type as keyof typeof colorCategory]
    }
    return (colorCategory as Record<string, unknown>).DEFAULT || Object.values(colorCategory)[0]
  },

  // Get theme color with shade
  getTheme: (color: keyof typeof theme.colors, shade: string | number = 500) => {
    const colorScale = theme.colors[color]
    if (typeof colorScale === 'string') {
      return colorScale
    }
    return colorScale[shade as keyof typeof colorScale] || colorScale[500] || (colorScale as Record<string, unknown>).DEFAULT
  },

  // Generate alpha variant of a color
  withAlpha: (color: string, alpha: number) => {
    // Convert hex to rgba
    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  },

  // Get contrasting text color for a background
  getContrastColor: (backgroundColor: string) => {
    // Simple contrast calculation - in production, use a more sophisticated algorithm
    const hex = backgroundColor.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? semanticColors.text.primary : semanticColors.text.inverse
  }
}

// Spacing utility functions
export const spacingUtils = {
  // Get spacing value by key
  get: (key: keyof typeof theme.spacing) => theme.spacing[key],
  
  // Generate responsive spacing classes
  responsive: (
    property: 'p' | 'px' | 'py' | 'pt' | 'pr' | 'pb' | 'pl' | 'm' | 'mx' | 'my' | 'mt' | 'mr' | 'mb' | 'ml',
    values: { sm?: keyof typeof theme.spacing; md?: keyof typeof theme.spacing; lg?: keyof typeof theme.spacing }
  ) => {
    const classes = []
    if (values.sm) classes.push(`${property}-${values.sm}`)
    if (values.md) classes.push(`md:${property}-${values.md}`)
    if (values.lg) classes.push(`lg:${property}-${values.lg}`)
    return classes.join(' ')
  }
}

// Typography utility functions
export const typographyUtils = {
  // Get font size with line height
  getSize: (size: keyof typeof theme.typography.fontSize) => {
    const fontSize = theme.typography.fontSize[size]
    return Array.isArray(fontSize) ? fontSize : [fontSize, { lineHeight: '1.5' }]
  },
  
  // Generate text classes for specific use cases
  heading: (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    const headingSizes = {
      1: 'text-4xl md:text-5xl font-bold text-neutral-900',
      2: 'text-3xl md:text-4xl font-bold text-neutral-900',
      3: 'text-2xl md:text-3xl font-semibold text-neutral-900',
      4: 'text-xl md:text-2xl font-semibold text-neutral-900',
      5: 'text-lg md:text-xl font-medium text-neutral-900',
      6: 'text-base md:text-lg font-medium text-neutral-900'
    }
    return headingSizes[level]
  },
  
  body: (variant: 'large' | 'base' | 'small' = 'base') => {
    const bodyStyles = {
      large: 'text-lg text-neutral-700 leading-relaxed',
      base: 'text-base text-neutral-700 leading-relaxed',
      small: 'text-sm text-neutral-600 leading-relaxed'
    }
    return bodyStyles[variant]
  },
  
  caption: () => 'text-sm text-neutral-500',
  
  label: () => 'text-sm font-medium text-neutral-900'
}

// Layout utility functions
export const layoutUtils = {
  // Container classes
  container: (size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'xl') => {
    const containerSizes = {
      sm: 'max-w-3xl',
      md: 'max-w-5xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-full'
    }
    return cn('mx-auto px-4 sm:px-6 lg:px-8', containerSizes[size])
  },
  
  // Grid utilities
  grid: (cols: number, gap: keyof typeof theme.spacing = 4) => {
    return `grid grid-cols-1 md:grid-cols-${cols} gap-${gap}`
  },
  
  // Flex utilities
  flex: (
    direction: 'row' | 'col' = 'row',
    align: 'start' | 'center' | 'end' | 'stretch' = 'start',
    justify: 'start' | 'center' | 'end' | 'between' | 'around' = 'start'
  ) => {
    const alignClasses = {
      start: 'items-start',
      center: 'items-center', 
      end: 'items-end',
      stretch: 'items-stretch'
    }
    
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around'
    }
    
    return cn(
      'flex',
      direction === 'col' ? 'flex-col' : 'flex-row',
      alignClasses[align],
      justifyClasses[justify]
    )
  }
}

// Animation utilities
export const animationUtils = {
  // Transition classes
  transition: (
    properties: ('all' | 'colors' | 'opacity' | 'shadow' | 'transform')[] = ['all'],
    duration: keyof typeof theme.animation.duration = 200,
    easing: keyof typeof theme.animation.easing = 'inOut'
  ) => {
    const transitionClass = properties.includes('all') ? 'transition-all' : 
      `transition-${properties.join('-')}`
    return `${transitionClass} duration-${duration} ease-${easing}`
  },
  
  // Hover effects
  hoverScale: (scale: '105' | '110' = '105') => `hover:scale-${scale} transition-transform duration-200`,
  hoverShadow: () => 'hover:shadow-md transition-shadow duration-200',
  hoverOpacity: (opacity: '75' | '50' = '75') => `hover:opacity-${opacity} transition-opacity duration-200`,
  
  // Loading states
  pulse: () => 'animate-pulse',
  spin: () => 'animate-spin',
  bounce: () => 'animate-bounce'
}

// Responsive utilities
export const responsiveUtils = {
  // Show/hide at different breakpoints
  show: (breakpoint: keyof typeof theme.breakpoints) => `hidden ${breakpoint}:block`,
  hide: (breakpoint: keyof typeof theme.breakpoints) => `${breakpoint}:hidden`,
  
  // Generate responsive classes
  responsive: (baseClass: string, breakpoints: Partial<Record<keyof typeof theme.breakpoints, string>>) => {
    const classes = [baseClass]
    Object.entries(breakpoints).forEach(([bp, value]) => {
      if (value) classes.push(`${bp}:${value}`)
    })
    return classes.join(' ')
  }
}

// Validation utilities for design system
export const validationUtils = {
  // Check if a color exists in the theme
  isValidColor: (color: string): boolean => {
    return Object.keys(theme.colors).includes(color)
  },
  
  // Check if a spacing value exists
  isValidSpacing: (spacing: string): boolean => {
    return Object.keys(theme.spacing).includes(spacing)
  },
  
  // Validate component variant
  isValidVariant: (component: keyof typeof componentStyles, variant: string): boolean => {
    const componentConfig = componentStyles[component]
    return 'variants' in componentConfig && 
           componentConfig.variants && 
           Object.keys(componentConfig.variants).includes(variant)
  }
}

// Accessibility utilities
export const a11yUtils = {
  // Focus ring classes
  focusRing: (color: keyof typeof theme.colors = 'primary') => 
    `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500`,
  
  // Screen reader classes
  srOnly: () => 'sr-only',
  srOnlyFocusable: () => 'sr-only focus:not-sr-only',
  
  // Skip link
  skipLink: () => 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white p-2 rounded z-50',
  
  // ARIA helpers
  ariaLabel: (label: string) => ({ 'aria-label': label }),
  ariaDescribedBy: (id: string) => ({ 'aria-describedby': id }),
  ariaLabelledBy: (id: string) => ({ 'aria-labelledby': id })
}

// Dark mode utilities (future enhancement)
export const darkModeUtils = {
  // Generate dark mode classes
  dark: (lightClass: string, darkClass: string) => `${lightClass} dark:${darkClass}`,
  
  // Dark mode color utilities
  darkBg: (color: keyof typeof theme.colors, shade: number = 800) => `dark:bg-${color}-${shade}`,
  darkText: (color: keyof typeof theme.colors, shade: number = 200) => `dark:text-${color}-${shade}`,
  darkBorder: (color: keyof typeof theme.colors, shade: number = 700) => `dark:border-${color}-${shade}`
}

// Export all utilities as a single object
export const designSystem = {
  colors: colorUtils,
  spacing: spacingUtils,
  typography: typographyUtils,
  layout: layoutUtils,
  animation: animationUtils,
  responsive: responsiveUtils,
  validation: validationUtils,
  accessibility: a11yUtils,
  darkMode: darkModeUtils,
  components: createComponentClasses,
  cn
}