import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  trigger: TriggerConfig
  actions: ActionConfig[]
  conditions?: Record<string, unknown>
  popularity: number
  icon: string
}

export interface TriggerConfig {
  type: string
  config?: unknown
}

export interface ActionConfig {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
  required: boolean
}

// GET: Get pre-built templates
export async function GET() {
  try {
    console.log('Workflow Templates API: Fetching templates')
    
    const templates = getPrebuiltTemplates()
    
    return NextResponse.json({
      templates,
      categories: [
        'Order Management',
        'Customer Service',
        'Production',
        'Sales & Marketing',
        'Finance'
      ]
    })
  } catch (error) {
    console.error('Workflow templates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Install a template as a new workflow
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { template_id, name, description, customizations } = body
    
    console.log('Workflow Templates API: Installing template:', template_id)
    
    const template = getPrebuiltTemplates().find(t => t.id === template_id)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Create workflow from template
    const { data: workflow, error } = await supabase
      .from('workflow_templates')
      .insert({
        name: name || template.name,
        description: description || template.description,
        trigger_type: template.trigger.type,
        trigger_config: Object.assign({}, template.trigger.config, customizations?.trigger || {}),
        actions: template.actions.map(action => ({
          ...action,
          config: Object.assign({}, action.config, customizations?.actions?.[action.id] || {})
        })),
        conditions: Object.assign({}, template.conditions, customizations?.conditions || {}),
        enabled: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error installing template:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error('Install template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getPrebuiltTemplates(): WorkflowTemplate[] {
  return [
    {
      id: 'new-order-workflow',
      name: 'New Order Processing',
      description: 'Automatically process new orders and create tasks',
      category: 'Order Management',
      icon: '📦',
      trigger: {
        type: 'order_created',
        config: {}
      },
      actions: [
        {
          id: '1',
          type: 'create_task',
          name: 'Create Order Processing Task',
          config: {
            title: 'Process Order {{order.number}}',
            description: 'Process new order from {{customer.name}}',
            assignee: '{{order.sales_rep}}',
            due_date: '{{date.add(2, "days")}}',
            priority: 'medium'
          },
          required: true
        },
        {
          id: '2',
          type: 'send_email',
          name: 'Send Order Confirmation',
          config: {
            to: '{{customer.email}}',
            template: 'order_confirmation',
            subject: 'Order Confirmation - {{order.number}}',
            data: {
              order_number: '{{order.number}}',
              customer_name: '{{customer.name}}',
              total: '{{order.total}}'
            }
          },
          required: false
        },
        {
          id: '3',
          type: 'notify_slack',
          name: 'Notify Sales Team',
          config: {
            channel: '#orders',
            message: '🎉 New order {{order.number}} from {{customer.name}} - ${{order.total}}'
          },
          required: false
        }
      ],
      popularity: 95
    },
    {
      id: 'production-complete-workflow',
      name: 'Production Complete Workflow',
      description: 'Handle production completion and quality control',
      category: 'Production',
      icon: '🏭',
      trigger: {
        type: 'production_status_change',
        config: {
          status: 'completed'
        }
      },
      actions: [
        {
          id: '1',
          type: 'create_task',
          name: 'Create QC Task',
          config: {
            title: 'Quality Control - {{order.number}}',
            description: 'Perform quality control for completed order',
            assignee: 'qc_team',
            due_date: '{{date.add(1, "days")}}',
            priority: 'high'
          },
          required: true
        },
        {
          id: '2',
          type: 'notify_slack',
          name: 'Notify Shipping Team',
          config: {
            channel: '#shipping',
            message: '📦 Order {{order.number}} ready for QC and shipping preparation'
          },
          required: false
        },
        {
          id: '3',
          type: 'update_record',
          name: 'Update Customer',
          config: {
            table: 'customers',
            field: 'last_order_status',
            value: 'production_complete'
          },
          required: false
        }
      ],
      popularity: 87
    },
    {
      id: 'payment-received-workflow',
      name: 'Payment Received Workflow',
      description: 'Process payments and update records',
      category: 'Finance',
      icon: '💰',
      trigger: {
        type: 'payment_received',
        config: {}
      },
      actions: [
        {
          id: '1',
          type: 'update_record',
          name: 'Update Order Status',
          config: {
            table: 'orders',
            field: 'payment_status',
            value: 'paid'
          },
          required: true
        },
        {
          id: '2',
          type: 'send_email',
          name: 'Send Payment Receipt',
          config: {
            to: '{{customer.email}}',
            template: 'payment_receipt',
            subject: 'Payment Receipt - {{order.number}}',
            data: {
              amount: '{{payment.amount}}',
              order_number: '{{order.number}}'
            }
          },
          required: false
        },
        {
          id: '3',
          type: 'notify_slack',
          name: 'Notify Accounting',
          config: {
            channel: '#accounting',
            message: '💸 Payment received for order {{order.number}} - ${{payment.amount}}'
          },
          required: false
        }
      ],
      popularity: 82
    },
    {
      id: 'customer-followup-workflow',
      name: 'Customer Follow-up Workflow',
      description: 'Follow up with customers after delivery',
      category: 'Customer Service',
      icon: '🔄',
      trigger: {
        type: 'schedule',
        config: {
          days_after_delivery: 30
        }
      },
      actions: [
        {
          id: '1',
          type: 'send_email',
          name: 'Send Satisfaction Survey',
          config: {
            to: '{{customer.email}}',
            template: 'satisfaction_survey',
            subject: 'How was your experience with {{order.items}}?',
            data: {
              order_number: '{{order.number}}',
              delivery_date: '{{order.delivered_at}}'
            }
          },
          required: true
        },
        {
          id: '2',
          type: 'create_task',
          name: 'Account Manager Follow-up',
          config: {
            title: 'Follow up with {{customer.name}}',
            description: 'Check customer satisfaction and identify upsell opportunities',
            assignee: '{{customer.account_manager}}',
            due_date: '{{date.add(7, "days")}}',
            priority: 'low'
          },
          required: false
        }
      ],
      popularity: 76
    },
    {
      id: 'at-risk-customer-workflow',
      name: 'At-Risk Customer Workflow',
      description: 'Proactive outreach for at-risk customers',
      category: 'Sales & Marketing',
      icon: '⚠️',
      trigger: {
        type: 'customer_risk_score_change',
        config: {
          threshold: 80
        }
      },
      conditions: {
        field: 'customer.risk_score',
        operator: '>',
        value: 80
      },
      actions: [
        {
          id: '1',
          type: 'notify_slack',
          name: 'Alert Sales Team',
          config: {
            channel: '#sales',
            message: '🚨 Customer {{customer.name}} is at risk of churn (Risk Score: {{customer.risk_score}})'
          },
          required: true
        },
        {
          id: '2',
          type: 'create_task',
          name: 'Create Retention Task',
          config: {
            title: 'Urgent: Retain {{customer.name}}',
            description: 'Customer at high risk of churn - immediate action required',
            assignee: '{{customer.account_manager}}',
            due_date: '{{date.add(1, "days")}}',
            priority: 'urgent'
          },
          required: true
        },
        {
          id: '3',
          type: 'send_email',
          name: 'Send Retention Offer',
          config: {
            to: '{{customer.email}}',
            template: 'retention_offer',
            subject: 'Special offer for valued customer',
            data: {
              customer_name: '{{customer.name}}',
              discount_code: 'SAVE15'
            }
          },
          required: false
        }
      ],
      popularity: 69
    },
    {
      id: 'vip-customer-workflow',
      name: 'VIP Customer Treatment',
      description: 'Special handling for VIP customers',
      category: 'Customer Service',
      icon: '⭐',
      trigger: {
        type: 'order_created',
        config: {}
      },
      conditions: {
        field: 'customer.segment',
        operator: '=',
        value: 'VIP'
      },
      actions: [
        {
          id: '1',
          type: 'create_task',
          name: 'VIP Order Processing',
          config: {
            title: 'VIP Order - Priority Processing',
            description: 'VIP customer order requires priority handling',
            assignee: 'senior_account_manager',
            due_date: '{{date.add(1, "days")}}',
            priority: 'urgent'
          },
          required: true
        },
        {
          id: '2',
          type: 'send_sms',
          name: 'VIP Notification',
          config: {
            to: '{{customer.phone}}',
            message: 'Thank you for your VIP order! Your order is being prioritized and you\'ll receive updates soon.'
          },
          required: false
        },
        {
          id: '3',
          type: 'notify_slack',
          name: 'Notify VIP Team',
          config: {
            channel: '#vip-customers',
            message: '👑 VIP customer {{customer.name}} placed order {{order.number}} - ${{order.total}}'
          },
          required: false
        }
      ],
      popularity: 73
    }
  ]
}