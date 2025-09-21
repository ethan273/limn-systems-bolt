'use client'

import { use } from 'react'
import { EditPageTemplate } from '@/components/templates/EditPageTemplate'
import { 
  FormSection, 
  TextField, 
  SelectField, 
  TwoColumnLayout, 
  ThreeColumnLayout 
} from '@/components/templates/FormFields'
import { useEntityCRUD } from '@/hooks/useEntityCRUD'

interface Customer {
  id: string
  name: string
  company_name?: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  type?: string
  status: 'active' | 'inactive' | 'prospect'
  portal_access?: boolean
  created_at: string
  updated_at?: string
}

export default function ClientEditPage({ params }: { params: Promise<{ id: string }> }) {
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
  } = useEntityCRUD<Customer>(resolvedParams.id, {
    tableName: 'customers',
    backUrl: '/dashboard/clients',
    successMessage: 'Customer updated successfully'
  })

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Clients', href: '/dashboard/clients' },
    { label: data?.company_name || data?.name || 'Edit Customer', href: undefined }
  ]

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'prospect', label: 'Prospect' }
  ]

  const typeOptions = [
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'construction', label: 'Construction' },
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'retail', label: 'Retail' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <EditPageTemplate
      title="Edit Customer"
      breadcrumbs={breadcrumbs}
      data={editData}
      loading={loading}
      saving={saving}
      error={error}
      onSave={saveEntity}
      onCancel={cancelEdit}
      backUrl="/dashboard/clients"
    >
      {/* Contact Information */}
      <FormSection 
        title="Contact Information"
        description="Primary contact and company details"
      >
        <TwoColumnLayout>
          <TextField
            label="Contact Name"
            value={editData.name || ''}
            onChange={(value) => updateField('name', value)}
            placeholder="Enter contact name"
            required
          />
          
          <TextField
            label="Company Name"
            value={editData.company_name || ''}
            onChange={(value) => updateField('company_name', value)}
            placeholder="Enter company name"
          />
          
          <TextField
            label="Email Address"
            value={editData.email || ''}
            onChange={(value) => updateField('email', value)}
            placeholder="contact@company.com"
            type="email"
            required
          />
          
          <TextField
            label="Phone Number"
            value={editData.phone || ''}
            onChange={(value) => updateField('phone', value)}
            placeholder="+1 (555) 123-4567"
            type="tel"
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Address Information */}
      <FormSection 
        title="Address Information"
        description="Company location and mailing address"
      >
        <TextField
          label="Street Address"
          value={editData.address || ''}
          onChange={(value) => updateField('address', value)}
          placeholder="123 Main Street"
        />
        
        <ThreeColumnLayout>
          <TextField
            label="City"
            value={editData.city || ''}
            onChange={(value) => updateField('city', value)}
            placeholder="City"
          />
          
          <TextField
            label="State"
            value={editData.state || ''}
            onChange={(value) => updateField('state', value)}
            placeholder="State"
          />
          
          <TextField
            label="ZIP Code"
            value={editData.zip || ''}
            onChange={(value) => updateField('zip', value)}
            placeholder="12345"
          />
        </ThreeColumnLayout>
      </FormSection>

      {/* Business Information */}
      <FormSection 
        title="Business Information"
        description="Business type and relationship status"
      >
        <TwoColumnLayout>
          <SelectField
            label="Business Type"
            value={editData.type || 'commercial'}
            onChange={(value) => updateField('type', value)}
            options={typeOptions}
          />
          
          <SelectField
            label="Status"
            value={editData.status || 'prospect'}
            onChange={(value) => updateField('status', value as Customer['status'])}
            options={statusOptions}
            required
            description="Current relationship status"
          />
        </TwoColumnLayout>
      </FormSection>
    </EditPageTemplate>
  )
}