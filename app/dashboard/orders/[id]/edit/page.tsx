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
  client_name: string
}

interface Item {
  id: string
  name: string
  sku_base: string
  base_price: number
  lead_time_days: number
  collection_name?: string
  available_finishes?: string[]
  available_fabrics?: string[]
  dimension_units: 'inches' | 'cm'
  width?: number
  depth?: number
  height?: number
}

interface OrderLineItem {
  id: string
  item_id: string
  item?: Item
  quantity: number
  unit_price: number
  customizations: {
    fabric?: string
    finish?: string
    dimensions?: {
      width?: number
      depth?: number
      height?: number
    }
    notes?: string
  }
  lead_time_days: number
  line_total: number
  production_status: 'pending' | 'in_production' | 'quality_check' | 'ready' | 'shipped' | 'delivered'
  estimated_completion?: string
  actual_completion?: string
  production_notes?: string
}

interface Order {
  id: string
  order_number: string
  project_id: string
  project?: Project
  category: 'furniture' | 'decking' | 'cladding' | 'fixtures' | 'custom_millwork'
  status: 'draft' | 'confirmed' | 'in_production' | 'ready_to_ship' | 'shipped' | 'delivered'
  line_items: OrderLineItem[]
  subtotal: number
  tax_amount: number
  total_amount: number
  deposit_percentage: number
  deposit_amount: number
  balance_amount: number
  deposit_paid_date?: string
  balance_paid_date?: string
  payment_status: 'pending' | 'deposit_paid' | 'fully_paid'
  po_number?: string
  po_file_url?: string
  estimated_delivery_date?: string
  actual_delivery_date?: string
  created_at: string
  updated_at?: string
  notes?: string
  client_notes?: string
}

export default function OrderEditPage({ params }: { params: Promise<{ id: string }> }) {
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
  } = useEntityCRUD<Order>(resolvedParams.id, {
    tableName: 'orders',
    backUrl: '/dashboard/orders',
    successMessage: 'Order updated successfully'
  })

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Orders', href: '/dashboard/orders' },
    { label: data ? `Order ${data.order_number}` : 'Edit Order', href: undefined }
  ]

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_production', label: 'In Production' },
    { value: 'ready_to_ship', label: 'Ready to Ship' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' }
  ]

  const categoryOptions = [
    { value: 'furniture', label: 'Furniture' },
    { value: 'decking', label: 'Decking' },
    { value: 'cladding', label: 'Cladding' },
    { value: 'fixtures', label: 'Fixtures' },
    { value: 'custom_millwork', label: 'Custom Millwork' }
  ]

  const paymentStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'deposit_paid', label: 'Deposit Paid' },
    { value: 'fully_paid', label: 'Fully Paid' }
  ]

  return (
    <EditPageTemplate
      title="Edit Order"
      breadcrumbs={breadcrumbs}
      data={editData}
      loading={loading}
      saving={saving}
      error={error}
      onSave={saveEntity}
      onCancel={cancelEdit}
      backUrl="/dashboard/orders"
    >
      {/* Order Information */}
      <FormSection 
        title="Order Information"
        description="Basic order details and project assignment"
      >
        <ThreeColumnLayout>
          <TextField
            label="Order Number"
            value={editData.order_number || ''}
            onChange={(value) => updateField('order_number', value)}
            placeholder="ORD-001"
            required
            description="Unique order identifier"
          />
          
          <TextField
            label="Project ID"
            value={editData.project_id || ''}
            onChange={(value) => updateField('project_id', value)}
            placeholder="Select project"
            required
            description="Associated project for this order"
          />
          
          <SelectField
            label="Category"
            value={editData.category || 'furniture'}
            onChange={(value) => updateField('category', value as Order['category'])}
            options={categoryOptions}
            required
            description="Type of products in this order"
          />
        </ThreeColumnLayout>

        <TwoColumnLayout>
          <TextField
            label="PO Number"
            value={editData.po_number || ''}
            onChange={(value) => updateField('po_number', value)}
            placeholder="Client's purchase order number"
            description="Optional purchase order reference"
          />
          
          <TextField
            label="PO File URL"
            value={editData.po_file_url || ''}
            onChange={(value) => updateField('po_file_url', value)}
            placeholder="https://example.com/po-document.pdf"
            type="url"
            description="Link to purchase order document"
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Status & Timeline */}
      <FormSection 
        title="Status & Timeline"
        description="Order status and delivery scheduling"
      >
        <ThreeColumnLayout>
          <SelectField
            label="Status"
            value={editData.status || 'draft'}
            onChange={(value) => updateField('status', value as Order['status'])}
            options={statusOptions}
            required
            description="Current order status"
          />
          
          <SelectField
            label="Payment Status"
            value={editData.payment_status || 'pending'}
            onChange={(value) => updateField('payment_status', value as Order['payment_status'])}
            options={paymentStatusOptions}
            required
            description="Current payment status"
          />
          
          <NumberField
            label="Deposit Percentage"
            value={editData.deposit_percentage || 50}
            onChange={(value) => updateField('deposit_percentage', value)}
            min={0}
            max={100}
            step={5}
            description="Percentage required as deposit"
          />
        </ThreeColumnLayout>

        <TwoColumnLayout>
          <TextField
            label="Estimated Delivery Date"
            value={editData.estimated_delivery_date ? (editData.estimated_delivery_date || "").split('T')[0] : ''}
            onChange={(value) => updateField('estimated_delivery_date', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            description="When delivery is expected"
          />
          
          <TextField
            label="Actual Delivery Date"
            value={editData.actual_delivery_date ? (editData.actual_delivery_date || "").split('T')[0] : ''}
            onChange={(value) => updateField('actual_delivery_date', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            description="When delivery actually occurred"
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Financial Information */}
      <FormSection 
        title="Financial Information"
        description="Pricing, taxes, and payment details"
      >
        <ThreeColumnLayout>
          <NumberField
            label="Subtotal"
            value={editData.subtotal || 0}
            onChange={(value) => updateField('subtotal', value)}
            min={0}
            step={0.01}
            description="Order subtotal before tax"
          />
          
          <NumberField
            label="Tax Amount"
            value={editData.tax_amount || 0}
            onChange={(value) => updateField('tax_amount', value)}
            min={0}
            step={0.01}
            description="Total tax amount"
          />
          
          <NumberField
            label="Total Amount"
            value={editData.total_amount || 0}
            onChange={(value) => updateField('total_amount', value)}
            min={0}
            step={0.01}
            description="Final total including tax"
          />
        </ThreeColumnLayout>

        <ThreeColumnLayout>
          <NumberField
            label="Deposit Amount"
            value={editData.deposit_amount || 0}
            onChange={(value) => updateField('deposit_amount', value)}
            min={0}
            step={0.01}
            description="Required deposit amount"
          />
          
          <NumberField
            label="Balance Amount"
            value={editData.balance_amount || 0}
            onChange={(value) => updateField('balance_amount', value)}
            min={0}
            step={0.01}
            description="Remaining balance due"
          />
          
          <div /> {/* Empty column for spacing */}
        </ThreeColumnLayout>
      </FormSection>

      {/* Payment Tracking */}
      <FormSection 
        title="Payment Tracking"
        description="Record payment dates and status updates"
      >
        <TwoColumnLayout>
          <TextField
            label="Deposit Paid Date"
            value={editData.deposit_paid_date ? (editData.deposit_paid_date || "").split('T')[0] : ''}
            onChange={(value) => updateField('deposit_paid_date', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            description="When the deposit was received"
          />
          
          <TextField
            label="Balance Paid Date"
            value={editData.balance_paid_date ? (editData.balance_paid_date || "").split('T')[0] : ''}
            onChange={(value) => updateField('balance_paid_date', value ? `${value}T12:00:00.000Z` : '')}
            type="date"
            description="When the final balance was received"
          />
        </TwoColumnLayout>
      </FormSection>

      {/* Notes & Communication */}
      <FormSection 
        title="Notes & Communication"
        description="Internal notes and client-facing information"
      >
        <TextareaField
          label="Internal Notes"
          value={editData.notes || ''}
          onChange={(value) => updateField('notes', value)}
          placeholder="Add internal notes about production, shipping, issues, etc..."
          rows={4}
          description="Internal notes - not visible to client"
        />
        
        <TextareaField
          label="Client Notes"
          value={editData.client_notes || ''}
          onChange={(value) => updateField('client_notes', value)}
          placeholder="Add notes that will be visible to the client..."
          rows={4}
          description="Notes visible to the client on their portal"
        />
      </FormSection>
    </EditPageTemplate>
  )
}