'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DesignerFormData, DESIGNER_SPECIALTIES, DESIGN_STYLES } from '@/types/designer'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface QuickAddDesignerProps {
  onDesignerAdded?: () => void
  trigger?: React.ReactNode
}

export function QuickAddDesigner({ onDesignerAdded, trigger }: QuickAddDesignerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<DesignerFormData>({
    name: '',
    company_name: '',
    contact_email: '',
    phone: '',
    website: '',
    portfolio_url: '',
    specialties: [],
    design_style: [],
    hourly_rate: undefined,
    currency: 'USD',
    status: 'prospect',
    years_experience: undefined,
    certifications: [],
    notes: ''
  })
  const [errors, setErrors] = useState<Partial<Record<keyof DesignerFormData, string>>>({})


  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof DesignerFormData, string>> = {}

    if (!(formData.name || "").trim()) {
      newErrors.name = 'Designer name is required'
    }

    if (!(formData.contact_email || "").trim()) {
      newErrors.contact_email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address'
    }

    if ((formData.specialties || []).length === 0) {
      newErrors.specialties = 'Please select at least one specialty'
    }

    if (formData.website && !formData.website.startsWith('http')) {
      newErrors.website = 'Website must start with http:// or https://'
    }

    if (formData.portfolio_url && !formData.portfolio_url.startsWith('http')) {
      newErrors.portfolio_url = 'Portfolio URL must start with http:// or https://'
    }

    if (formData.hourly_rate && formData.hourly_rate < 0) {
      newErrors.hourly_rate = 'Hourly rate must be positive'
    }

    if (formData.years_experience && (formData.years_experience < 0 || formData.years_experience > 50)) {
      newErrors.years_experience = 'Years of experience must be between 0 and 50'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // In production, this would create the designer in Supabase

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Show success toast
      toast.success('Designer added successfully', {
        description: `${formData.name} has been added to your designers list.`
      })

      // Reset form
      setFormData({
        name: '',
        company_name: '',
        contact_email: '',
        phone: '',
        website: '',
        portfolio_url: '',
        specialties: [],
        design_style: [],
        hourly_rate: undefined,
        currency: 'USD',
        status: 'prospect',
        years_experience: undefined,
        certifications: [],
        notes: ''
      })

      // Close dialog
      setOpen(false)

      // Callback to refresh parent component
      if (onDesignerAdded) {
        onDesignerAdded()
      }

    } catch (error) {
      console.error('Error creating designer:', error)
      toast.error('Failed to add designer', {
        description: 'Please try again or contact support if the problem persists.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      specialties: checked
        ? [...prev.specialties, specialty]
        : (prev.specialties || []).filter(s => s !== specialty)
    }))
    
    // Clear specialty error if at least one is selected
    if (checked && errors.specialties) {
      setErrors(prev => ({ ...prev, specialties: undefined }))
    }
  }

  const handleDesignStyleChange = (style: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      design_style: checked
        ? [...prev.design_style, style]
        : (prev.design_style || []).filter(s => s !== style)
    }))
  }



  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Designer
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Designer</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Designer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={errors.name ? 'border-red-300' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  className={errors.contact_email ? 'border-red-300' : ''}
                />
                {errors.contact_email && (
                  <p className="text-sm text-red-600">{errors.contact_email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://designer-website.com"
                  className={errors.website ? 'border-red-300' : ''}
                />
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio_url">Portfolio URL</Label>
                <Input
                  id="portfolio_url"
                  value={formData.portfolio_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, portfolio_url: e.target.value }))}
                  placeholder="https://portfolio.com"
                  className={errors.portfolio_url ? 'border-red-300' : ''}
                />
                {errors.portfolio_url && (
                  <p className="text-sm text-red-600">{errors.portfolio_url}</p>
                )}
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Professional Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'prospect' | 'active' | 'preferred' | 'on_hold' | 'inactive') => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="preferred">Preferred</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate</Label>
                <div className="flex space-x-2">
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    placeholder="150.00"
                    className={`flex-1 ${errors.hourly_rate ? 'border-red-300' : ''}`}
                  />
                  <Select
                    value={formData.currency}
                    onValueChange={(value: string) => 
                      setFormData(prev => ({ ...prev, currency: value }))
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.hourly_rate && (
                  <p className="text-sm text-red-600">{errors.hourly_rate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="years_experience">Years of Experience</Label>
                <Input
                  id="years_experience"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.years_experience || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    years_experience: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className={errors.years_experience ? 'border-red-300' : ''}
                />
                {errors.years_experience && (
                  <p className="text-sm text-red-600">{errors.years_experience}</p>
                )}
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Specialties *</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DESIGNER_SPECIALTIES.map((specialty) => (
                <div key={specialty} className="flex items-center space-x-2">
                  <Checkbox
                    id={specialty}
                    checked={(formData.specialties || "").includes(specialty)}
                    onCheckedChange={(checked) => 
                      handleSpecialtyChange(specialty, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={specialty}
                    className="text-sm font-normal cursor-pointer capitalize"
                  >
                    {safeFormatString(specialty, 'design')}
                  </Label>
                </div>
              ))}
            </div>
            {errors.specialties && (
              <p className="text-sm text-red-600">{errors.specialties}</p>
            )}
          </div>

          {/* Design Styles */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Design Styles</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DESIGN_STYLES.map((style) => (
                <div key={style} className="flex items-center space-x-2">
                  <Checkbox
                    id={style}
                    checked={(formData.design_style || "").includes(style)}
                    onCheckedChange={(checked) => 
                      handleDesignStyleChange(style, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={style}
                    className="text-sm font-normal cursor-pointer capitalize"
                  >
                    {safeFormatString(style, 'modern')}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this designer..."
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Designer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}