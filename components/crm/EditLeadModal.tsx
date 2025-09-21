'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  status: string
  source: string
  value: number
  assigned_to: string
  notes?: string
}

interface EditLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  lead: Lead | null
}

export default function EditLeadModal({
  isOpen,
  onClose,
  onSuccess,
  lead
}: EditLeadModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'new',
    source: 'manual',
    value: '',
    assigned_to: '',
    notes: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Populate form when lead changes
  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        company: lead.company || '',
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.status || 'new',
        source: lead.source || 'manual',
        value: lead.value ? lead.value.toString() : '',
        assigned_to: lead.assigned_to || '',
        notes: lead.notes || ''
      })
    }
  }, [lead])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          value: formData.value ? parseFloat(formData.value) : 0
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update lead')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!lead) return

    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete lead')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!lead) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Lead name"
                required
              />
            </div>

            <div>
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Company name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="source">Source</Label>
                <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="trade_show">Trade Show</SelectItem>
                    <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="value">Value ($)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Input
                  id="assigned_to"
                  value={formData.assigned_to}
                  onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                  placeholder="Assigned person"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isLoading ? 'Deleting...' : 'Delete Lead'}
            </Button>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.name || !formData.company || !formData.email}
              >
                {isLoading ? 'Updating...' : 'Update Lead'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}