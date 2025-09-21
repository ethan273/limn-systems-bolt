'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormValidator, CommonSchemas } from '@/lib/validation/form-validator'
import { 
  FormContainer, 
  InputField, 
  SelectField, 
  FormActions, 
  SubmitButton,
  FormErrorSummary
} from '@/components/ui/form'
import { SelectItem } from '@/components/ui/select'

interface BudgetFormData {
  name: string
  category: string
  department: string
  period_id: string
  amount: number
}

interface Period {
  id: string
  name: string
  start_date: string
  end_date: string
}

interface BudgetFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: BudgetFormData) => Promise<void>
  initialData?: Partial<BudgetFormData>
  periods: Period[]
  loading?: boolean
}

const CATEGORIES = [
  'Production',
  'Design',
  'Marketing',
  'Operations',
  'Technology',
  'Administration',
  'Sales',
  'Shipping'
]

const DEPARTMENTS = [
  'Design',
  'Production',
  'Sales',
  'Administration',
  'Finance',
  'Operations'
]

export function BudgetForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  periods, 
  loading = false 
}: BudgetFormProps) {
  const [formData, setFormData] = useState<BudgetFormData>({
    name: '',
    category: '',
    department: '',
    period_id: '',
    amount: 0
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || '',
        department: initialData.department || '',
        period_id: initialData.period_id || '',
        amount: initialData.amount || 0
      })
    } else {
      // Reset form when opening for new budget
      setFormData({
        name: '',
        category: '',
        department: '',
        period_id: '',
        amount: 0
      })
    }
    setErrors({})
  }, [initialData, isOpen])

  const validateForm = (): boolean => {
    const validation = FormValidator.validate(CommonSchemas.budgetForm, formData)
    
    if (!validation.success) {
      setErrors(validation.errors || {})
      return false
    }
    
    setErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error submitting budget:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: keyof BudgetFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Budget' : 'Create New Budget'}
          </DialogTitle>
        </DialogHeader>
        
        <FormContainer onSubmit={handleSubmit}>
          <FormErrorSummary errors={errors} />
          
          <InputField
            label="Budget Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Q1 Production Budget"
            error={errors.name}
            required
          />

          <SelectField
            label="Category"
            value={formData.category}
            onValueChange={(value) => handleChange('category', value)}
            placeholder="Select category"
            error={errors.category}
            required
          >
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectField>

          <SelectField
            label="Department"
            value={formData.department}
            onValueChange={(value) => handleChange('department', value)}
            placeholder="Select department"
            error={errors.department}
            required
          >
            {DEPARTMENTS.map((department) => (
              <SelectItem key={department} value={department}>
                {department}
              </SelectItem>
            ))}
          </SelectField>

          <SelectField
            label="Period"
            value={formData.period_id}
            onValueChange={(value) => handleChange('period_id', value)}
            placeholder="Select period"
            error={errors.period_id}
            required
          >
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>
                {period.name}
              </SelectItem>
            ))}
          </SelectField>

          <InputField
            label="Budget Amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.amount.toString()}
            onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            error={errors.amount}
            required
          />

          <FormActions>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton 
              loading={submitting}
              loadingText={initialData ? 'Updating...' : 'Creating...'}
            >
              {initialData ? 'Update Budget' : 'Create Budget'}
            </SubmitButton>
          </FormActions>
        </FormContainer>
      </DialogContent>
    </Dialog>
  )
}