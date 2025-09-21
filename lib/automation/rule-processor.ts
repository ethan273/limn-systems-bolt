// Automation Rule Processor
// Phase 2 Implementation
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SMSProviderService } from '@/lib/sms/provider-service'
import { QuickBooksPaymentProcessor } from '@/lib/quickbooks/payment-processor'
import { safeGet } from '@/lib/utils/bulk-type-fixes'

// Type definitions
interface AutomationRule {
  id: string
  tenant_id: string
  name: string
  trigger_event: string
  trigger_conditions: Record<string, unknown>
  actions: RuleAction[]
  is_active: boolean
  priority: number
  last_triggered_at?: string
  trigger_count: number
  created_at: string
  updated_at: string
}

interface RuleAction {
  type: 'send_sms' | 'send_email' | 'update_record' | 'create_task' | 'process_payment' | 'webhook'
  params: Record<string, unknown>
}

interface RuleCondition {
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in'
  value: unknown
}

interface ExecutionResult {
  success: boolean
  data?: unknown
  error?: string
}

interface TaskData {
  title: string
  description?: string
  assigned_to?: string
  priority?: string
  due_date?: string
  status: string
}


export class AutomationRuleProcessor {
  private supabase: SupabaseClient
  private smsService: SMSProviderService
  private paymentProcessor: QuickBooksPaymentProcessor

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
    this.smsService = new SMSProviderService()
    this.paymentProcessor = new QuickBooksPaymentProcessor()
  }

  /**
   * Process all active automation rules
   */
  async processRules(triggerEvent?: string, triggerData?: Record<string, unknown>) {
    // Get active rules
    let query = this.supabase
      .from('automation_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (triggerEvent) {
      query = query.eq('trigger_event', triggerEvent)
    }

    const { data: rules, error } = await query

    if (error) throw error

    for (const rule of rules) {
      await this.processRule(rule, triggerData)
    }
  }

  /**
   * Process individual rule
   */
  private async processRule(rule: AutomationRule, triggerData?: Record<string, unknown>) {
    try {
      // Check conditions
      const conditionsMet = await this.evaluateConditions(rule.trigger_conditions, triggerData || {})
      
      if (!conditionsMet) {
        return
      }

      // Execute actions
      const results = await this.executeActions(rule.actions, triggerData || {})

      // Log execution
      await this.logExecution(rule.id, triggerData || {}, results, 'success')

      // Update rule stats
      await this.supabase
        .from('automation_rules')
        .update({
          last_triggered_at: new Date(),
          trigger_count: rule.trigger_count + 1
        })
        .eq('id', rule.id)

    } catch (error) {
      await this.logExecution(rule.id, triggerData || {}, null, 'failed', error as Error)
      throw error
    }
  }

  /**
   * Evaluate rule conditions
   */
  private async evaluateConditions(conditions: Record<string, unknown>, data: Record<string, unknown>): Promise<boolean> {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true
    }

    for (const [field, condition] of Object.entries(conditions)) {
      const value = this.getNestedValue(data, field)
      
      if (!this.evaluateCondition(value, condition as RuleCondition | unknown)) {
        return false
      }
    }

    return true
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(value: unknown, condition: RuleCondition | unknown): boolean {
    if (typeof condition === 'object' && safeGet(condition, ['operator'])) {
      switch (safeGet(condition, ['operator'])) {
        case 'equals':
          return value === safeGet(condition, ['value'])
        case 'not_equals':
          return value !== safeGet(condition, ['value'])
        case 'greater_than':
          return Number(value) > Number(safeGet(condition, ['value']) || 0)
        case 'less_than':
          return Number(value) < Number(safeGet(condition, ['value']) || 0)
        case 'contains':
          return String(value).includes(String(safeGet(condition, ['value']) || ''))
        case 'in':
          return Array.isArray(safeGet(condition, ['value'])) && (safeGet(condition, ['value']) as Array<any>).includes(value)
        default:
          return false
      }
    }

    return value === condition
  }

  /**
   * Execute rule actions
   */
  private async executeActions(actions: RuleAction[], data: Record<string, unknown>): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []

    for (const action of actions) {
      const result = await this.executeAction(action, data)
      results.push(result)
    }

    return results
  }

  /**
   * Execute single action
   */
  private async executeAction(action: RuleAction, data: Record<string, unknown>): Promise<ExecutionResult> {
    switch (action.type) {
      case 'send_sms':
        return await this.executeSendSMS(action, data)
      
      case 'send_email':
        return await this.executeSendEmail(action, data)
      
      case 'update_record':
        return await this.executeUpdateRecord(action, data)
      
      case 'create_task':
        return await this.executeCreateTask(action, data)
      
      case 'process_payment':
        return await this.executeProcessPayment(action, data)
      
      case 'webhook':
        return await this.executeWebhook(action, data)
      
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  /**
   * Execute Send SMS action
   */
  private async executeSendSMS(action: RuleAction, data: Record<string, unknown>): Promise<ExecutionResult> {
    await this.smsService.initialize()
    
    const phone = String(this.resolveValue(action.params.phone, data))
    const message = String(this.resolveValue(action.params.message, data))
    
    const result = await this.smsService.sendSMS(phone, message)
    return { success: true, data: result }
  }

  /**
   * Execute Send Email action
   */
  private async executeSendEmail(action: RuleAction, data: Record<string, unknown>): Promise<ExecutionResult> {
    // Implementation would connect to email service
    const to = String(this.resolveValue(action.params.to, data))
    const subject = String(this.resolveValue(action.params.subject, data))
    const body = String(this.resolveValue(action.params.body, data))
    
    // Placeholder for email sending
    console.log(`Sending email to ${to}: ${subject} - ${body}`)
    
    return { success: true, data: { sent: true, to, subject } }
  }

  /**
   * Execute Update Record action
   */
  private async executeUpdateRecord(action: RuleAction, data: Record<string, unknown>): Promise<ExecutionResult> {
    const table = String(action.params.table)
    const recordId = String(this.resolveValue(action.params.record_id, data))
    const updates = this.resolveValues(action.params.updates, data) as Record<string, unknown>
    
    const { data: result, error } = await this.supabase
      .from(table)
      .update(updates)
      .eq('id', recordId)
      .select()
      .single()
    
    if (error) return { success: false, error: error.message }
    
    return { success: true, data: result }
  }

  /**
   * Execute Create Task action
   */
  private async executeCreateTask(action: RuleAction, data: Record<string, unknown>): Promise<ExecutionResult> {
    const task: TaskData = {
      title: String(this.resolveValue(action.params.title, data)),
      description: action.params.description ? String(this.resolveValue(action.params.description, data)) : undefined,
      assigned_to: action.params.assigned_to ? String(this.resolveValue(action.params.assigned_to, data)) : undefined,
      priority: String(action.params.priority || 'medium'),
      due_date: action.params.due_date ? String(this.resolveValue(action.params.due_date, data)) : undefined,
      status: 'pending'
    }
    
    const { data: result, error } = await this.supabase
      .from('tasks')
      .insert(task)
      .select()
      .single()
    
    if (error) return { success: false, error: error.message }
    
    return { success: true, data: result }
  }

  /**
   * Execute Process Payment action
   */
  private async executeProcessPayment(action: RuleAction, data: Record<string, unknown>): Promise<ExecutionResult> {
    const invoiceId = String(this.resolveValue(action.params.invoice_id, data))
    const amount = Number(this.resolveValue(action.params.amount, data))
    const methodId = String(this.resolveValue(action.params.method_id, data))
    
    return await this.paymentProcessor.processPayment(invoiceId, amount, methodId)
  }

  /**
   * Execute Webhook action
   */
  private async executeWebhook(action: RuleAction, data: Record<string, unknown>): Promise<ExecutionResult> {
    const url = String(action.params.url)
    const payload = this.resolveValues(action.params.payload, data)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    return {
      success: response.ok,
      data: {
        status: response.status,
        ok: response.ok
      }
    }
  }

  /**
   * Resolve value with data interpolation
   */
  private resolveValue(template: unknown, data: Record<string, unknown>): unknown {
    if (typeof template !== 'string') {
      return template
    }
    
    return template.replace(/{{([^}]+)}}/g, (match, path) => {
      return String(this.getNestedValue(data, path) || match)
    })
  }

  /**
   * Resolve multiple values
   */
  private resolveValues(obj: unknown, data: Record<string, unknown>): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return this.resolveValue(obj, data)
    }
    
    const result: Record<string, unknown> | unknown[] = Array.isArray(obj) ? [] : {}
    
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(result)) {
        result.push(this.resolveValues(value, data))
      } else {
        (result as Record<string, unknown>)[key] = this.resolveValues(value, data)
      }
    }
    
    return result
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, part: string) => {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        return (current as Record<string, unknown>)[part]
      }
      return undefined
    }, obj)
  }

  /**
   * Log rule execution
   */
  private async logExecution(
    ruleId: string,
    triggerData: Record<string, unknown> | null,
    results: ExecutionResult[] | null,
    status: string,
    error?: Error
  ) {
    await this.supabase
      .from('automation_logs')
      .insert({
        rule_id: ruleId,
        trigger_data: triggerData,
        actions_executed: results,
        status,
        error_message: error?.message,
        execution_time_ms: 0 // Would calculate actual time
      })
  }
}