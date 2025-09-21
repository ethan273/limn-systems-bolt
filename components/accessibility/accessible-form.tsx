'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { a11y } from '@/lib/accessibility/aria-helpers'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

// Accessible Input Component
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
  error?: string
  helpText?: string
  isRequired?: boolean
  showRequiredIndicator?: boolean
}

export function AccessibleInput({
  label,
  description,
  error,
  helpText,
  isRequired = false,
  showRequiredIndicator = true,
  className,
  ...props
}: AccessibleInputProps) {
  const ids = a11y.useIds('input')
  const isInvalid = !!error

  return (
    <div className="space-y-2">
      {/* Label */}
      <label 
        id={ids.labelId}
        htmlFor={ids.id}
        className={cn(
          "block text-sm font-medium",
          isInvalid ? "text-red-900 dark:text-red-400" : "text-gray-900 dark:text-gray-100",
          "focus-within:text-blue-600 dark:focus-within:text-blue-400"
        )}
      >
        {label}
        {isRequired && showRequiredIndicator && (
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        )}
      </label>

      {/* Description */}
      {description && (
        <p 
          id={ids.descriptionId}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {description}
        </p>
      )}

      {/* Input */}
      <input
        {...props}
        {...a11y.attributes.formField(ids, isRequired, isInvalid)}
        className={cn(
          "block w-full rounded-md border px-3 py-2",
          "text-gray-900 dark:text-gray-100",
          "placeholder-gray-400 dark:placeholder-gray-500",
          "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "transition-colors duration-200",
          isInvalid 
            ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950/50" 
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
          "disabled:bg-gray-50 dark:disabled:bg-gray-800",
          "disabled:text-gray-500 dark:disabled:text-gray-400",
          "disabled:cursor-not-allowed",
          className
        )}
      />

      {/* Error Message */}
      {error && (
        <div 
          id={ids.errorId}
          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="assertive"
          aria-atomic={true}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Help Text */}
      {helpText && !error && (
        <p 
          id={ids.helpId}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {helpText}
        </p>
      )}
    </div>
  )
}

// Accessible Textarea Component
interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  description?: string
  error?: string
  helpText?: string
  isRequired?: boolean
  showRequiredIndicator?: boolean
  showCharacterCount?: boolean
  maxLength?: number
}

export function AccessibleTextarea({
  label,
  description,
  error,
  helpText,
  isRequired = false,
  showRequiredIndicator = true,
  showCharacterCount = false,
  maxLength,
  className,
  value = '',
  ...props
}: AccessibleTextareaProps) {
  const ids = a11y.useIds('textarea')
  const isInvalid = !!error
  const currentLength = typeof value === 'string' ? value.length : 0

  return (
    <div className="space-y-2">
      {/* Label */}
      <label 
        id={ids.labelId}
        htmlFor={ids.id}
        className={cn(
          "block text-sm font-medium",
          isInvalid ? "text-red-900 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
        )}
      >
        {label}
        {isRequired && showRequiredIndicator && (
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        )}
      </label>

      {/* Description */}
      {description && (
        <p 
          id={ids.descriptionId}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {description}
        </p>
      )}

      {/* Textarea */}
      <textarea
        {...props}
        value={value}
        maxLength={maxLength}
        {...a11y.attributes.formField(ids, isRequired, isInvalid)}
        className={cn(
          "block w-full rounded-md border px-3 py-2",
          "text-gray-900 dark:text-gray-100",
          "placeholder-gray-400 dark:placeholder-gray-500",
          "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "transition-colors duration-200",
          "resize-vertical min-h-[100px]",
          isInvalid 
            ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950/50" 
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
          "disabled:bg-gray-50 dark:disabled:bg-gray-800",
          "disabled:text-gray-500 dark:disabled:text-gray-400",
          "disabled:cursor-not-allowed",
          className
        )}
      />

      {/* Character Count */}
      {showCharacterCount && maxLength && (
        <div className="flex justify-end">
          <span 
            className={cn(
              "text-xs",
              currentLength > maxLength * 0.9 
                ? "text-red-600 dark:text-red-400"
                : "text-gray-500 dark:text-gray-400"
            )}
            aria-label={`${currentLength} of ${maxLength} characters used`}
          >
            {currentLength}/{maxLength}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div 
          id={ids.errorId}
          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="assertive"
          aria-atomic={true}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Help Text */}
      {helpText && !error && (
        <p 
          id={ids.helpId}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {helpText}
        </p>
      )}
    </div>
  )
}

// Accessible Select Component
interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  description?: string
  error?: string
  helpText?: string
  isRequired?: boolean
  showRequiredIndicator?: boolean
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export function AccessibleSelect({
  label,
  description,
  error,
  helpText,
  isRequired = false,
  showRequiredIndicator = true,
  options,
  placeholder,
  className,
  ...props
}: AccessibleSelectProps) {
  const ids = a11y.useIds('select')
  const isInvalid = !!error

  return (
    <div className="space-y-2">
      {/* Label */}
      <label 
        id={ids.labelId}
        htmlFor={ids.id}
        className={cn(
          "block text-sm font-medium",
          isInvalid ? "text-red-900 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
        )}
      >
        {label}
        {isRequired && showRequiredIndicator && (
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        )}
      </label>

      {/* Description */}
      {description && (
        <p 
          id={ids.descriptionId}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {description}
        </p>
      )}

      {/* Select */}
      <select
        {...props}
        {...a11y.attributes.formField(ids, isRequired, isInvalid)}
        className={cn(
          "block w-full rounded-md border px-3 py-2",
          "text-gray-900 dark:text-gray-100",
          "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "transition-colors duration-200",
          isInvalid 
            ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950/50" 
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
          "disabled:bg-gray-50 dark:disabled:bg-gray-800",
          "disabled:text-gray-500 dark:disabled:text-gray-400",
          "disabled:cursor-not-allowed",
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(({ value, label, disabled }) => (
          <option key={value} value={value} disabled={disabled}>
            {label}
          </option>
        ))}
      </select>

      {/* Error Message */}
      {error && (
        <div 
          id={ids.errorId}
          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="assertive"
          aria-atomic={true}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Help Text */}
      {helpText && !error && (
        <p 
          id={ids.helpId}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {helpText}
        </p>
      )}
    </div>
  )
}

// Accessible Checkbox Component
interface AccessibleCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
  error?: string
  isRequired?: boolean
}

export function AccessibleCheckbox({
  label,
  description,
  error,
  isRequired = false,
  className,
  ...props
}: AccessibleCheckboxProps) {
  const ids = a11y.useIds('checkbox')
  const isInvalid = !!error

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <input
          {...props}
          type="checkbox"
          id={ids.id}
          aria-describedby={description ? ids.descriptionId : undefined}
          aria-invalid={isInvalid}
          aria-required={isRequired}
          className={cn(
            "h-4 w-4 rounded border mt-0.5",
            "text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0",
            "transition-colors duration-200",
            isInvalid 
              ? "border-red-300 dark:border-red-600" 
              : "border-gray-300 dark:border-gray-600",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
        <div className="flex-1 min-w-0">
          <label 
            htmlFor={ids.id}
            className={cn(
              "block text-sm font-medium cursor-pointer",
              isInvalid ? "text-red-900 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
            )}
          >
            {label}
            {isRequired && (
              <span className="text-red-500 ml-1" aria-label="required">*</span>
            )}
          </label>
          
          {description && (
            <p 
              id={ids.descriptionId}
              className="mt-1 text-sm text-gray-600 dark:text-gray-400"
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 ml-7"
          role="alert"
          aria-live="assertive"
          aria-atomic={true}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// Accessible Radio Group Component
interface AccessibleRadioGroupProps {
  legend: string
  description?: string
  error?: string
  isRequired?: boolean
  options: Array<{ value: string; label: string; description?: string; disabled?: boolean }>
  value?: string
  onChange?: (value: string) => void
  name: string
}

export function AccessibleRadioGroup({
  legend,
  description,
  error,
  isRequired = false,
  options,
  value,
  onChange,
  name
}: AccessibleRadioGroupProps) {
  const ids = a11y.useIds('radiogroup')
  const isInvalid = !!error

  return (
    <fieldset className="space-y-4">
      <legend 
        className={cn(
          "text-sm font-medium",
          isInvalid ? "text-red-900 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
        )}
      >
        {legend}
        {isRequired && (
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        )}
      </legend>

      {description && (
        <p 
          id={ids.descriptionId}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {description}
        </p>
      )}

      <div 
        className="space-y-3"
        role="radiogroup"
        aria-describedby={description ? ids.descriptionId : undefined}
        aria-invalid={isInvalid}
        aria-required={isRequired}
      >
        {options.map((option) => {
          const optionId = `${ids.id}-${option.value}`
          const isSelected = value === option.value
          
          return (
            <div key={option.value} className="flex items-start gap-3">
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={isSelected}
                disabled={option.disabled}
                onChange={() => onChange?.(option.value)}
                className={cn(
                  "h-4 w-4 border mt-0.5",
                  "text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0",
                  "transition-colors duration-200",
                  isInvalid 
                    ? "border-red-300 dark:border-red-600" 
                    : "border-gray-300 dark:border-gray-600",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
              <div className="flex-1 min-w-0">
                <label 
                  htmlFor={optionId}
                  className={cn(
                    "block text-sm font-medium cursor-pointer",
                    option.disabled && "cursor-not-allowed opacity-50",
                    isInvalid ? "text-red-900 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
                  )}
                >
                  {option.label}
                </label>
                
                {option.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="assertive"
          aria-atomic={true}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </fieldset>
  )
}

// Accessible Form Status Messages
interface FormStatusProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  className?: string
}

export function FormStatus({ type, title, message, className }: FormStatusProps) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const styles = {
    success: "bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800",
    error: "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
    warning: "bg-yellow-50 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
    info: "bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800"
  }

  const Icon = icons[type]

  return (
    <div 
      className={cn(
        "rounded-md border p-4",
        styles[type],
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic={true}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          {title && (
            <h3 className="font-medium mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}