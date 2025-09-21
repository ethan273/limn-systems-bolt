'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Base field wrapper with consistent styling
interface FieldWrapperProps {
  label: string
  required?: boolean
  error?: string
  description?: string
  children: React.ReactNode
}

export function FieldWrapper({ label, required, error, description, children }: FieldWrapperProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {description && (
        <p className="text-xs text-slate-500">{description}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

// Text Input Field
interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'date'
}

export function TextField({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required, 
  error, 
  description,
  type = 'text'
}: TextFieldProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} description={description}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={error ? 'border-red-500' : ''}
      />
    </FieldWrapper>
  )
}

// Number Input Field
interface NumberFieldProps {
  label: string
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  min?: number
  max?: number
  step?: number
}

export function NumberField({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required, 
  error, 
  description,
  min,
  max,
  step
}: NumberFieldProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} description={description}>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={error ? 'border-red-500' : ''}
      />
    </FieldWrapper>
  )
}

// Textarea Field
interface TextareaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  rows?: number
}

export function TextareaField({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required, 
  error, 
  description,
  rows = 3
}: TextareaFieldProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} description={description}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={error ? 'border-red-500' : ''}
      />
    </FieldWrapper>
  )
}

// Select Field
interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
}

export function SelectField({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  required, 
  error, 
  description 
}: SelectFieldProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} description={description}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  )
}

// Checkbox Field
interface CheckboxFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  description?: string
}

export function CheckboxField({ label, checked, onChange, description }: CheckboxFieldProps) {
  return (
    <div className="flex items-start space-x-2">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="mt-1"
      />
      <div className="space-y-1 leading-none">
        <Label className="text-sm font-medium text-slate-700">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
      </div>
    </div>
  )
}

// Form Section (for organizing related fields)
interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <p className="text-sm text-slate-600">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}

// Two Column Layout for forms
interface TwoColumnLayoutProps {
  children: React.ReactNode
}

export function TwoColumnLayout({ children }: TwoColumnLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {children}
    </div>
  )
}

// Three Column Layout for forms
interface ThreeColumnLayoutProps {
  children: React.ReactNode
}

export function ThreeColumnLayout({ children }: ThreeColumnLayoutProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  )
}