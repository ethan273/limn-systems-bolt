/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface WorkflowAction {
  id: string
  name: string
  type: string
  required?: boolean
  config: Record<string, unknown>
}

interface WorkflowTemplate {
  id: string
  name: string
  enabled: boolean
  conditions?: {
    field?: string
    operator?: string
    value?: unknown
  }
  actions?: WorkflowAction[]
}

interface ActionResult {
  success: boolean
  error?: string
  result?: unknown
}

interface WorkflowContext extends Record<string, unknown> {
  date: {
    now: string
    today: string
    tomorrow: string
    add: (days: number, unit: string) => string
  }
  current_user: {
    name: string
    department: string
  }
}

export interface ExecuteRequest {
  workflow_id: string
  trigger_data: Record<string, unknown>
  test_mode?: boolean // Dry run without side effects
}

export interface ExecuteResponse {
  execution_id: string
  status: 'completed' | 'failed' | 'partial'
  actions_completed: string[]
  errors?: string[]
  duration_ms: number
  test_mode?: boolean
}

// POST: Manually execute a workflow
export async function POST(request: Request) {
  try {
    const body: ExecuteRequest = await request.json()
    console.log('Workflow Execute API: Executing workflow:', body.workflow_id, 'Test mode:', body.test_mode)
    
    const supabase = await createServerSupabaseClient()
    
    // Get workflow template
    const { data: workflow, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', body.workflow_id)
      .single()

    if (error || !workflow) {
      console.error('Error fetching workflow:', error)
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (!workflow.enabled) {
      return NextResponse.json({ error: 'Workflow is disabled' }, { status: 400 })
    }

    const startTime = Date.now()

    // Create execution record (even for test mode)
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert({
        template_id: workflow.id,
        trigger_data: body.trigger_data,
        status: 'running'
      })
      .select()
      .single()

    if (executionError) {
      console.error('Error creating execution record:', executionError)
      return NextResponse.json({ error: 'Failed to start execution' }, { status: 500 })
    }

    try {
      // Execute the workflow
      const result = await executeWorkflow(workflow, body.trigger_data, body.test_mode || false)
      const duration = Date.now() - startTime

      // Update execution record
      await supabase
        .from('workflow_executions')
        .update({
          status: result.status,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          actions_completed: result.actions_completed,
          error_message: result.errors?.join('; ')
        })
        .eq('id', execution.id)

      return NextResponse.json({
        execution_id: execution.id,
        status: result.status,
        actions_completed: result.actions_completed,
        errors: result.errors,
        duration_ms: duration,
        test_mode: body.test_mode
      })
    } catch (error) {
      console.error('Workflow execution error:', error)
      
      // Update execution record with failure
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', execution.id)

      return NextResponse.json({
        execution_id: execution.id,
        status: 'failed' as const,
        actions_completed: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration_ms: Date.now() - startTime,
        test_mode: body.test_mode
      })
    }
  } catch (error) {
    console.error('Execute workflow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function executeWorkflow(workflow: WorkflowTemplate, triggerData: Record<string, unknown>, testMode: boolean = false): Promise<{
  status: 'completed' | 'failed' | 'partial'
  actions_completed: string[]
  errors?: string[]
}> {
  console.log('Executing workflow:', workflow.name, 'Test mode:', testMode)
  
  // Evaluate conditions first
  if (workflow.conditions && !evaluateConditions(workflow.conditions, triggerData)) {
    console.log('Workflow conditions not met')
    return {
      status: 'completed',
      actions_completed: [],
      errors: ['Conditions not met']
    }
  }

  const actionsCompleted: string[] = []
  const errors: string[] = []
  
  // Execute each action
  for (const action of workflow.actions || []) {
    try {
      const context = buildContext(triggerData)
      const result = await executeAction(action, context, testMode)
      
      if (result.success) {
        actionsCompleted.push(action.id)
        console.log(`Action ${action.name} completed successfully`)
      } else {
        errors.push(`Action ${action.name} failed: ${result.error}`)
        console.log(`Action ${action.name} failed:`, result.error)
        
        // If action is required and fails, stop execution
        if (action.required) {
          return {
            status: 'failed',
            actions_completed: actionsCompleted,
            errors
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Action ${action.name} error: ${errorMessage}`)
      console.error(`Action ${action.name} error:`, error)
      
      if (action.required) {
        return {
          status: 'failed',
          actions_completed: actionsCompleted,
          errors
        }
      }
    }
  }

  // Determine final status
  const status = errors.length > 0 ? 'partial' : 'completed'
  
  return {
    status,
    actions_completed: actionsCompleted,
    errors: errors.length > 0 ? errors : undefined
  }
}

function evaluateConditions(conditions: WorkflowTemplate['conditions'], triggerData: Record<string, unknown>): boolean {
  // Simple condition evaluation - can be expanded
  if (!conditions?.field) return true
  
  const fieldValue = getNestedValue(triggerData, conditions.field)
  
  switch (conditions.operator) {
    case '=':
      return fieldValue == conditions.value
    case '!=':
      return fieldValue != conditions.value
    case '>':
      return Number(fieldValue) > Number(conditions.value)
    case '<':
      return Number(fieldValue) < Number(conditions.value)
    case '>=':
      return Number(fieldValue) >= Number(conditions.value)
    case '<=':
      return Number(fieldValue) <= Number(conditions.value)
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(conditions.value).toLowerCase())
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(conditions.value).toLowerCase())
    default:
      return true
  }
}

function buildContext(triggerData: Record<string, unknown>): WorkflowContext {
  return {
    ...triggerData,
    date: {
      now: new Date().toISOString(),
      today: new Date().toISOString().split('T')[0],
      tomorrow: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      add: (days: number, unit: string) => {
        const date = new Date()
        if (unit === 'days') {
          date.setDate(date.getDate() + days)
        }
        return date.toISOString()
      }
    },
    current_user: {
      name: 'System User',
      department: 'Automation'
    }
  }
}

async function executeAction(action: WorkflowAction, context: WorkflowContext, testMode: boolean): Promise<ActionResult> {
  console.log(`Executing action: ${action.name} (Type: ${action.type})`, testMode ? '[TEST MODE]' : '')
  
  if (testMode) {
    // In test mode, simulate actions without side effects
    return {
      success: true,
      result: `Test execution of ${action.name}`
    }
  }

  try {
    switch (action.type) {
      case 'create_task':
        return await executeCreateTask(action.config, context)
      
      case 'send_email':
        return await executeSendEmail(action.config, context)
      
      case 'notify_slack':
        return await executeNotifySlack(action.config, context)
      
      case 'update_record':
        return await executeUpdateRecord(action.config, context)
      
      case 'send_sms':
        return await executeSendSms(action.config, context)
      
      case 'create_record':
        return await executeCreateRecord(action.config, context)
      
      default:
        return {
          success: false,
          error: `Unknown action type: ${action.type}`
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Action executors (simplified implementations)
async function executeCreateTask(config: Record<string, unknown>, context: WorkflowContext): Promise<ActionResult> {
  console.log('Creating task:', replaceVariables(String(config.title || ''), context))
  return { success: true, result: 'Task created' }
}

async function executeSendEmail(config: Record<string, unknown>, context: WorkflowContext): Promise<ActionResult> {
  console.log('Sending email to:', replaceVariables(String(config.to || ''), context))
  return { success: true, result: 'Email sent' }
}

async function executeNotifySlack(config: Record<string, unknown>, context: WorkflowContext): Promise<ActionResult> {
  console.log('Sending Slack notification:', replaceVariables(String(config.message || ''), context))
  return { success: true, result: 'Slack notification sent' }
}

async function executeUpdateRecord(config: Record<string, unknown>, context: WorkflowContext): Promise<ActionResult> {
  console.log('Updating record in table:', config.table)
  return { success: true, result: 'Record updated' }
}

async function executeSendSms(config: Record<string, unknown>, context: WorkflowContext): Promise<ActionResult> {
  console.log('Sending SMS to:', replaceVariables(String(config.to || ''), context))
  return { success: true, result: 'SMS sent' }
}

async function executeCreateRecord(config: Record<string, unknown>, context: WorkflowContext): Promise<ActionResult> {
  console.log('Creating record in table:', config.table)
  return { success: true, result: 'Record created' }
}

function replaceVariables(template: string, context: WorkflowContext): string {
  if (!template) return ''
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim())
    return value !== undefined ? String(value) : match
  })
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    return current && typeof current === 'object' && key in current 
      ? (current as Record<string, unknown>)[key] 
      : undefined
  }, obj)
}