'use client'

import { use } from 'react'
import { EditPageTemplate } from '@/components/templates/EditPageTemplate'
import { 
  FormSection, 
  TextField, 
  NumberField,
  TextareaField, 
  SelectField, 
  TwoColumnLayout, 
  ThreeColumnLayout 
} from '@/components/templates/FormFields'
import { useEntityCRUD } from '@/hooks/useEntityCRUD'


interface Project {
  id: string
  name: string
  client_id: string
  client_name: string
  description?: string
  status: 'planning' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  start_date: string
  estimated_end_date?: string
  actual_end_date?: string
  room_assignments?: string[]
  space_details?: string
  project_manager: string
  estimated_budget: number
  actual_budget: number
  created_at: string
  updated_at?: string
  notes?: string
}

export default function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
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
  } = useEntityCRUD<Project>(resolvedParams.id, {
    tableName: 'projects',
    backUrl: '/dashboard/projects',
    successMessage: 'Project updated successfully'
  })

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/dashboard/projects' },
    { label: data ? data.name : 'Edit Project', href: undefined }
  ]

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'approved', label: 'Approved' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]

  return (
    <EditPageTemplate
      title="Edit Project"
      breadcrumbs={breadcrumbs}
      data={editData}
      loading={loading}
      saving={saving}
      error={error}
      onSave={saveEntity}
      onCancel={cancelEdit}
      backUrl="/dashboard/projects"
    >
      {/* Project Information */}
      <FormSection 
        title="Project Information"
        description="Basic project details and identification"
      >
        <TwoColumnLayout>
          <TextField
            label="Project Name"
            value={editData.name || ''}
            onChange={(value) => updateField('name', value)}
            placeholder="Enter project name"
            required
            description="Unique project identifier"
          />
          
          <TextField
            label="Client ID"
            value={editData.client_id || ''}
            onChange={(value) => updateField('client_id', value)}
            placeholder="Select or enter client ID"
            required
            description="Associated client for this project"
          />
        </TwoColumnLayout>

        <TextareaField
          label="Description"
          value={editData.description || ''}
          onChange={(value) => updateField('description', value)}
          placeholder="Describe the project scope and objectives..."
          rows={3}
          description="Brief overview of the project"
        />
      </FormSection>

      {/* Status & Priority */}
      <FormSection 
        title="Status & Priority"
        description="Project status tracking and priority level"
      >
        <TwoColumnLayout>
          <SelectField
            label="Status"
            value={editData.status || 'planning'}
            onChange={(value) => updateField('status', value as Project['status'])}
            options={statusOptions}
            required
            description="Current project status"
          />
          
          <SelectField
            label="Priority"
            value={editData.priority || 'medium'}
            onChange={(value) => updateField('priority', value as Project['priority'])}
            options={priorityOptions}
            required
            description="Project priority level"
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Timeline & Scheduling */}
      <FormSection 
        title="Timeline & Scheduling"
        description="Project dates and scheduling information"
      >
        <ThreeColumnLayout>
          <TextField
            label="Start Date"
            value={editData.start_date ? (editData.start_date || "").split('T')[0] : ''}
            onChange={(value) => updateField('start_date', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            required
            description="When the project begins"
          />
          
          <TextField
            label="Estimated End Date"
            value={editData.estimated_end_date ? (editData.estimated_end_date || "").split('T')[0] : ''}
            onChange={(value) => updateField('estimated_end_date', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            description="Expected project completion"
          />
          
          <TextField
            label="Actual End Date"
            value={editData.actual_end_date ? (editData.actual_end_date || "").split('T')[0] : ''}
            onChange={(value) => updateField('actual_end_date', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            description="When project was actually completed"
          />
        </ThreeColumnLayout>
      </FormSection>

      {/* Project Management */}
      <FormSection 
        title="Project Management"
        description="Team assignment and project management details"
      >
        <TextField
          label="Project Manager"
          value={editData.project_manager || ''}
          onChange={(value) => updateField('project_manager', value)}
          placeholder="Name of project manager"
          required
          description="Who is managing this project"
        />
      </FormSection>

      {/* Budget Information */}
      <FormSection 
        title="Budget Information"
        description="Project budget and cost tracking"
      >
        <TwoColumnLayout>
          <NumberField
            label="Estimated Budget"
            value={editData.estimated_budget || 0}
            onChange={(value) => updateField('estimated_budget', value)}
            min={0}
            step={1000}
            description="Initial budget estimate"
          />
          
          <NumberField
            label="Actual Budget"
            value={editData.actual_budget || 0}
            onChange={(value) => updateField('actual_budget', value)}
            min={0}
            step={1000}
            description="Actual budget spent"
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Space & Location Details */}
      <FormSection 
        title="Space & Location Details"
        description="Physical space and room information"
      >
        <TextareaField
          label="Space Details"
          value={editData.space_details || ''}
          onChange={(value) => updateField('space_details', value)}
          placeholder="Describe the physical space requirements..."
          rows={3}
          description="Details about the project space"
        />
        
        <TextField
          label="Room Assignments"
          value={editData.room_assignments ? editData.room_assignments.join(', ') : ''}
          onChange={(value) => updateField('room_assignments', value.split(',').map(room => room.trim()).filter(Boolean))}
          placeholder="Living Room, Kitchen, Master Bedroom"
          description="Comma-separated list of rooms involved"
        />
      </FormSection>

      {/* Notes & Additional Information */}
      <FormSection 
        title="Notes & Additional Information"
        description="Internal notes and additional project details"
      >
        <TextareaField
          label="Project Notes"
          value={editData.notes || ''}
          onChange={(value) => updateField('notes', value)}
          placeholder="Add any additional notes about the project..."
          rows={4}
          description="Internal notes and observations"
        />
      </FormSection>
    </EditPageTemplate>
  )
}