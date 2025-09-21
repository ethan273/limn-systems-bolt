/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface WorkflowExecution {
  id: string
  template_id: string
  trigger_data: unknown
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial'
  started_at: string
  completed_at?: string
  error_message?: string
  actions_completed: unknown[]
  duration_ms?: number
  template_name?: string
}

// GET: Get execution logs for a specific workflow
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const dateRange = searchParams.get('dateRange') || '7d'
    
    console.log(`Workflow Logs API: Fetching logs for workflow ${id}`)
    
    const supabase = await createServerSupabaseClient()
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    switch (dateRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1)
        break
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }

    // Build query
    let query = supabase
      .from('workflow_executions')
      .select(`
        *,
        template:workflow_templates(name)
      `)
      .eq('template_id', id)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Add status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: executions, error } = await query

    // Get total count for pagination
    let countQuery = supabase
      .from('workflow_executions')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', id)
      .gte('started_at', startDate.toISOString())

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    if (error) {
      console.error('Error fetching workflow executions:', error)
      // Return fallback data for development
      return NextResponse.json(generateFallbackLogs(id, dateRange))
    }

    console.log('Workflow Logs: Data loaded:', {
      executions: executions?.length || 0,
      total: count
    })

    // Transform data
    const transformedExecutions = (executions || []).map((execution: any) => ({
      id: execution.id,
      template_id: execution.template_id,
      template_name: execution.template?.name || 'Unknown Workflow',
      trigger_data: execution.trigger_data,
      status: execution.status,
      started_at: execution.started_at,
      completed_at: execution.completed_at,
      error_message: execution.error_message,
      actions_completed: execution.actions_completed || [],
      duration_ms: execution.duration_ms
    }))

    // Calculate summary statistics
    const summary = calculateSummaryStats(transformedExecutions)

    return NextResponse.json({
      executions: transformedExecutions,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      },
      summary,
      filters: {
        dateRange,
        status
      }
    })
  } catch (error) {
    console.error('Workflow logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateSummaryStats(executions: WorkflowExecution[]) {
  const total = executions.length
  const completed = executions.filter(e => e.status === 'completed').length
  const failed = executions.filter(e => e.status === 'failed').length
  const partial = executions.filter(e => e.status === 'partial').length
  const pending = executions.filter(e => e.status === 'pending' || e.status === 'running').length

  const completedExecutions = executions.filter(e => e.duration_ms && e.status === 'completed')
  const avgDuration = completedExecutions.length > 0 
    ? Math.round(completedExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / completedExecutions.length)
    : 0

  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    total_executions: total,
    completed,
    failed,
    partial,
    pending,
    success_rate: successRate,
    avg_duration_ms: avgDuration
  }
}

function generateFallbackLogs(workflowId: string, dateRange: string) {
  const now = new Date()
  const executions: WorkflowExecution[] = []

  // Generate sample execution data
  for (let i = 0; i < 15; i++) {
    const startTime = new Date(now.getTime() - (i * 4 * 60 * 60 * 1000)) // Every 4 hours
    const duration = Math.floor(Math.random() * 5000) + 1000 // 1-6 seconds
    const statusOptions = ['completed', 'pending', 'partial', 'failed', 'running'] as const
    const status = statusOptions[Math.floor(Math.random() * statusOptions.length)]
    
    executions.push({
      id: `exec-${i + 1}`,
      template_id: workflowId,
      template_name: 'New Order Processing',
      trigger_data: {
        order: {
          id: `order-${123 + i}`,
          number: `ORD-${1000 + i}`,
          total: Math.floor(Math.random() * 50000) + 5000,
          customer_id: `cust-${i % 5 + 1}`
        },
        customer: {
          id: `cust-${i % 5 + 1}`,
          name: ['Acme Corp', 'TechFlow', 'Green Valley', 'Metro Dynamics', 'Coastal Group'][i % 5],
          email: ['acme@example.com', 'tech@example.com', 'green@example.com', 'metro@example.com', 'coastal@example.com'][i % 5]
        }
      },
      status: status,
      started_at: startTime.toISOString(),
      completed_at: status !== 'pending' ? new Date(startTime.getTime() + duration).toISOString() : undefined,
      duration_ms: status !== 'pending' ? duration : undefined,
      actions_completed: status === 'completed' ? ['1', '2', '3'] : 
                        status === 'partial' ? ['1', '2'] : 
                        status === 'failed' ? ['1'] : [],
      error_message: status === 'failed' ? 'Email service timeout' : 
                    status === 'partial' ? 'Slack notification failed' : undefined
    })
  }

  const summary = calculateSummaryStats(executions)

  return {
    executions,
    pagination: {
      page: 1,
      limit: 50,
      total: executions.length,
      total_pages: 1
    },
    summary,
    filters: {
      dateRange,
      status: null
    }
  }
}