/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SMS Service for Limn Systems Portal
 * Supports multiple SMS providers with fallback functionality
 */

import { createAdminClient } from '@/lib/supabase/admin'

// SMS Provider Types
export type SMSProvider = 'twilio' | 'aws_sns' | 'messagebird' | 'mock'

export interface SMSMessage {
  to: string
  message: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  type?: 'transactional' | 'marketing' | 'notification'
  template_id?: string
  template_vars?: Record<string, string>
}

export interface SMSResponse {
  success: boolean
  message_id?: string
  error?: string
  provider_used?: SMSProvider
  cost?: number
  status?: 'sent' | 'delivered' | 'failed' | 'pending'
}

export interface SMSConfig {
  twilio?: {
    account_sid: string
    auth_token: string
    from_number: string
  }
  aws_sns?: {
    access_key_id: string
    secret_access_key: string
    region: string
    topic_arn?: string
  }
  messagebird?: {
    access_key: string
    originator: string
  }
}

// SMS Templates for common notifications
export const SMS_TEMPLATES = {
  order_status_update: 'Order #{order_number} status updated: {status}. Track at {portal_url}',
  production_milestone: 'Your order #{order_number} has reached {milestone}. View details at {portal_url}',
  shipping_notification: 'Order #{order_number} shipped via {carrier}. Tracking: {tracking_number}',
  design_approval_needed: 'Design approval needed for order #{order_number}. Review at {portal_url}',
  invoice_ready: 'Invoice #{invoice_number} ready for order #{order_number}. View at {portal_url}',
  urgent_notification: 'Urgent: {message}. Contact us immediately if needed.',
  verification_code: 'Your Limn Systems verification code is: {code}. Valid for 10 minutes.',
  password_reset: 'Password reset requested. Use code: {code} or visit {reset_url}',
  portal_access_granted: 'Welcome! Your Limn Systems portal access is now active. Login at {portal_url}',
  portal_access_magic_link_en: 'Welcome to {company_name}! Your secure client portal is ready. Access now: {magic_link} (Link expires in 1 hour)',
  portal_access_magic_link_es: '¡Bienvenido a {company_name}! Su portal de cliente está listo. Acceda ahora: {magic_link} (El enlace expira en 1 hora)'
} as const

export type SMSTemplate = keyof typeof SMS_TEMPLATES

class SMSService {
  private config: SMSConfig
  private providers: SMSProvider[]
  private supabase = createAdminClient()

  constructor(config: SMSConfig, providers: SMSProvider[] = ['twilio', 'aws_sns', 'messagebird']) {
    this.config = config
    this.providers = providers
  }

  /**
   * Send SMS using the first available provider
   */
  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    // Validate phone number
    if (!this.isValidPhoneNumber(message.to)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      }
    }

    // Check rate limiting
    const rateLimitCheck = await this.checkRateLimit(message.to)
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. ${rateLimitCheck.remaining} messages remaining today.`
      }
    }

    // Try providers in order
    let lastError = ''
    for (const provider of this.providers) {
      try {
        const result = await this.sendViaProvider(provider, message)
        if (result.success) {
          // Log successful send
          await this.logSMSEvent({
            phone_number: message.to,
            provider: provider,
            message_id: result.message_id,
            status: 'sent',
            message_type: message.type || 'notification',
            cost: result.cost || 0
          })
          
          return result
        }
        lastError = result.error || `${provider} failed`
      } catch (error) {
        lastError = `${provider} error: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`SMS provider ${provider} failed:`, error)
        continue
      }
    }

    // All providers failed
    await this.logSMSEvent({
      phone_number: message.to,
      provider: 'failed',
      status: 'failed',
      message_type: message.type || 'notification',
      error_message: lastError
    })

    return {
      success: false,
      error: `All SMS providers failed. Last error: ${lastError}`
    }
  }

  /**
   * Send SMS using a template
   */
  async sendTemplateMessage(
    to: string,
    template: SMSTemplate,
    variables: Record<string, string>,
    options: Partial<SMSMessage> = {}
  ): Promise<SMSResponse> {
    let message = SMS_TEMPLATES[template]
    
    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value) as any
    })

    return this.sendSMS({
      to,
      message: message as string,
      type: 'transactional',
      template_id: template,
      template_vars: variables,
      ...options
    })
  }

  /**
   * Send via specific provider
   */
  private async sendViaProvider(provider: SMSProvider, message: SMSMessage): Promise<SMSResponse> {
    switch (provider) {
      case 'twilio':
        return this.sendViaTwilio(message)
      case 'aws_sns':
        return this.sendViaAWS()
      case 'messagebird':
        return this.sendViaMessageBird(message)
      case 'mock':
        return this.sendViaMock(message)
      default:
        throw new Error(`Unknown SMS provider: ${provider}`)
    }
  }

  /**
   * Send via Twilio
   */
  private async sendViaTwilio(message: SMSMessage): Promise<SMSResponse> {
    if (!this.config.twilio) {
      throw new Error('Twilio configuration not provided')
    }

    const { account_sid, auth_token, from_number } = this.config.twilio

    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${account_sid}:${auth_token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: message.to,
          From: from_number,
          Body: message.message
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Twilio API error')
      }

      return {
        success: true,
        message_id: data.sid,
        provider_used: 'twilio',
        status: data.status,
        cost: parseFloat(data.price || '0')
      }
    } catch (error) {
      throw new Error(`Twilio error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send via AWS SNS
   */
  private async sendViaAWS(): Promise<SMSResponse> {
    if (!this.config.aws_sns) {
      throw new Error('AWS SNS configuration not provided')
    }

    // This would require AWS SDK implementation
    // For now, return mock response
    return {
      success: true,
      message_id: `aws_${Date.now()}`,
      provider_used: 'aws_sns',
      status: 'sent'
    }
  }

  /**
   * Send via MessageBird
   */
  private async sendViaMessageBird(message: SMSMessage): Promise<SMSResponse> {
    if (!this.config.messagebird) {
      throw new Error('MessageBird configuration not provided')
    }

    const { access_key, originator } = this.config.messagebird

    try {
      const response = await fetch('https://rest.messagebird.com/messages', {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${access_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients: [message.to],
          originator: originator,
          body: message.message
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.description || 'MessageBird API error')
      }

      return {
        success: true,
        message_id: data.id,
        provider_used: 'messagebird',
        status: 'sent'
      }
    } catch (error) {
      throw new Error(`MessageBird error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mock SMS service for development/testing
   */
  private async sendViaMock(message: SMSMessage): Promise<SMSResponse> {
    console.log(`[MOCK SMS] To: ${message.to}, Message: ${message.message}`)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      throw new Error('Mock SMS provider failure (10% chance)')
    }

    return {
      success: true,
      message_id: `mock_${Date.now()}`,
      provider_used: 'mock',
      status: 'sent',
      cost: 0.01 // Mock cost
    }
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/
    return e164Regex.test(phone)
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(phoneNumber: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await this.supabase
        .from('sms_usage')
        .select('message_count')
        .eq('phone_number', phoneNumber)
        .eq('date', today)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Rate limit check error:', error)
        return { allowed: true, remaining: 100 } // Allow on error
      }

      const dailyLimit = 50 // Messages per day per phone number
      const currentCount = data?.message_count || 0
      
      return {
        allowed: currentCount < dailyLimit,
        remaining: Math.max(0, dailyLimit - currentCount)
      }
    } catch {
      console.error('Rate limit check error')
      return { allowed: true, remaining: 100 } // Allow on error
    }
  }

  /**
   * Log SMS events for tracking and analytics
   */
  private async logSMSEvent(event: {
    phone_number: string
    provider: string
    message_id?: string
    status: string
    message_type: string
    cost?: number
    error_message?: string
  }) {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Log individual event
      await this.supabase.from('sms_logs').insert({
        ...event,
        sent_at: new Date().toISOString()
      })

      // Update daily usage counter
      if (event.status === 'sent') {
        await this.supabase.rpc('increment_sms_usage', {
          phone_num: event.phone_number,
          usage_date: today
        })
      }
    } catch {
      console.error('Failed to log SMS event')
      // Don't throw - logging failures shouldn't break SMS sending
    }
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'failed' | 'pending'
    provider?: SMSProvider
    delivered_at?: string
    error?: string
  }> {
    try {
      const { data } = await this.supabase
        .from('sms_logs')
        .select('status, provider, sent_at, error_message')
        .eq('message_id', messageId)
        .single()

      if (!data) {
        return { status: 'failed', error: 'Message not found' }
      }

      return {
        status: data.status,
        provider: data.provider,
        delivered_at: data.sent_at,
        error: data.error_message
      }
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get SMS usage statistics
   */
  async getUsageStats(phoneNumber?: string): Promise<{
    total_sent: number
    total_delivered: number
    total_failed: number
    total_cost: number
    daily_usage: Array<{ date: string; count: number; cost: number }>
  }> {
    try {
      let query = this.supabase.from('sms_logs').select('*')
      
      if (phoneNumber) {
        query = query.eq('phone_number', phoneNumber)
      }

      const { data } = await query

      if (!data) {
        return {
          total_sent: 0,
          total_delivered: 0,
          total_failed: 0,
          total_cost: 0,
          daily_usage: []
        }
      }

      const stats = data.reduce((acc, log) => {
        if (log.status === 'sent') acc.total_sent++
        if (log.status === 'delivered') acc.total_delivered++
        if (log.status === 'failed') acc.total_failed++
        acc.total_cost += log.cost || 0
        return acc
      }, {
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0,
        total_cost: 0
      })

      // Calculate daily usage
      const dailyUsage = data.reduce((acc: Record<string, { count: number; cost: number }>, log) => {
        const date = log.sent_at?.split('T')[0] || 'unknown'
        if (!acc[date]) acc[date] = { count: 0, cost: 0 }
        acc[date].count++
        acc[date].cost += log.cost || 0
        return acc
      }, {})

      return {
        ...stats,
        daily_usage: Object.entries(dailyUsage).map(([date, data]) => ({
          date,
          count: data.count,
          cost: data.cost
        }))
      }
    } catch (error) {
      console.error('Failed to get SMS usage stats:', error)
      throw error
    }
  }
}

// Helper function to create SMS service instance
export function createSMSService(): SMSService {
  const config: SMSConfig = {}

  // Configure Twilio if available
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    config.twilio = {
      account_sid: process.env.TWILIO_ACCOUNT_SID,
      auth_token: process.env.TWILIO_AUTH_TOKEN,
      from_number: process.env.TWILIO_FROM_NUMBER || '+1234567890'
    }
  }

  // Configure AWS SNS if available
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.aws_sns = {
      access_key_id: process.env.AWS_ACCESS_KEY_ID,
      secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      topic_arn: process.env.AWS_SNS_TOPIC_ARN
    }
  }

  // Configure MessageBird if available
  if (process.env.MESSAGEBIRD_ACCESS_KEY) {
    config.messagebird = {
      access_key: process.env.MESSAGEBIRD_ACCESS_KEY,
      originator: process.env.MESSAGEBIRD_ORIGINATOR || 'LimnSystems'
    }
  }

  // Determine available providers
  const providers: SMSProvider[] = []
  if (config.twilio) providers.push('twilio')
  if (config.aws_sns) providers.push('aws_sns')
  if (config.messagebird) providers.push('messagebird')
  
  // Always include mock for development
  if (process.env.NODE_ENV === 'development' || providers.length === 0) {
    providers.push('mock')
  }

  return new SMSService(config, providers)
}

// Export default instance
export const smsService = createSMSService()
export default SMSService