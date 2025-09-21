'use client'

import { use } from 'react'
import { EditPageTemplate } from '@/components/templates/EditPageTemplate'
import { 
  FormSection, 
  TextField, 
  NumberField,
  TextareaField, 
  SelectField, 
  CheckboxField,
  TwoColumnLayout, 
  ThreeColumnLayout 
} from '@/components/templates/FormFields'
import { useEntityCRUD } from '@/hooks/useEntityCRUD'

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

export default function LeadEditPage({ params }: { params: Promise<{ id: string }> }) {
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
  } = useEntityCRUD<Lead>(resolvedParams.id, {
    tableName: 'leads',
    backUrl: '/dashboard/leads',
    successMessage: 'Lead updated successfully'
  })

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Leads', href: '/dashboard/leads' },
    { label: data ? `${data.contact_name} - ${data.company}` : 'Edit Lead', href: undefined }
  ]

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' }
  ]

  const sourceOptions = [
    { value: 'website', label: 'Website' },
    { value: 'referral', label: 'Referral' },
    { value: 'cold_outreach', label: 'Cold Outreach' },
    { value: 'trade_show', label: 'Trade Show' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'advertising', label: 'Advertising' }
  ]

  const stageOptions = [
    { value: 'awareness', label: 'Awareness' },
    { value: 'interest', label: 'Interest' },
    { value: 'consideration', label: 'Consideration' },
    { value: 'intent', label: 'Intent' },
    { value: 'evaluation', label: 'Evaluation' },
    { value: 'purchase', label: 'Purchase' }
  ]

  const projectTypeOptions = [
    { value: 'furniture', label: 'Furniture' },
    { value: 'decking', label: 'Decking' },
    { value: 'cladding', label: 'Cladding' },
    { value: 'fixtures', label: 'Fixtures' },
    { value: 'custom_millwork', label: 'Custom Millwork' },
    { value: 'mixed', label: 'Mixed Project' }
  ]

  const urgencyOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]

  return (
    <EditPageTemplate
      title="Edit Lead"
      breadcrumbs={breadcrumbs}
      data={editData}
      loading={loading}
      saving={saving}
      error={error}
      onSave={saveEntity}
      onCancel={cancelEdit}
      backUrl="/dashboard/leads"
    >
      {/* Contact Information */}
      <FormSection 
        title="Contact Information"
        description="Lead contact details and company information"
      >
        <TwoColumnLayout>
          <TextField
            label="Contact Name"
            value={editData.contact_name || ''}
            onChange={(value) => updateField('contact_name', value)}
            placeholder="Full name of contact person"
            required
          />
          
          <TextField
            label="Email"
            value={editData.contact_email || ''}
            onChange={(value) => updateField('contact_email', value)}
            placeholder="contact@company.com"
            type="email"
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
            label="Job Title"
            value={editData.title || ''}
            onChange={(value) => updateField('title', value)}
            placeholder="e.g., Project Manager, Owner"
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Lead Status & Pipeline */}
      <FormSection 
        title="Lead Status & Pipeline"
        description="Current status and pipeline stage management"
      >
        <ThreeColumnLayout>
          <SelectField
            label="Status"
            value={editData.status || 'new'}
            onChange={(value) => updateField('status', value as Lead['status'])}
            options={statusOptions}
            required
            description="Current lead status"
          />
          
          <SelectField
            label="Stage"
            value={editData.stage || 'awareness'}
            onChange={(value) => updateField('stage', value as Lead['stage'])}
            options={stageOptions}
            required
            description="Current sales funnel stage"
          />
          
          <SelectField
            label="Lead Source"
            value={editData.lead_source || 'website'}
            onChange={(value) => updateField('lead_source', value as Lead['lead_source'])}
            options={sourceOptions}
            required
            description="How this lead was acquired"
          />
        </ThreeColumnLayout>
      </FormSection>

      {/* Project Details */}
      <FormSection 
        title="Project Details"
        description="Project specifications and requirements"
      >
        <TwoColumnLayout>
          <SelectField
            label="Project Type"
            value={editData.project_type || 'furniture'}
            onChange={(value) => updateField('project_type', value as Lead['project_type'])}
            options={projectTypeOptions}
            required
            description="Primary type of project"
          />
          
          <SelectField
            label="Urgency"
            value={editData.urgency || 'medium'}
            onChange={(value) => updateField('urgency', value as Lead['urgency'])}
            options={urgencyOptions}
            required
            description="Project timeline urgency"
          />
          
          <NumberField
            label="Estimated Value"
            value={editData.estimated_value || 0}
            onChange={(value) => updateField('estimated_value', value)}
            min={0}
            step={1000}
            description="Estimated project value in USD"
          />
          
          <NumberField
            label="Probability (%)"
            value={editData.probability || 0}
            onChange={(value) => updateField('probability', value)}
            min={0}
            max={100}
            step={5}
            description="Likelihood of closing this lead"
          />
        </TwoColumnLayout>

        <TextField
          label="Expected Close Date"
          value={editData.expected_close_date ? (editData.expected_close_date || "").split('T')[0] : ''}
          onChange={(value) => updateField('expected_close_date', value ? `${value}T12:00:00.000Z` : '')}
          type="date"
          description="When you expect to close this lead"
        />
      </FormSection>

      {/* Qualification & Management */}
      <FormSection 
        title="Qualification & Management"
        description="Lead qualification status and assignment"
      >
        <TwoColumnLayout>
          <TextField
            label="Assigned To"
            value={editData.assigned_to || ''}
            onChange={(value) => updateField('assigned_to', value)}
            placeholder="Sales rep or team member"
            required
            description="Who is responsible for this lead"
          />
          
          <div className="space-y-4">
            <CheckboxField
              label="Budget Confirmed"
              checked={editData.budget_confirmed || false}
              onChange={(checked) => updateField('budget_confirmed', checked)}
              description="Has the prospect confirmed they have budget?"
            />
            
            <CheckboxField
              label="Decision Maker Identified"
              checked={editData.decision_maker_identified || false}
              onChange={(checked) => updateField('decision_maker_identified', checked)}
              description="Have you identified the key decision maker?"
            />
            
            <CheckboxField
              label="Timeline Confirmed"
              checked={editData.timeline_confirmed || false}
              onChange={(checked) => updateField('timeline_confirmed', checked)}
              description="Has the prospect confirmed their timeline?"
            />
          </div>
        </TwoColumnLayout>
      </FormSection>

      {/* Activity Tracking */}
      <FormSection 
        title="Activity Tracking"
        description="Contact history and follow-up scheduling"
      >
        <TwoColumnLayout>
          <TextField
            label="Last Contact Date"
            value={editData.last_contact_date ? (editData.last_contact_date || "").split('T')[0] : ''}
            onChange={(value) => updateField('last_contact_date', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            description="When did you last contact this lead?"
          />
          
          <TextField
            label="Next Follow-up"
            value={editData.next_follow_up ? (editData.next_follow_up || "").split('T')[0] : ''}
            onChange={(value) => updateField('next_follow_up', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            description="When should you follow up next?"
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Notes & Lost Reason */}
      <FormSection 
        title="Notes & Additional Information"
        description="Internal notes and additional details"
      >
        <TextareaField
          label="Notes"
          value={editData.notes || ''}
          onChange={(value) => updateField('notes', value)}
          placeholder="Add notes about conversations, requirements, concerns, etc..."
          rows={4}
          description="Internal notes - not visible to the lead"
        />
        
        {editData.status === 'lost' && (
          <TextareaField
            label="Lost Reason"
            value={editData.lost_reason || ''}
            onChange={(value) => updateField('lost_reason', value)}
            placeholder="Why was this lead lost? (budget, timeline, competition, etc.)"
            rows={3}
            description="Required when status is set to 'Lost'"
          />
        )}
      </FormSection>
    </EditPageTemplate>
  )
}