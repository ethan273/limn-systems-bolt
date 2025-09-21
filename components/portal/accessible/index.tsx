'use client';

import React, { 
  forwardRef, 
  useEffect, 
  useRef, 
  useState, 
  useId,
  KeyboardEvent,
  ReactNode 
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FocusManager, 
  KEYBOARD_KEYS,
  ModalAccessibility
} from '@/lib/portal/accessibility';
import { cn } from '@/lib/utils';

// Accessible Button Component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md',
    loading = false,
    ariaLabel,
    ariaDescribedBy,
    className,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const baseClasses = 'font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;
      onClick?.(event);
    };

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        disabled={disabled || loading}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2 inline-block" />
            <span className="sr-only">Loading</span>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

// Accessible Input Component
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  showRequiredIndicator?: boolean;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    required,
    showRequiredIndicator = true,
    className,
    id: providedId,
    ...props 
  }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const inputRef = useRef<HTMLInputElement>(null);
    
    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    const describedByIds = [
      error ? errorId : '',
      helperText ? helperId : '',
    ].filter(Boolean).join(' ');

    return (
      <div className="space-y-1">
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && showRequiredIndicator && (
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          )}
        </label>
        
        <input
          ref={inputRef}
          id={id}
          className={cn(
            'block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            'disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedByIds || undefined}
          {...props}
        />

        {error && (
          <div
            id={errorId}
            className="text-red-600 text-sm"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {helperText && !error && (
          <div
            id={helperId}
            className="text-gray-600 text-sm"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

// Accessible Modal Component
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnEscape = true,
  closeOnOverlayClick = true,
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      ModalAccessibility.openModal(modalRef.current!);
    } else {
      ModalAccessibility.closeModal();
    }

    return () => {
      if (isOpen) {
        ModalAccessibility.closeModal();
      }
    };
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === KEYBOARD_KEYS.ESCAPE && closeOnEscape) {
      onClose();
    }

    // Trap focus within modal
    if (modalRef.current) {
      FocusManager.trapFocus(event.nativeEvent, modalRef.current);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
            aria-hidden="true"
          />

          {/* Modal Content */}
          <motion.div
            ref={modalRef}
            className={cn(
              'relative bg-white rounded-lg shadow-xl w-full',
              sizeClasses[size]
            )}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
                aria-label="Close modal"
                data-modal-close
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Accessible Tabs Component
interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface AccessibleTabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function AccessibleTabs({ 
  tabs, 
  defaultTab, 
  onChange,
  className 
}: AccessibleTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    const tabButtons = tabListRef.current?.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    const currentIndex = Array.from(tabButtons).findIndex(button => button.id === `tab-${tabId}`);
    
    let nextIndex = currentIndex;

    switch (event.key) {
      case KEYBOARD_KEYS.ARROW_LEFT:
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabButtons.length - 1;
        break;
      case KEYBOARD_KEYS.ARROW_RIGHT:
        event.preventDefault();
        nextIndex = currentIndex < tabButtons.length - 1 ? currentIndex + 1 : 0;
        break;
      case KEYBOARD_KEYS.HOME:
        event.preventDefault();
        nextIndex = 0;
        break;
      case KEYBOARD_KEYS.END:
        event.preventDefault();
        nextIndex = tabButtons.length - 1;
        break;
    }

    if (nextIndex !== currentIndex) {
      tabButtons[nextIndex].focus();
      const nextTabId = tabs[nextIndex].id;
      setActiveTab(nextTabId);
      onChange?.(nextTabId);
    }
  };

  return (
    <div className={className}>
      {/* Tab List */}
      <div
        ref={tabListRef}
        role="tablist"
        className="border-b border-gray-200"
        aria-label="Tabs"
      >
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              disabled={tab.disabled}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
              onKeyDown={(e) => !tab.disabled && handleKeyDown(e, tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          className="mt-4"
          tabIndex={0}
        >
          {activeTab === tab.id && tab.content}
        </div>
      ))}
    </div>
  );
}

// Accessible Dropdown/Select Component
interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AccessibleDropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  error?: string;
  required?: boolean;
}

export function AccessibleDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  required,
}: AccessibleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selectedOption = options.find(opt => opt.value === value);

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case KEYBOARD_KEYS.ESCAPE:
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;

      case KEYBOARD_KEYS.ARROW_DOWN:
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;

      case KEYBOARD_KEYS.ARROW_UP:
        event.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;

      case KEYBOARD_KEYS.ENTER:
      case KEYBOARD_KEYS.SPACE:
        event.preventDefault();
        if (focusedIndex >= 0) {
          handleOptionClick(options[focusedIndex].value);
        }
        break;

      case KEYBOARD_KEYS.HOME:
        event.preventDefault();
        setFocusedIndex(0);
        break;

      case KEYBOARD_KEYS.END:
        event.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>

      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={cn(
          'relative w-full bg-white border rounded-md shadow-sm px-3 py-2 text-left',
          'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-500' : 'border-gray-300'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
          aria-labelledby={`${id}-label`}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={cn(
                'cursor-pointer select-none relative py-2 px-3',
                index === focusedIndex && 'bg-blue-100',
                option.value === value && 'bg-blue-50 text-blue-900',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !option.disabled && handleOptionClick(option.value)}
            >
              {option.label}
              {option.value === value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="text-red-600 text-sm mt-1" role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
}

// Live Region for Announcements
interface LiveRegionProps {
  children: ReactNode;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

export function LiveRegion({ 
  children, 
  politeness = 'polite',
  atomic = true,
  className 
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
}

// Skip Navigation Link
interface SkipLinkProps {
  href: string;
  children: ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {children}
    </a>
  );
}