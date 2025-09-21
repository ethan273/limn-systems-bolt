'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Lead {
  id: string
  contact_id: string
  contact_name: string
  contact_email: string
  company: string
  title: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  lead_source: 'website' | 'referral' | 'cold_outreach' | 'trade_show' | 'social_media' | 'advertising'
  estimated_value: number
  probability: number
  expected_close_date?: string
  assigned_to: string
  stage: 'awareness' | 'interest' | 'consideration' | 'intent' | 'evaluation' | 'purchase'
  project_type: 'furniture' | 'decking' | 'cladding' | 'fixtures' | 'custom_millwork' | 'mixed'
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  budget_confirmed: boolean
  decision_maker_identified: boolean
  timeline_confirmed: boolean
  created_at: string
  updated_at?: string
  last_contact_date?: string
  next_follow_up?: string
  notes?: string
  lost_reason?: string
}

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (lead: Partial<Lead>) => void
  loading?: boolean
}

export default function CreateLeadModal({ isOpen, onClose, onSubmit, loading = false }: CreateLeadModalProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({
    contact_name: '',
    contact_email: '',
    company: '',
    title: '',
    status: 'new',
    lead_source: 'website',
    estimated_value: 0,
    probability: 50,
    assigned_to: 'ethan@limn.us.com',
    stage: 'interest',
    project_type: 'mixed',
    urgency: 'medium',
    budget_confirmed: false,
    decision_maker_identified: false,
    timeline_confirmed: false,
    notes: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.contact_name?.trim()) {
      newErrors.contact_name = 'Contact name is required'
    }
    
    if (!formData.contact_email?.trim()) {
      newErrors.contact_email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address'
    }
    
    if (!formData.company?.trim()) {
      newErrors.company = 'Company is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Submit the lead
    await onSubmit({
      ...formData,
      estimated_value: Number(formData.estimated_value) || 0,
      probability: Number(formData.probability) || 50
    })

    // Reset form if successful
    setFormData({
      contact_name: '',
      contact_email: '',
      company: '',
      title: '',
      status: 'new',
      lead_source: 'website',
      estimated_value: 0,
      probability: 50,
      assigned_to: 'ethan@limn.us.com',
      stage: 'interest',
      project_type: 'mixed',
      urgency: 'medium',
      budget_confirmed: false,
      decision_maker_identified: false,
      timeline_confirmed: false,
      notes: ''
    })
    setErrors({})
  }

  const handleChange = (field: keyof Lead, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Create New Lead</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name *</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name || ''}
                    onChange={(e) => handleChange('contact_name', e.target.value)}
                    placeholder="John Doe"
                    className={errors.contact_name ? 'border-red-500' : ''}
                  />
                  {errors.contact_name && (
                    <p className="text-sm text-red-500">{errors.contact_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email || ''}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    placeholder="john@company.com"
                    className={errors.contact_email ? 'border-red-500' : ''}
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-red-500">{errors.contact_email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    value={formData.company || ''}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="ABC Corporation"
                    className={errors.company ? 'border-red-500' : ''}
                  />
                  {errors.company && (
                    <p className="text-sm text-red-500">{errors.company}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={formData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="CEO, Manager, etc."
                  />
                </div>
              </div>
            </div>

            {/* Lead Details */}
            <div>
              <h3 className="text-lg font-medium mb-4">Lead Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead_source">Lead Source</Label>
                  <Select value={formData.lead_source} onValueChange={(value: any) => handleChange('lead_source', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                      <SelectItem value="trade_show">Trade Show</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="advertising">Advertising</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_type">Project Type</Label>
                  <Select value={formData.project_type} onValueChange={(value: any) => handleChange('project_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="decking">Decking</SelectItem>
                      <SelectItem value="cladding">Cladding</SelectItem>
                      <SelectItem value="fixtures">Fixtures</SelectItem>
                      <SelectItem value="custom_millwork">Custom Millwork</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_value">Estimated Value ($)</Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.estimated_value || 0}
                    onChange={(e) => handleChange('estimated_value', Number(e.target.value))}
                    placeholder="50000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(value: any) => handleChange('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Select value={formData.assigned_to} onValueChange={(value) => handleChange('assigned_to', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethan@limn.us.com">Ethan (CEO)</SelectItem>
                      <SelectItem value="sarah@designstudio.com">Sarah Chen (Designer)</SelectItem>
                      <SelectItem value="mike@production.com">Mike Rodriguez (Production)</SelectItem>
                      <SelectItem value="lisa@quality.com">Lisa Park (Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_close_date">Expected Close Date</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date || ''}
                    onChange={(e) => handleChange('expected_close_date', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this lead..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}