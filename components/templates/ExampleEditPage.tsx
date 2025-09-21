'use client'

import { use } from 'react'
import { EditPageTemplate } from './EditPageTemplate'
import { FormSection, TextField, TextareaField, SelectField, CheckboxField, TwoColumnLayout } from './FormFields'
import { useEntityCRUD } from '@/hooks/useEntityCRUD'

// Example interface - replace with actual entity type
interface ExampleEntity {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  status: 'active' | 'inactive'
  notes?: string
  is_featured: boolean
  created_at: string
  updated_at: string
}

interface ExampleEditPageProps {
  params: Promise<{ id: string }>
  tableName: string
  entityName: string
  backUrl: string
}

export default function ExampleEditPage({ params, tableName, entityName, backUrl }: ExampleEditPageProps) {
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
  } = useEntityCRUD<ExampleEntity>(resolvedParams.id, {
    tableName,
    backUrl,
    successMessage: `${entityName} updated successfully`,
    errorMessage: `Failed to update ${entityName}`
  })

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: entityName + 's', href: backUrl },
    { label: data?.name || 'Edit', href: undefined }
  ]

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]

  return (
    <EditPageTemplate
      title={`Edit ${entityName}`}
      breadcrumbs={breadcrumbs}
      data={editData}
      loading={loading}
      saving={saving}
      error={error}
      onSave={saveEntity}
      onCancel={cancelEdit}
      backUrl={backUrl}
    >
      {/* Basic Information Section */}
      <FormSection 
        title="Basic Information"
        description={`Essential ${entityName.toLowerCase()} details and contact information`}
      >
        <TwoColumnLayout>
          <TextField
            label="Name"
            value={editData.name || ''}
            onChange={(value) => updateField('name', value)}
            placeholder={`Enter ${entityName.toLowerCase()} name`}
            required
          />
          
          <TextField
            label="Email"
            value={editData.email || ''}
            onChange={(value) => updateField('email', value)}
            placeholder="Enter email address"
            type="email"
            required
          />
          
          <TextField
            label="Phone"
            value={editData.phone || ''}
            onChange={(value) => updateField('phone', value)}
            placeholder="Enter phone number"
            type="tel"
          />
          
          <TextField
            label="Company"
            value={editData.company || ''}
            onChange={(value) => updateField('company', value)}
            placeholder="Enter company name"
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Status & Settings Section */}
      <FormSection 
        title="Status & Settings"
        description={`Manage ${entityName.toLowerCase()} status and preferences`}
      >
        <TwoColumnLayout>
          <SelectField
            label="Status"
            value={editData.status || 'active'}
            onChange={(value) => updateField('status', value as 'active' | 'inactive')}
            options={statusOptions}
            required
          />
          
          <div className="pt-8">
            <CheckboxField
              label="Featured"
              checked={editData.is_featured || false}
              onChange={(checked) => updateField('is_featured', checked)}
              description={`Mark this ${entityName.toLowerCase()} as featured`}
            />
          </div>
        </TwoColumnLayout>
      </FormSection>

      {/* Notes Section */}
      <FormSection 
        title="Notes"
        description={`Additional notes and comments about this ${entityName.toLowerCase()}`}
      >
        <TextareaField
          label="Notes"
          value={editData.notes || ''}
          onChange={(value) => updateField('notes', value)}
          placeholder={`Add notes about this ${entityName.toLowerCase()}...`}
          rows={4}
        />
      </FormSection>
    </EditPageTemplate>
  )
}

/*
HOW TO USE THIS TEMPLATE:

1. Copy this file to your specific entity edit page location
2. Replace the interface with your entity's actual type
3. Update the form fields to match your entity's properties
4. Customize the form sections as needed
5. Update the breadcrumbs and navigation

EXAMPLE USAGE:

// app/dashboard/clients/[id]/edit/page.tsx
'use client'

import { use } from 'react'
import { EditPageTemplate } from '@/components/templates/EditPageTemplate'
import { FormSection, TextField, SelectField } from '@/components/templates/FormFields'
import { useEntityCRUD } from '@/hooks/useEntityCRUD'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  company: string
  status: 'active' | 'inactive'
}

export default function ClientEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  
  const {
    data, editData, loading, saving, error,
    updateField, saveEntity, cancelEdit
  } = useEntityCRUD<Client>(resolvedParams.id, {
    tableName: 'clients',
    backUrl: '/dashboard/clients',
    successMessage: 'Client updated successfully'
  })

  return (
    <EditPageTemplate
      title="Edit Client"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Clients', href: '/dashboard/clients' },
        { label: data?.name || 'Edit' }
      ]}
      data={editData}
      loading={loading}
      saving={saving}
      error={error}
      onSave={saveEntity}
      onCancel={cancelEdit}
      backUrl="/dashboard/clients"
    >
      <FormSection title="Client Information">
        <TextField
          label="Name"
          value={editData.name || ''}
          onChange={(value) => updateField('name', value)}
          required
        />
        <TextField
          label="Email"
          value={editData.email || ''}
          onChange={(value) => updateField('email', value)}
          type="email"
          required
        />
      </FormSection>
    </EditPageTemplate>
  )
}
*/