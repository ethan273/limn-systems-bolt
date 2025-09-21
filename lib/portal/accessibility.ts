// Accessibility utilities and helpers for WCAG AA compliance

export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-controls'?: string;
  'aria-owns'?: string;
  role?: string;
  tabIndex?: number;
}

// Keyboard navigation utilities
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

export type KeyboardKey = typeof KEYBOARD_KEYS[keyof typeof KEYBOARD_KEYS];

// Focus management utilities
export class FocusManager {
  private static focusableElementsSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
      container.querySelectorAll(this.focusableElementsSelector)
    ) as HTMLElement[];
  }

  static getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusables = this.getFocusableElements(container);
    return focusables[0] || null;
  }

  static getLastFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusables = this.getFocusableElements(container);
    return focusables[focusables.length - 1] || null;
  }

  static trapFocus(event: KeyboardEvent, container: HTMLElement) {
    const focusables = this.getFocusableElements(container);
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    if (event.key === KEYBOARD_KEYS.TAB) {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    }
  }

  static restoreFocus(element: HTMLElement | null) {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }
}

// Screen reader utilities
export class ScreenReaderUtils {
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  static announcePageChange(title: string) {
    this.announce(`Navigated to ${title}`, 'assertive');
  }

  static announceLoadingState(isLoading: boolean, context?: string) {
    if (isLoading) {
      this.announce(`Loading${context ? ` ${context}` : ''}...`, 'polite');
    } else {
      this.announce(`${context || 'Content'} loaded`, 'polite');
    }
  }

  static announceError(error: string) {
    this.announce(`Error: ${error}`, 'assertive');
  }

  static announceSuccess(message: string) {
    this.announce(`Success: ${message}`, 'polite');
  }
}

// Color contrast utilities
export class ContrastChecker {
  static getLuminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  static getContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  static meetsWCAGAA(color1: [number, number, number], color2: [number, number, number]): boolean {
    return this.getContrastRatio(color1, color2) >= 4.5;
  }

  static meetsWCAGAAA(color1: [number, number, number], color2: [number, number, number]): boolean {
    return this.getContrastRatio(color1, color2) >= 7;
  }
}

// Skip navigation utilities
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className = 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50';
  
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  });

  return skipLink;
}

// Form validation utilities
export class AccessibleFormValidation {
  static createErrorMessage(fieldId: string, message: string): HTMLDivElement {
    const errorElement = document.createElement('div');
    errorElement.id = `${fieldId}-error`;
    errorElement.className = 'text-red-600 text-sm mt-1';
    errorElement.setAttribute('aria-live', 'polite');
    errorElement.textContent = message;
    return errorElement;
  }

  static addErrorToField(field: HTMLElement, message: string) {
    const fieldId = field.id || `field-${Date.now()}`;
    if (!field.id) field.id = fieldId;

    // Remove existing error
    const existingError = document.getElementById(`${fieldId}-error`);
    if (existingError) {
      existingError.remove();
    }

    // Add error message
    const errorElement = this.createErrorMessage(fieldId, message);
    field.parentElement?.appendChild(errorElement);

    // Update field attributes
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', `${fieldId}-error`);
    field.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');

    // Announce error
    ScreenReaderUtils.announceError(`${message} for ${field.getAttribute('aria-label') || field.getAttribute('name')}`);
  }

  static removeErrorFromField(field: HTMLElement) {
    const fieldId = field.id;
    if (!fieldId) return;

    // Remove error message
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
      errorElement.remove();
    }

    // Update field attributes
    field.setAttribute('aria-invalid', 'false');
    field.removeAttribute('aria-describedby');
    field.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
  }
}

// Reduced motion utilities
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getAnimationDuration(defaultDuration: number): number {
  return prefersReducedMotion() ? 0 : defaultDuration;
}

// High contrast utilities
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// Text utilities for accessibility
export class TextUtilities {
  static truncateWithEllipsis(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  static formatForScreenReader(text: string): string {
    return text
      .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
      .replace(/([0-9]+)/g, ' $1 ') // Add spaces around numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  static createAriaLabel(text: string, context?: string): string {
    const formatted = this.formatForScreenReader(text);
    return context ? `${formatted}, ${context}` : formatted;
  }
}

// Landmark utilities
export const LANDMARK_ROLES = {
  BANNER: 'banner',
  NAVIGATION: 'navigation',
  MAIN: 'main',
  COMPLEMENTARY: 'complementary',
  CONTENTINFO: 'contentinfo',
  SEARCH: 'search',
  FORM: 'form',
  REGION: 'region',
} as const;

// Custom hooks for accessibility
export function useAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useAnnouncement() {
  return {
    announce: ScreenReaderUtils.announce,
    announceError: ScreenReaderUtils.announceError,
    announceSuccess: ScreenReaderUtils.announceSuccess,
    announceLoading: ScreenReaderUtils.announceLoadingState,
  };
}

// ARIA live region component props
export interface LiveRegionProps {
  politeness?: 'off' | 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  children: React.ReactNode;
  className?: string;
}

// Accessible modal utilities
export class ModalAccessibility {
  private static previouslyFocusedElement: HTMLElement | null = null;

  static openModal(modalElement: HTMLElement) {
    // Store currently focused element
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    
    // Add event listener for escape key
    document.addEventListener('keydown', this.handleEscapeKey);
    
    // Focus first focusable element in modal
    const firstFocusable = FocusManager.getFirstFocusableElement(modalElement);
    if (firstFocusable) {
      firstFocusable.focus();
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Announce modal opening
    ScreenReaderUtils.announce('Modal opened', 'assertive');
  }

  static closeModal() {
    // Remove escape key listener
    document.removeEventListener('keydown', this.handleEscapeKey);
    
    // Restore focus
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
      this.previouslyFocusedElement = null;
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Announce modal closing
    ScreenReaderUtils.announce('Modal closed', 'assertive');
  }

  private static handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === KEYBOARD_KEYS.ESCAPE) {
      const closeButton = document.querySelector('[data-modal-close]') as HTMLButtonElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  };
}

const AccessibilityUtils = {
  FocusManager,
  ScreenReaderUtils,
  ContrastChecker,
  AccessibleFormValidation,
  TextUtilities,
  ModalAccessibility,
  KEYBOARD_KEYS,
  LANDMARK_ROLES,
  prefersReducedMotion,
  prefersHighContrast,
  getAnimationDuration,
};

export default AccessibilityUtils;