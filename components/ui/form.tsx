'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-states'
import { AlertCircle, Check } from 'lucide-react'

// Form Field Error Component
interface FieldErrorProps {
  error?: string
  className?: string
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null

  return (
    <div className={cn('flex items-center gap-1 text-sm text-red-600 mt-1', className)}>
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      <span>{error}</span>
    </div>
  )
}

// Form Field Success Component
interface FieldSuccessProps {
  message?: string
  show?: boolean
  className?: string
}

export function FieldSuccess({ message, show, className }: FieldSuccessProps) {
  if (!show || !message) return null

  return (
    <div className={cn('flex items-center gap-1 text-sm text-green-600 mt-1', className)}>
      <Check className="h-3 w-3 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// Form Field Wrapper
interface FormFieldProps {
  children: React.ReactNode
  error?: string
  success?: string
  required?: boolean
  className?: string
}

export function FormField({ children, error, success, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {children}
      <FieldError error={error} />
      <FieldSuccess message={success} show={!!success} />
    </div>
  )
}

// Enhanced Input Field
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  required?: boolean
  helperText?: string
}

export function InputField({ 
  label, 
  error, 
  success, 
  required, 
  helperText,
  className,
  ...props 
}: InputFieldProps) {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <FormField error={error} success={success} required={required}>
      {label && (
        <Label htmlFor={inputId} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Input
        {...props}
        id={inputId}
        className={cn(
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
          success && 'border-green-500 focus:ring-green-500 focus:border-green-500',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${inputId}-error` : 
          success ? `${inputId}-success` : 
          helperText ? `${inputId}-helper` : undefined
        }
      />
      {helperText && !error && !success && (
        <p id={`${inputId}-helper`} className="text-sm text-gray-500 mt-1">
          {helperText}
        </p>
      )}
    </FormField>
  )
}

// Enhanced Textarea Field
interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  success?: string
  required?: boolean
  helperText?: string
  maxLength?: number
}

export function TextareaField({ 
  label, 
  error, 
  success, 
  required, 
  helperText,
  maxLength,
  className,
  ...props 
}: TextareaFieldProps) {
  const textareaId = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`
  const currentLength = (props.value as string)?.length || 0

  return (
    <FormField error={error} success={success} required={required}>
      {label && (
        <Label htmlFor={textareaId} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <textarea
        {...props}
        id={textareaId}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
          success && 'border-green-500 focus:ring-green-500 focus:border-green-500',
          className
        )}
        maxLength={maxLength}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${textareaId}-error` : 
          success ? `${textareaId}-success` : 
          helperText ? `${textareaId}-helper` : undefined
        }
      />
      <div className="flex justify-between items-center">
        <div>
          {helperText && !error && !success && (
            <p id={`${textareaId}-helper`} className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
        {maxLength && (
          <div className={cn(
            'text-xs',
            currentLength > maxLength * 0.9 ? 'text-orange-500' : 'text-gray-400'
          )}>
            {currentLength}/{maxLength}
          </div>
        )}
      </div>
    </FormField>
  )
}

// Enhanced Select Field
interface SelectFieldProps {
  label?: string
  error?: string
  success?: string
  required?: boolean
  helperText?: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}

export function SelectField({ 
  label, 
  error, 
  success, 
  required, 
  helperText,
  placeholder,
  value,
  onValueChange,
  children,
  disabled,
}: SelectFieldProps) {
  const selectId = `select-${Math.random().toString(36).substr(2, 9)}`

  return (
    <FormField error={error} success={success} required={required}>
      {label && (
        <Label htmlFor={selectId} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger 
          id={selectId}
          className={cn(
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            success && 'border-green-500 focus:ring-green-500 focus:border-green-500'
          )}
          aria-invalid={!!error}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
      {helperText && !error && !success && (
        <p className="text-sm text-gray-500 mt-1">
          {helperText}
        </p>
      )}
    </FormField>
  )
}

// Enhanced Checkbox Field
interface CheckboxFieldProps {
  label?: string
  description?: string
  error?: string
  required?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

export function CheckboxField({
  label,
  description,
  error,
  required,
  checked,
  onCheckedChange,
  disabled
}: CheckboxFieldProps) {
  const checkboxId = `checkbox-${Math.random().toString(36).substr(2, 9)}`

  return (
    <FormField error={error} required={required}>
      <div className="flex items-start space-x-2">
        <Checkbox 
          id={checkboxId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-invalid={!!error}
        />
        <div className="grid gap-1.5 leading-none">
          {label && (
            <Label 
              htmlFor={checkboxId}
              className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                required && "after:content-['*'] after:ml-0.5 after:text-red-500"
              )}
            >
              {label}
            </Label>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </FormField>
  )
}

// Form Submit Button with Loading State
interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
}

export function SubmitButton({ 
  loading, 
  loadingText = 'Submitting...', 
  children, 
  className,
  ...props 
}: SubmitButtonProps) {
  return (
    <Button 
      {...props} 
      type="submit"
      disabled={loading || props.disabled}
      className={cn('relative', className)}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {loading ? loadingText : children}
    </Button>
  )
}

// Form Actions Container
interface FormActionsProps {
  children: React.ReactNode
  className?: string
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn('flex justify-end space-x-2 pt-4', className)}>
      {children}
    </div>
  )
}

// Form Section
interface FormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="border-b border-gray-200 pb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

// Form Container
interface FormContainerProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

export function FormContainer({ children, className, ...props }: FormContainerProps) {
  return (
    <form className={cn('space-y-6', className)} {...props}>
      {children}
    </form>
  )
}

// Form Error Summary
interface FormErrorSummaryProps {
  errors: Record<string, string>
  className?: string
}

export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  const errorList = Object.entries(errors).filter(([, message]) => message)
  
  if (errorList.length === 0) return null

  return (
    <div className={cn(
      'bg-red-50 border border-red-200 rounded-md p-4',
      className
    )}>
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Please fix the following errors:
          </h3>
          <div className="mt-2">
            <ul className="list-disc space-y-1 pl-5">
              {errorList.map(([field, message]) => (
                <li key={field} className="text-sm text-red-700">
                  {message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}