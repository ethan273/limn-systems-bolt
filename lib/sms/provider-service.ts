/* eslint-disable @typescript-eslint/no-explicit-any */
// SMS Provider Service with Failover
// Phase 2 Implementation

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import twilio from 'twilio'

export class SMSProviderService {
  private supabase: SupabaseClient
  private providers: Map<string, { type: string; client: unknown; config: Record<string, unknown> }> = new Map()
  private activeProvider: string | null = null

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
  }

  /**
   * Initialize SMS providers
   */
  async initialize() {
    const { data: providers, error } = await this.supabase
      .from('sms_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order')

    if (error) throw error

    for (const provider of providers) {
      await this.initializeProvider(provider)
    }

    // Set primary provider
    const primary = providers.find(p => p.is_primary)
    this.activeProvider = primary ? primary.id : providers[0]?.id
  }

  /**
   * Initialize specific provider
   */
  private async initializeProvider(provider: Record<string, unknown>) {
    switch (provider.provider_type) {
      case 'twilio':
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID!,
          process.env.TWILIO_AUTH_TOKEN!
        )
        this.providers.set((provider as any).id, {
          type: 'twilio',
          client: twilioClient,
          config: provider
        })
        break
      
      case 'messagebird':
        // MessageBird initialization
        // const messageBird = messagebird(process.env.MESSAGEBIRD_KEY!)
        // this.providers.set(provider.id, { type: 'messagebird', client: messageBird, config: provider })
        break
        
      // Add other providers as needed
    }
  }

  /**
   * Send SMS with automatic failover
   */
  async sendSMS(to: string, message: string, campaignId?: string): Promise<unknown> {
    // Check opt-out status
    const isOptedOut = await this.checkOptOutStatus(to)
    if (isOptedOut) {
      throw new Error('Recipient has opted out of SMS communications')
    }

    // Create SMS log entry
    const { data: smsLog, error: logError } = await this.supabase
      .from('sms_logs')
      .insert({
        recipient_phone: to,
        message,
        campaign_id: campaignId,
        status: 'pending'
      })
      .select()
      .single()

    if (logError) throw logError

    // Get ordered list of providers
    const providerIds = Array.from(this.providers.keys())
    let lastError: unknown = null

    // Try each provider until one succeeds
    for (const providerId of providerIds) {
      try {
        const result = await this.sendWithProvider(providerId, to, message, smsLog.id)
        
        // Update SMS log with success
        await this.updateSMSLog(smsLog.id, 'sent', providerId, result)
        
        // Update provider stats
        await this.updateProviderStats(providerId, true)
        
        return result
      } catch (error) {
        console.error(`Provider ${providerId} failed:`, error)
        lastError = error
        
        // Log delivery failure
        await this.logDeliveryAttempt(smsLog.id, providerId, 'failed', error)
        
        // Update provider stats
        await this.updateProviderStats(providerId, false)
        
        // Continue to next provider
      }
    }

    // All providers failed
    await this.updateSMSLog(smsLog.id, 'failed', null, lastError)
    throw new Error(`All SMS providers failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
  }

  /**
   * Send SMS using specific provider
   */
  private async sendWithProvider(
    providerId: string,
    to: string,
    message: string,
    smsLogId: string
  ) {
    const provider = this.providers.get(providerId)
    if (!provider) throw new Error(`Provider ${providerId} not found`)

    let result: unknown

    switch (provider.type) {
      case 'twilio':
        result = await (provider as any).client.messages.create({
          body: message,
          from: provider.config.from_number || process.env.TWILIO_PHONE_NUMBER,
          to: to
        })
        break
        
      case 'messagebird':
        // result = await provider.client.messages.create({
        //   originator: provider.config.from_number,
        //   recipients: [to],
        //   body: message
        // })
        break
        
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`)
    }


    // Log delivery details
    await this.supabase
      .from('sms_delivery_logs')
      .insert({
        sms_log_id: smsLogId,
        provider_id: providerId,
        delivery_status: 'sent',
        provider_message_id: (result as any).sid || (result as any).id,
        delivery_timestamp: new Date(),
        cost: provider.config.cost_per_sms || 0.01
      })

    return result
  }

  /**
   * Check if phone number has opted out
   */
  private async checkOptOutStatus(phone: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('sms_opt_outs')
      .select('id')
      .eq('phone_number', phone)
      .single()

    return !!data && !error
  }

  /**
   * Update SMS log status
   */
  private async updateSMSLog(logId: string, status: string, providerId?: string | null, details?: unknown) {
    await this.supabase
      .from('sms_logs')
      .update({
        status,
        provider_id: providerId,
        sent_at: status === 'sent' ? new Date() : null,
        error_message: status === 'failed' ? (details instanceof Error ? details.message : String(details)) : null
      })
      .eq('id', logId)
  }

  /**
   * Log delivery attempt
   */
  private async logDeliveryAttempt(
    smsLogId: string,
    providerId: string,
    status: string,
    error?: unknown
  ) {
    await this.supabase
      .from('sms_delivery_logs')
      .insert({
        sms_log_id: smsLogId,
        provider_id: providerId,
        delivery_status: status,
        provider_status_message: error instanceof Error ? error.message : String(error)
      })
  }

  /**
   * Update provider statistics
   */
  private async updateProviderStats(providerId: string, success: boolean) {
    const { data: provider } = await this.supabase
      .from('sms_providers')
      .select('success_rate, current_month_usage')
      .eq('id', providerId)
      .single()

    if (!provider) return

    // Simple success rate calculation (would be more sophisticated in production)
    const newSuccessRate = success 
      ? Math.min(100, provider.success_rate + 0.1)
      : Math.max(0, provider.success_rate - 0.5)

    await this.supabase
      .from('sms_providers')
      .update({
        success_rate: newSuccessRate,
        current_month_usage: provider.current_month_usage + 1,
        updated_at: new Date()
      })
      .eq('id', providerId)
  }

  /**
   * Handle SMS opt-out
   */
  async handleOptOut(phone: string, method = 'sms_reply') {
    const { error } = await this.supabase
      .from('sms_opt_outs')
      .upsert({
        phone_number: phone,
        opt_out_date: new Date(),
        opt_out_method: method
      })

    if (!error) {
      // Send confirmation if required by regulations
      await this.sendOptOutConfirmation()
    }

    return !error
  }

  /**
   * Send opt-out confirmation
   */
  private async sendOptOutConfirmation() {
    // This would bypass opt-out check for regulatory compliance
    // Implementation would send this as a system message
  }
}