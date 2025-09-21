/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/service'
import { realTimeService } from './real-time'

export interface AuditEvent {
  id: string
  tenant_id: string
  user_id?: string
  action: string
  entity_type: string
  entity_id?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  session_id?: string
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical'
  category?: string
  tags?: string[]
  occurred_at: string
  metadata?: Record<string, unknown>
}

export interface RetentionPolicy {
  id: string
  tenant_id: string
  name: string
  entity_type: string
  retention_days: number
  action: 'archive' | 'delete' | 'anonymize'
  is_active: boolean
  last_run?: string
  created_at: string
  updated_at: string
}

export interface ComplianceReport {
  id: string
  tenant_id: string
  report_type: string
  period_start: string
  period_end: string
  status: 'generating' | 'completed' | 'failed'
  data: Record<string, unknown>
  generated_by: string
  generated_at: string
  expires_at?: string
}

export interface DataExportRequest {
  id: string
  tenant_id: string
  user_id: string
  data_types: string[]
  purpose: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  download_url?: string
  expires_at?: string
  requested_at: string
  completed_at?: string
}

class AuditComplianceService {
  private supabase = createClient()

  // Audit Logging
  async logAuditEvent(event: Omit<AuditEvent, 'id' | 'occurred_at'>): Promise<AuditEvent> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      occurred_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('audit_logs')
      .insert([auditEvent])
      .select()
      .single()

    if (error) {
      console.error('Failed to log audit event:', error)
      throw new Error('Failed to log audit event')
    }

    // Send real-time notification for critical events
    if (event.severity === 'critical') {
      await realTimeService.broadcastToTenant(
        event.tenant_id,
        'critical_audit_event',
        data
      )
    }

    return data
  }

  // Batch audit logging for high-volume operations
  async logBatchAuditEvents(events: Array<Omit<AuditEvent, 'id' | 'occurred_at'>>): Promise<void> {
    const auditEvents = events.map(event => ({
      ...event,
      id: this.generateId(),
      occurred_at: new Date().toISOString()
    }))

    const { error } = await this.supabase
      .from('audit_logs')
      .insert(auditEvents)

    if (error) {
      console.error('Failed to log batch audit events:', error)
      throw new Error('Failed to log batch audit events')
    }
  }

  // Auto-audit decorator for database operations
  withAudit<T extends unknown[], R>(
    action: string,
    entityType: string,
    operation: (...args: T) => Promise<R>
  ) {
    return async (...args: T): Promise<R> => {
      const startTime = Date.now()
      let result: R
      let error: Error | null = null

      try {
        result = await operation(...args)
        return result
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err))
        throw err
      } finally {
        // Log audit event
        await this.logAuditEvent({
          tenant_id: this.getTenantIdFromArgs(args),
          user_id: this.getUserIdFromContext(),
          action,
          entity_type: entityType,
          entity_id: this.getEntityIdFromArgs(args),
          severity: error ? 'error' : 'info',
          metadata: {
            duration_ms: Date.now() - startTime,
            error: error?.message,
            args_count: args.length
          }
        })
      }
    }
  }

  // Query audit logs
  async getAuditLogs(
    tenantId: string,
    filters?: {
      user_id?: string
      action?: string
      entity_type?: string
      entity_id?: string
      severity?: string[]
      date_range?: { start: string; end: string }
      limit?: number
      offset?: number
    }
  ): Promise<AuditEvent[]> {
    let query = this.supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)

    if (filters) {
      if (filters.user_id) query = query.eq('user_id', filters.user_id)
      if (filters.action) query = query.eq('action', filters.action)
      if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
      if (filters.entity_id) query = query.eq('entity_id', filters.entity_id)
      if (filters.severity) query = query.in('severity', filters.severity)
      if (filters.date_range) {
        query = query
          .gte('occurred_at', filters.date_range.start)
          .lte('occurred_at', filters.date_range.end)
      }
      if (filters.limit) query = query.limit(filters.limit)
      if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query.order('occurred_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch audit logs:', error)
      throw new Error('Failed to fetch audit logs')
    }

    return data || []
  }

  // GDPR Right to be Forgotten
  async requestDataDeletion(
    tenantId: string,
    userId: string,
    purpose: string
  ): Promise<DataExportRequest> {
    // First, create a data export for the user
    const exportRequest = await this.requestDataExport(tenantId, userId, ['all'], purpose)

    // Log the deletion request
    await this.logAuditEvent({
      tenant_id: tenantId,
      user_id: userId,
      action: 'data_deletion_requested',
      entity_type: 'user',
      entity_id: userId,
      severity: 'info',
      category: 'compliance',
      metadata: {
        purpose,
        export_request_id: exportRequest.id
      }
    })

    // In a real implementation, this would trigger a workflow
    // to anonymize or delete the user's data across all systems
    
    return exportRequest
  }

  // Data Export (GDPR Right to Data Portability)
  async requestDataExport(
    tenantId: string,
    userId: string,
    dataTypes: string[],
    purpose: string
  ): Promise<DataExportRequest> {
    const exportRequest: Omit<DataExportRequest, 'id'> = {
      tenant_id: tenantId,
      user_id: userId,
      data_types: dataTypes,
      purpose,
      status: 'pending',
      requested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }

    const { data, error } = await this.supabase
      .from('data_export_requests')
      .insert([{ ...exportRequest, id: this.generateId() }])
      .select()
      .single()

    if (error) {
      console.error('Failed to create data export request:', error)
      throw new Error('Failed to create data export request')
    }

    // Log the export request
    await this.logAuditEvent({
      tenant_id: tenantId,
      user_id: userId,
      action: 'data_export_requested',
      entity_type: 'user',
      entity_id: userId,
      severity: 'info',
      category: 'compliance',
      metadata: {
        data_types: dataTypes,
        purpose,
        request_id: data.id
      }
    })

    // Trigger background job to process the export
    this.processDataExport(data.id)

    return data
  }

  // Process data export in background
  private async processDataExport(requestId: string): Promise<void> {
    try {
      // Update status to processing
      await this.supabase
        .from('data_export_requests')
        .update({ status: 'processing' })
        .eq('id', requestId)

      // Get the request details
      const { data: request } = await this.supabase
        .from('data_export_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (!request) return

      // Collect all user data
      const userData = await this.collectUserData(request.tenant_id, request.user_id, request.data_types)

      // Generate export file (JSON format)
      const exportData = {
        user_id: request.user_id,
        tenant_id: request.tenant_id,
        export_timestamp: new Date().toISOString(),
        data_types: request.data_types,
        data: userData
      }

      // In a real implementation, you would:
      // 1. Upload the file to secure storage (S3, etc.)
      // 2. Generate a signed URL for download
      // 3. Send notification to user

      const downloadUrl = await this.uploadExportFile(exportData, requestId)

      // Update request with completion
      await this.supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          download_url: downloadUrl,
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      // Log completion
      await this.logAuditEvent({
        tenant_id: request.tenant_id,
        user_id: request.user_id,
        action: 'data_export_completed',
        entity_type: 'user',
        entity_id: request.user_id,
        severity: 'info',
        category: 'compliance',
        metadata: {
          request_id: requestId,
          data_size_bytes: JSON.stringify(exportData).length
        }
      })

    } catch (error) {
      console.error('Data export processing failed:', error)
      
      // Update status to failed
      await this.supabase
        .from('data_export_requests')
        .update({ status: 'failed' })
        .eq('id', requestId)
    }
  }

  // Collect all user data for export
  private async collectUserData(
    tenantId: string,
    userId: string,
    dataTypes: string[]
  ): Promise<Record<string, unknown>> {
    const userData: Record<string, unknown> = {}

    // Define data collection queries for each type
    const dataQueries = {
      profile: () => this.supabase
        .from('users')
        .select('*')
        .eq('id', userId),
      
      orders: () => this.supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('created_by', userId),
      
      audit_logs: () => this.supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId),
      
      notifications: () => this.supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('recipient_id', userId),
      
      all: async () => {
        // Collect all available data types
        const results: Record<string, unknown> = {}
        for (const type of Object.keys(dataQueries)) {
          if (type !== 'all') {
            const { data } = await dataQueries[type as keyof typeof dataQueries]()
            results[type] = data || []
          }
        }
        return { data: results }
      }
    }

    // Collect requested data
    for (const dataType of dataTypes) {
      if (dataQueries[dataType as keyof typeof dataQueries]) {
        const { data } = await dataQueries[dataType as keyof typeof dataQueries]()
        userData[dataType] = data || []
      }
    }

    return userData
  }

  // Retention Policy Management
  async createRetentionPolicy(
    tenantId: string,
    policy: Omit<RetentionPolicy, 'id' | 'created_at' | 'updated_at'>
  ): Promise<RetentionPolicy> {
    const { data, error } = await this.supabase
      .from('retention_policies')
      .insert([{
        ...policy,
        tenant_id: tenantId,
        id: this.generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Failed to create retention policy:', error)
      throw new Error('Failed to create retention policy')
    }

    // Log policy creation
    await this.logAuditEvent({
      tenant_id: tenantId,
      action: 'retention_policy_created',
      entity_type: 'retention_policy',
      entity_id: data.id,
      severity: 'info',
      category: 'compliance',
      new_values: data
    })

    return data
  }

  // Run retention policies
  async runRetentionPolicies(tenantId: string): Promise<void> {
    const { data: policies } = await this.supabase
      .from('retention_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (!policies) return

    for (const policy of policies) {
      try {
        await this.applyRetentionPolicy(policy)
      } catch (error) {
        console.error(`Failed to apply retention policy ${policy.id}:`, error)
        
        // Log failure
        await this.logAuditEvent({
          tenant_id: tenantId,
          action: 'retention_policy_failed',
          entity_type: 'retention_policy',
          entity_id: policy.id,
          severity: 'error',
          category: 'compliance',
          metadata: { error: error instanceof Error ? error.message : String(error) }
        })
      }
    }
  }

  private async applyRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    const cutoffDate = new Date(Date.now() - policy.retention_days * 24 * 60 * 60 * 1000)
    
    const query = this.supabase
      .from(policy.entity_type)
      .select('id')
      .eq('tenant_id', policy.tenant_id)
      .lt('created_at', cutoffDate.toISOString())

    const { data: itemsToProcess } = await query

    if (!itemsToProcess || itemsToProcess.length === 0) {
      return
    }

    const itemIds = itemsToProcess.map(item => item.id)
    let processedCount = 0

    switch (policy.action) {
      case 'delete':
        const { error: deleteError } = await this.supabase
          .from(policy.entity_type)
          .delete()
          .in('id', itemIds)
        
        if (!deleteError) processedCount = itemIds.length
        break

      case 'archive':
        const { error: archiveError } = await this.supabase
          .from(policy.entity_type)
          .update({ archived: true, archived_at: new Date().toISOString() })
          .in('id', itemIds)
        
        if (!archiveError) processedCount = itemIds.length
        break

      case 'anonymize':
        // Implement anonymization logic based on entity type
        processedCount = await this.anonymizeData(policy.entity_type, itemIds)
        break
    }

    // Update policy last run
    await this.supabase
      .from('retention_policies')
      .update({ last_run: new Date().toISOString() })
      .eq('id', policy.id)

    // Log policy execution
    await this.logAuditEvent({
      tenant_id: policy.tenant_id,
      action: 'retention_policy_executed',
      entity_type: 'retention_policy',
      entity_id: policy.id,
      severity: 'info',
      category: 'compliance',
      metadata: {
        processed_count: processedCount,
        policy_action: policy.action,
        cutoff_date: cutoffDate.toISOString()
      }
    })
  }

  // Compliance Reporting
  async generateComplianceReport(
    tenantId: string,
    reportType: string,
    periodStart: string,
    periodEnd: string,
    generatedBy: string
  ): Promise<ComplianceReport> {
    const report: Omit<ComplianceReport, 'id'> = {
      tenant_id: tenantId,
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'generating',
      data: {},
      generated_by: generatedBy,
      generated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('compliance_reports')
      .insert([{ ...report, id: this.generateId() }])
      .select()
      .single()

    if (error) {
      console.error('Failed to create compliance report:', error)
      throw new Error('Failed to create compliance report')
    }

    // Process report in background
    this.processComplianceReport(data.id)

    return data
  }

  // Helper methods
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private getTenantIdFromArgs(args: unknown[]): string {
    // Extract tenant ID from common argument patterns
    return (args[0] as any)?.tenant_id || args[0] || 'unknown'
  }

  private getUserIdFromContext(): string | undefined {
    // In a real implementation, extract from request context
    return undefined
  }

  private getEntityIdFromArgs(args: unknown[]): string | undefined {
    // Extract entity ID from common argument patterns
    return (args[1] as any)?.id || args[1] || undefined
  }

  private async uploadExportFile(data: unknown, requestId: string): Promise<string> {
    // Mock implementation - in real app, upload to secure storage
    return `https://secure-storage.example.com/exports/${requestId}.json`
  }

  private async anonymizeData(entityType: string, ids: string[]): Promise<number> {
    // Mock implementation - implement per entity type
    return ids.length
  }

  private async processComplianceReport(reportId: string): Promise<void> {
    // Mock implementation - generate actual compliance reports
    await this.supabase
      .from('compliance_reports')
      .update({
        status: 'completed',
        data: { summary: 'Report generated successfully' }
      })
      .eq('id', reportId)
  }
}

// Singleton instance
export const auditComplianceService = new AuditComplianceService()

// Audit middleware for API routes
export function withAudit(action: string, entityType: string) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (...args: unknown[]) {
      return await auditComplianceService.withAudit(action, entityType, method.bind(this))(...args)
    }
  }
}

// Usage example:
// @withAudit('create_order', 'order')
// async createOrder(data: any) { ... }