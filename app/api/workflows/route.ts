/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface WorkflowAction {
  id: string
  type: 'create_task' | 'send_email' | 'notify_slack' | 'update_record' | 'send_sms' | 'create_record'
  name: string
  config: Record<string, unknown>
  required: boolean
}

export interface WorkflowCondition {
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains'
  value: unknown
  logic?: 'AND' | 'OR'
}

export interface Workflow {
  id: string
  name: string
  description: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  actions: WorkflowAction[]
  conditions: WorkflowCondition[]
  enabled: boolean
  created_by?: string
  created_at: string
  updated_at: string
  statistics: {
    runs_today: number
    success_rate: number
    avg_duration_ms: number
    last_run?: string
    total_runs: number
  }
}

// GET: List all workflows
export async function GET() {
  try {
    console.log('Workflows API: Fetching workflows')
    
    const supabase = await createServerSupabaseClient()
    
    // Fetch workflow templates
    const { data: workflows, error } = await supabase
      .from('task_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching workflows:', error)
      // Continue with fallback data for development
    }

    console.log('Workflows API: Data loaded:', {
      workflows: workflows?.length || 0
    })

    // Calculate statistics for each workflow
    const workflowsWithStats = await Promise.all((workflows || []).map(async (workflow: any) => {
      const stats = await calculateWorkflowStatistics(supabase, workflow.id)
      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        trigger_type: workflow.trigger_type,
        trigger_config: workflow.trigger_config,
        actions: workflow.actions || [],
        conditions: workflow.conditions || {},
        enabled: workflow.enabled,
        created_by: workflow.created_by,
        created_at: workflow.created_at,
        updated_at: workflow.updated_at,
        statistics: stats
      }
    }))

    // Use fallback data if no workflows exist
    if (workflowsWithStats.length === 0) {
      console.log('Workflows API: Using fallback data for development')
      return NextResponse.json(generateFallbackWorkflows())
    }

    return NextResponse.json(workflowsWithStats)
  } catch (error) {
    console.error('Workflows API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create new workflow
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Workflows API: Creating workflow:', body.name)
    
    const supabase = await createServerSupabaseClient()
    
    const { data: workflow, error } = await supabase
      .from('task_templates')
      .insert({
        name: body.name,
        description: body.description,
        trigger_type: body.trigger_type,
        trigger_config: body.trigger_config || {},
        actions: body.actions || [],
        conditions: body.conditions || {},
        enabled: body.enabled ?? true,
        created_by: body.created_by
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating workflow:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Calculate initial statistics
    const stats = await calculateWorkflowStatistics(supabase, workflow.id)

    return NextResponse.json({
      ...workflow,
      statistics: stats
    })
  } catch (error) {
    console.error('Create workflow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update workflow
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    console.log('Workflows API: Updating workflow:', id)
    
    const supabase = await createServerSupabaseClient()
    
    const { data: workflow, error } = await supabase
      .from('task_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating workflow:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Calculate updated statistics
    const stats = await calculateWorkflowStatistics(supabase, workflow.id)

    return NextResponse.json({
      ...workflow,
      statistics: stats
    })
  } catch (error) {
    console.error('Update workflow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete workflow
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 })
    }
    
    console.log('Workflows API: Deleting workflow:', id)
    
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting workflow:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete workflow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function calculateWorkflowStatistics(supabase: any, workflowId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // Get executions for today
    const { data: todayExecutions } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('template_id', workflowId)
      .gte('created_at', today.toISOString())

    // Get all executions for success rate
    const { data: allExecutions } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('template_id', workflowId)
      .order('created_at', { ascending: false })
      .limit(100)

    const runsToday = todayExecutions?.length || 0
    const totalRuns = allExecutions?.length || 0
    const successfulRuns = allExecutions?.filter((e: Record<string, unknown>) => e.status === 'completed').length || 0
    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0
    
    const completedExecutions = allExecutions?.filter((e: Record<string, unknown>) => e.status === 'completed' && e.duration_ms) || []
    const avgDuration = completedExecutions.length > 0 
      ? Math.round(completedExecutions.reduce((sum: number, e: Record<string, unknown>) => sum + (Number(e.duration_ms) || 0), 0) / completedExecutions.length)
      : 0

    const lastRun = allExecutions && allExecutions.length > 0 ? allExecutions[0].created_at : undefined

    return {
      runs_today: runsToday,
      success_rate: successRate,
      avg_duration_ms: avgDuration,
      last_run: lastRun,
      total_runs: totalRuns
    }
  } catch (error) {
    console.error('Error calculating workflow statistics:', error)
    return {
      runs_today: 0,
      success_rate: 0,
      avg_duration_ms: 0,
      total_runs: 0
    }
  }
}

function generateFallbackWorkflows(): Workflow[] {
  return [
    {
      id: '1',
      name: 'New Order Processing',
      description: 'Automatically process new orders and create tasks',
      trigger_type: 'order_created',
      trigger_config: {},
      actions: [
        {
          id: '1',
          type: 'create_task',
          name: 'Create Order Processing Task',
          config: {
            title: 'Process Order {{order.number}}',
            assignee: '{{order.sales_rep}}',
            due_date: '{{date.add(2, "days")}}'
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
            data: { order_number: '{{order.number}}' }
          },
          required: false
        },
        {
          id: '3',
          type: 'notify_slack',
          name: 'Notify Team',
          config: {
            channel: '#orders',
            message: 'New order {{order.number}} from {{customer.name}}'
          },
          required: false
        }
      ],
      conditions: [],
      enabled: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      statistics: {
        runs_today: 12,
        success_rate: 98,
        avg_duration_ms: 2300,
        last_run: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        total_runs: 234
      }
    },
    {
      id: '2',
      name: 'VIP Customer Treatment',
      description: 'Special handling for VIP customers',
      trigger_type: 'order_created',
      trigger_config: {},
      actions: [
        {
          id: '1',
          type: 'create_task',
          name: 'Priority Processing',
          config: {
            title: 'VIP Order - Priority Processing',
            assignee: 'senior_account_manager',
            priority: 'high'
          },
          required: true
        },
        {
          id: '2',
          type: 'send_sms',
          name: 'VIP Notification',
          config: {
            to: '{{customer.phone}}',
            message: 'Your VIP order is being prioritized'
          },
          required: false
        }
      ],
      conditions: [{
        field: 'customer.segment',
        operator: '=',
        value: 'VIP'
      }],
      enabled: true,
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      statistics: {
        runs_today: 3,
        success_rate: 100,
        avg_duration_ms: 1800,
        last_run: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        total_runs: 45
      }
    },
    {
      id: '3',
      name: 'Production Delay Handler',
      description: 'Handle production delays automatically',
      trigger_type: 'production_delayed',
      trigger_config: {},
      actions: [
        {
          id: '1',
          type: 'update_record',
          name: 'Update Order Status',
          config: {
            table: 'orders',
            status: 'delayed',
            expected_date: '{{date.add(7, "days")}}'
          },
          required: true
        },
        {
          id: '2',
          type: 'send_email',
          name: 'Delay Notification',
          config: {
            to: '{{customer.email}}',
            template: 'delay_notification'
          },
          required: true
        },
        {
          id: '3',
          type: 'create_task',
          name: 'Follow Up Task',
          config: {
            title: 'Follow up on delayed order',
            assignee: 'customer_service',
            due_date: '{{date.tomorrow}}'
          },
          required: false
        }
      ],
      conditions: [],
      enabled: false,
      created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      statistics: {
        runs_today: 0,
        success_rate: 85,
        avg_duration_ms: 3200,
        last_run: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        total_runs: 28
      }
    }
  ]
}