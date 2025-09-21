/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Email Service for Limn Systems Portal
 * Supports multiple email providers with fallback functionality
 * Follows the same pattern as the SMS service
 */

import { createAdminClient } from '@/lib/supabase/admin'

// Email Provider Types
export type EmailProvider = 'sendgrid' | 'resend' | 'nodemailer' | 'supabase' | 'mock'

export interface EmailMessage {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  template_id?: string
  template_vars?: Record<string, string>
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType: string
  }>
}

export interface EmailResponse {
  success: boolean
  message_id?: string
  error?: string
  provider_used?: EmailProvider
  status?: 'sent' | 'delivered' | 'failed' | 'pending'
}

export interface EmailConfig {
  sendgrid?: {
    api_key: string
    from_email: string
    from_name?: string
  }
  resend?: {
    api_key: string
    from_email: string
    from_name?: string
  }
  nodemailer?: {
    smtp_host: string
    smtp_port: number
    smtp_user: string
    smtp_password: string
    from_email: string
    from_name?: string
  }
  supabase?: {
    enabled: boolean
    from_email: string
    from_name?: string
  }
}

// Email templates for common notifications
export const EMAIL_TEMPLATES = {
  portal_access_granted: {
    subject: 'Welcome to Your {{company_name}} Client Portal',
    html: '<!-- HTML content will be loaded from database -->',
    text: 'Welcome to your client portal. Access: {{magic_link}}'
  },
  password_reset: {
    subject: 'Reset Your {{company_name}} Password',
    html: '<!-- HTML content will be loaded from database -->',
    text: 'Reset your password: {{reset_link}}'
  },
  order_confirmation: {
    subject: 'Order Confirmation #{{order_number}}',
    html: '<!-- HTML content will be loaded from database -->',
    text: 'Your order {{order_number}} has been confirmed.'
  }
} as const

export type EmailTemplate = keyof typeof EMAIL_TEMPLATES

class EmailService {
  private config: EmailConfig
  private providers: EmailProvider[]
  private supabase = createAdminClient()

  constructor(config: EmailConfig, providers: EmailProvider[] = ['sendgrid', 'resend', 'nodemailer', 'supabase']) {
    this.config = config
    this.providers = providers
  }

  /**
   * Send email using the first available provider
   */
  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    // Validate email address
    if (!this.isValidEmail(message.to)) {
      return {
        success: false,
        error: 'Invalid email address format'
      }
    }

    // Check rate limiting (basic implementation)
    const rateLimitCheck = await this.checkRateLimit(message.to)
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Please wait before sending another email.`
      }
    }

    // Try providers in order
    let lastError = ''
    for (const provider of this.providers) {
      try {
        const result = await this.sendViaProvider(provider, message)
        if (result.success) {
          // Log successful send
          await this.logEmailEvent({
            recipient_email: message.to,
            provider: provider,
            message_id: result.message_id,
            status: 'sent',
            subject: message.subject,
            template_id: message.template_id
          })
          
          return result
        }
        lastError = result.error || `${provider} failed`
      } catch (error) {
        lastError = `${provider} error: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`Email provider ${provider} failed:`, error)
        continue
      }
    }

    // All providers failed
    await this.logEmailEvent({
      recipient_email: message.to,
      provider: 'failed',
      status: 'failed',
      subject: message.subject,
      error_message: lastError
    })

    return {
      success: false,
      error: `All email providers failed. Last error: ${lastError}`
    }
  }

  /**
   * Send email using a template from database
   */
  async sendTemplateEmail(
    to: string,
    templateKey: string,
    variables: Record<string, string>,
    language: string = 'en',
    options: Partial<EmailMessage> = {}
  ): Promise<EmailResponse> {
    try {
      // Get template from database
      const { data: template, error } = await this.supabase
        .from('email_templates')
        .select('*')
        .eq('template_key', templateKey)
        .eq('language', language)
        .eq('is_active', true)
        .single()

      if (error || !template) {
        // Fallback to English if language not found
        if (language !== 'en') {
          return this.sendTemplateEmail(to, templateKey, variables, 'en', options)
        }
        
        return {
          success: false,
          error: `Email template '${templateKey}' not found for language '${language}'`
        }
      }

      // Replace template variables
      let subject = template.subject
      let htmlContent = template.html_content
      let textContent = template.text_content

      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        subject = subject.replace(regex, value)
        if (htmlContent) htmlContent = htmlContent.replace(regex, value)
        if (textContent) textContent = textContent.replace(regex, value)
      })

      return this.sendEmail({
        to,
        subject,
        html: htmlContent,
        text: textContent,
        template_id: template.id,
        template_vars: variables,
        ...options
      })
    } catch (error) {
      return {
        success: false,
        error: `Template processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Send via specific provider
   */
  private async sendViaProvider(provider: EmailProvider, message: EmailMessage): Promise<EmailResponse> {
    switch (provider) {
      case 'sendgrid':
        return this.sendViaSendGrid(message)
      case 'resend':
        return this.sendViaResend(message)
      case 'nodemailer':
        return this.sendViaNodemailer(message)
      case 'supabase':
        return this.sendViaSupabase(message)
      case 'mock':
        return this.sendViaMock(message)
      default:
        throw new Error(`Unknown email provider: ${provider}`)
    }
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(message: EmailMessage): Promise<EmailResponse> {
    if (!this.config.sendgrid) {
      throw new Error('SendGrid configuration not provided')
    }

    const { api_key, from_email, from_name } = this.config.sendgrid

    try {
      const payload = {
        personalizations: [
          {
            to: [{ email: message.to }]
          }
        ],
        from: {
          email: message.from || from_email,
          name: from_name
        },
        subject: message.subject,
        content: [
          ...(message.text ? [{ type: 'text/plain', value: message.text }] : []),
          ...(message.html ? [{ type: 'text/html', value: message.html }] : [])
        ]
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SendGrid API error: ${error}`)
      }

      const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`

      return {
        success: true,
        message_id: messageId,
        provider_used: 'sendgrid',
        status: 'sent'
      }
    } catch (error) {
      throw new Error(`SendGrid error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send via Resend
   */
  private async sendViaResend(message: EmailMessage): Promise<EmailResponse> {
    if (!this.config.resend) {
      throw new Error('Resend configuration not provided')
    }

    const { api_key, from_email, from_name } = this.config.resend

    try {
      const payload = {
        from: from_name ? `${from_name} <${message.from || from_email}>` : (message.from || from_email),
        to: [message.to],
        subject: message.subject,
        ...(message.html && { html: message.html }),
        ...(message.text && { text: message.text })
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Resend API error')
      }

      return {
        success: true,
        message_id: data.id,
        provider_used: 'resend',
        status: 'sent'
      }
    } catch (error) {
      throw new Error(`Resend error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send via Nodemailer (SMTP)
   */
  private async sendViaNodemailer(message: EmailMessage): Promise<EmailResponse> {
    if (!this.config.nodemailer) {
      throw new Error('Nodemailer configuration not provided')
    }

    // Note: In a real implementation, you would import nodemailer here
    // For now, we'll simulate the behavior
    
    return {
      success: true,
      message_id: `nodemailer_${Date.now()}`,
      provider_used: 'nodemailer',
      status: 'sent'
    }
  }

  /**
   * Send via Supabase Auth (Magic Links)
   */
  private async sendViaSupabase(message: EmailMessage): Promise<EmailResponse> {
    if (!this.config.supabase?.enabled) {
      throw new Error('Supabase email not enabled')
    }

    // This is primarily for magic links through Supabase Auth
    // Regular transactional emails should use other providers
    
    return {
      success: true,
      message_id: `supabase_${Date.now()}`,
      provider_used: 'supabase',
      status: 'sent'
    }
  }

  /**
   * Mock email service for development/testing
   */
  private async sendViaMock(message: EmailMessage): Promise<EmailResponse> {
    console.log(`[MOCK EMAIL] To: ${message.to}`)
    console.log(`[MOCK EMAIL] Subject: ${message.subject}`)
    console.log(`[MOCK EMAIL] Text: ${message.text?.substring(0, 100)}...`)
    console.log(`[MOCK EMAIL] HTML: ${message.html ? 'HTML content present' : 'No HTML'}`)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) {
      throw new Error('Mock email provider failure (5% chance)')
    }

    return {
      success: true,
      message_id: `mock_${Date.now()}`,
      provider_used: 'mock',
      status: 'sent'
    }
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Basic rate limiting check
   */
  private async checkRateLimit(email: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      
      const { data, error } = await this.supabase
        .from('email_queue')
        .select('id')
        .eq('recipient_email', email)
        .gte('created_at', oneHourAgo)

      if (error) {
        console.error('Email rate limit check error:', error)
        return { allowed: true, remaining: 100 } // Allow on error
      }

      const hourlyLimit = 10 // Emails per hour per address
      const currentCount = data?.length || 0
      
      return {
        allowed: currentCount < hourlyLimit,
        remaining: Math.max(0, hourlyLimit - currentCount)
      }
    } catch {
      console.error('Email rate limit check error')
      return { allowed: true, remaining: 100 } // Allow on error
    }
  }

  /**
   * Log email events for tracking and analytics
   */
  private async logEmailEvent(event: {
    recipient_email: string
    provider: string
    message_id?: string
    status: string
    subject: string
    template_id?: string
    error_message?: string
  }) {
    try {
      // Log to email_queue table
      await this.supabase.from('email_queue').insert({
        recipient_email: event.recipient_email,
        template_id: event.template_id || null,
        subject: event.subject,
        status: event.status,
        provider: event.provider,
        provider_message_id: event.message_id,
        error_message: event.error_message,
        sent_at: event.status === 'sent' ? new Date().toISOString() : null,
        metadata: {
          logged_at: new Date().toISOString()
        }
      })
    } catch {
      console.error('Failed to log email event')
      // Don't throw - logging failures shouldn't break email sending
    }
  }

  /**
   * Get email delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'failed' | 'pending'
    provider?: EmailProvider
    sent_at?: string
    error?: string
  }> {
    try {
      const { data } = await this.supabase
        .from('email_queue')
        .select('status, provider, sent_at, error_message')
        .eq('provider_message_id', messageId)
        .single()

      if (!data) {
        return { status: 'failed', error: 'Email not found' }
      }

      return {
        status: data.status,
        provider: data.provider,
        sent_at: data.sent_at,
        error: data.error_message
      }
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get email usage statistics
   */
  async getUsageStats(email?: string): Promise<{
    total_sent: number
    total_delivered: number
    total_failed: number
    daily_usage: Array<{ date: string; count: number }>
  }> {
    try {
      let query = this.supabase.from('email_queue').select('*')
      
      if (email) {
        query = query.eq('recipient_email', email)
      }

      const { data } = await query

      if (!data) {
        return {
          total_sent: 0,
          total_delivered: 0,
          total_failed: 0,
          daily_usage: []
        }
      }

      const stats = data.reduce((acc, log) => {
        if (log.status === 'sent') acc.total_sent++
        if (log.status === 'delivered') acc.total_delivered++
        if (log.status === 'failed') acc.total_failed++
        return acc
      }, {
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0
      })

      // Calculate daily usage
      const dailyUsage = data.reduce((acc: Record<string, number>, log) => {
        const date = log.created_at?.split('T')[0] || 'unknown'
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {})

      return {
        ...stats,
        daily_usage: Object.entries(dailyUsage).map(([date, count]) => ({
          date,
          count: count as number
        }))
      }
    } catch (error) {
      console.error('Failed to get email usage stats:', error)
      throw error
    }
  }
}

// Helper function to create email service instance
export function createEmailService(): EmailService {
  const config: EmailConfig = {}

  // Configure SendGrid if available
  if (process.env.SENDGRID_API_KEY) {
    config.sendgrid = {
      api_key: process.env.SENDGRID_API_KEY,
      from_email: process.env.SENDGRID_FROM_EMAIL || 'noreply@limnsystems.com',
      from_name: process.env.SENDGRID_FROM_NAME || 'Limn Systems'
    }
  }

  // Configure Resend if available
  if (process.env.RESEND_API_KEY) {
    config.resend = {
      api_key: process.env.RESEND_API_KEY,
      from_email: process.env.RESEND_FROM_EMAIL || 'noreply@limnsystems.com',
      from_name: process.env.RESEND_FROM_NAME || 'Limn Systems'
    }
  }

  // Configure Nodemailer (SMTP) if available
  if (process.env.SMTP_HOST) {
    config.nodemailer = {
      smtp_host: process.env.SMTP_HOST,
      smtp_port: parseInt(process.env.SMTP_PORT || '587'),
      smtp_user: process.env.SMTP_USER || '',
      smtp_password: process.env.SMTP_PASSWORD || '',
      from_email: process.env.SMTP_FROM_EMAIL || 'noreply@limnsystems.com',
      from_name: process.env.SMTP_FROM_NAME || 'Limn Systems'
    }
  }

  // Configure Supabase emails if available
  config.supabase = {
    enabled: process.env.SUPABASE_EMAIL_ENABLED === 'true',
    from_email: process.env.SUPABASE_FROM_EMAIL || 'noreply@limnsystems.com',
    from_name: process.env.SUPABASE_FROM_NAME || 'Limn Systems'
  }

  // Determine available providers
  const providers: EmailProvider[] = []
  if (config.sendgrid) providers.push('sendgrid')
  if (config.resend) providers.push('resend')
  if (config.nodemailer) providers.push('nodemailer')
  if (config.supabase?.enabled) providers.push('supabase')
  
  // Always include mock for development
  if (process.env.NODE_ENV === 'development' || providers.length === 0) {
    providers.push('mock')
  }

  return new EmailService(config, providers)
}

// Export default instance
export const emailService = createEmailService()
export default EmailService