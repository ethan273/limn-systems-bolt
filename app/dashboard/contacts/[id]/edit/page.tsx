'use client'

import { use } from 'react'
import { EditPageTemplate } from '@/components/templates/EditPageTemplate'
import { 
  FormSection, 
  TextField, 
  TextareaField, 
  SelectField, 
  CheckboxField,
  TwoColumnLayout, 
  ThreeColumnLayout 
} from '@/components/templates/FormFields'
import { useEntityCRUD } from '@/hooks/useEntityCRUD'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  title: string
  company: string
  department?: string
  is_primary: boolean
  client_id?: string
  source: 'website' | 'referral' | 'cold_outreach' | 'trade_show' | 'social_media' | 'advertising' | 'networking'
  status: 'active' | 'inactive' | 'do_not_contact'
  tags: string[]
  notes?: string
  linkedin_url?: string
  created_at: string
  updated_at?: string
  last_contact_date?: string
  next_follow_up?: string
}

export default function ContactEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  
  const {
    data,
    editData,
    loading,
    saving,
    error,
    updateField,
    saveEntity,
    cancelEdit
  } = useEntityCRUD<Contact>(resolvedParams.id, {
    tableName: 'contacts',
    backUrl: '/dashboard/contacts',
    successMessage: 'Contact updated successfully'
  })

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Contacts', href: '/dashboard/contacts' },
    { label: data ? `${data.first_name} ${data.last_name}` : 'Edit Contact', href: undefined }
  ]

  const sourceOptions = [
    { value: 'website', label: 'Website' },
    { value: 'referral', label: 'Referral' },
    { value: 'cold_outreach', label: 'Cold Outreach' },
    { value: 'trade_show', label: 'Trade Show' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'advertising', label: 'Advertising' },
    { value: 'networking', label: 'Networking' }
  ]

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'do_not_contact', label: 'Do Not Contact' }
  ]

  return (
    <EditPageTemplate
      title="Edit Contact"
      breadcrumbs={breadcrumbs}
      data={editData}
      loading={loading}
      saving={saving}
      error={error}
      onSave={saveEntity}
      onCancel={cancelEdit}
      backUrl="/dashboard/contacts"
    >
      {/* Personal Information */}
      <FormSection 
        title="Personal Information"
        description="Basic contact details and personal information"
      >
        <TwoColumnLayout>
          <TextField
            label="First Name"
            value={editData.first_name || ''}
            onChange={(value) => updateField('first_name', value)}
            placeholder="Enter first name"
            required
          />
          
          <TextField
            label="Last Name"
            value={editData.last_name || ''}
            onChange={(value) => updateField('last_name', value)}
            placeholder="Enter last name"
            required
          />
          
          <TextField
            label="Email"
            value={editData.email || ''}
            onChange={(value) => updateField('email', value)}
            placeholder="contact@company.com"
            type="email"
            required
          />
          
          <TextField
            label="Phone"
            value={editData.phone || ''}
            onChange={(value) => updateField('phone', value)}
            placeholder="+1 (555) 000-0000"
            type="tel"
            required
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Professional Information */}
      <FormSection 
        title="Professional Information"
        description="Company and role-related information"
      >
        <ThreeColumnLayout>
          <TextField
            label="Job Title"
            value={editData.title || ''}
            onChange={(value) => updateField('title', value)}
            placeholder="e.g., Project Manager, CEO"
            required
          />
          
          <TextField
            label="Company"
            value={editData.company || ''}
            onChange={(value) => updateField('company', value)}
            placeholder="Company name"
            required
          />
          
          <TextField
            label="Department"
            value={editData.department || ''}
            onChange={(value) => updateField('department', value)}
            placeholder="e.g., Operations, Sales"
          />
        </ThreeColumnLayout>

        <TwoColumnLayout>
          <TextField
            label="LinkedIn URL"
            value={editData.linkedin_url || ''}
            onChange={(value) => updateField('linkedin_url', value)}
            placeholder="https://linkedin.com/in/username"
            type="url"
          />
          
          <div className="pt-8">
            <CheckboxField
              label="Primary Contact"
              checked={editData.is_primary || false}
              onChange={(checked) => updateField('is_primary', checked)}
              description="Mark as the primary contact for this company"
            />
          </div>
        </TwoColumnLayout>
      </FormSection>

      {/* Contact Management */}
      <FormSection 
        title="Contact Management"
        description="Source, status, and follow-up information"
      >
        <ThreeColumnLayout>
          <SelectField
            label="Source"
            value={editData.source || 'website'}
            onChange={(value) => updateField('source', value as Contact['source'])}
            options={sourceOptions}
            required
            description="How did you first connect with this contact?"
          />
          
          <SelectField
            label="Status"
            value={editData.status || 'active'}
            onChange={(value) => updateField('status', value as Contact['status'])}
            options={statusOptions}
            required
            description="Current communication status"
          />
          
          <TextField
            label="Next Follow-up"
            value={editData.next_follow_up ? (editData.next_follow_up || "").split('T')[0] : ''}
            onChange={(value) => updateField('next_follow_up', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            description="When to follow up next"
          />
        </ThreeColumnLayout>

        <TextField
          label="Last Contact Date"
          value={editData.last_contact_date ? (editData.last_contact_date || "").split('T')[0] : ''}
          onChange={(value) => updateField('last_contact_date', value ? `${value}T12:00:00.000Z` : '')}
          type="date"
          description="When did you last speak with this contact?"
        />
      </FormSection>

      {/* Tags & Notes */}
      <FormSection 
        title="Tags & Notes"
        description="Additional categorization and notes"
      >
        <TextField
          label="Tags"
          value={editData.tags ? editData.tags.join(', ') : ''}
          onChange={(value) => updateField('tags', value.split(',').map(tag => tag.trim()).filter(Boolean))}
          placeholder="decision-maker, technical, budget-holder"
          description="Comma-separated tags for easy filtering and organization"
        />
        
        <TextareaField
          label="Notes"
          value={editData.notes || ''}
          onChange={(value) => updateField('notes', value)}
          placeholder="Add any additional notes about this contact, conversation history, preferences, etc..."
          rows={4}
          description="Internal notes - not visible to the contact"
        />
      </FormSection>
    </EditPageTemplate>
  )
}