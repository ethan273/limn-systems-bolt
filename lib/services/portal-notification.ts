/**
 * Portal Notification Service for Limn Systems
 * 
 * Unified service for sending portal access notifications via email and SMS
 * Follows established patterns and integrates with existing infrastructure
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { emailService } from './email'
import { smsService } from './sms'

export interface Customer {
  id: string
  first_name?: string
  last_name?: string
  name?: string
  email: string
  phone?: string
  company_name?: string
  language?: string
}

export interface NotificationOptions {
  sendEmail: boolean
  sendSMS: boolean
  language?: string
  customMessage?: string
}

export interface NotificationResult {
  success: boolean
  email_result?: {
    success: boolean
    message_id?: string
    error?: string
  }
  sms_result?: {
    success: boolean
    message_id?: string
    error?: string
  }
  errors: string[]
}

class PortalNotificationService {
  private supabase = createAdminClient()

  /**
   * Send portal access notification to customer
   */
  async sendPortalAccessNotification(
    customer: Customer,
    magicLink: string,
    options: NotificationOptions = { sendEmail: true, sendSMS: false }
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      success: false,
      errors: []
    }

    try {
      // Determine customer language preference
      const language = options.language || await this.getCustomerLanguage(customer.id) || 'en'
      
      // Prepare template variables
      const templateVars = await this.prepareTemplateVariables(customer, magicLink)

      // Send email notification if enabled
      if (options.sendEmail && customer.email) {
        try {
          const emailResult = await emailService.sendTemplateEmail(
            customer.email,
            `portal_access_granted_${language}`,
            templateVars,
            language,
            {
              priority: 'high'
            }
          )

          result.email_result = emailResult
          
          if (!emailResult.success) {
            result.errors.push(`Email failed: ${emailResult.error}`)
          }
        } catch (error) {
          const errorMsg = `Email error: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          result.email_result = { success: false, error: errorMsg }
        }
      }

      // Send SMS notification if enabled and phone number available
      if (options.sendSMS && customer.phone) {
        try {
          const smsTemplate = language === 'es' ? 
            'portal_access_magic_link_es' as const : 
            'portal_access_magic_link_en' as const
          
          const smsResult = await smsService.sendTemplateMessage(
            customer.phone,
            smsTemplate,
            {
              company_name: templateVars.company_name,
              magic_link: magicLink
            },
            {
              type: 'transactional',
              priority: 'high'
            }
          )

          result.sms_result = smsResult
          
          if (!smsResult.success) {
            result.errors.push(`SMS failed: ${smsResult.error}`)
          }
        } catch (error) {
          const errorMsg = `SMS error: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          result.sms_result = { success: false, error: errorMsg }
        }
      }

      // Determine overall success
      const emailSuccess = !options.sendEmail || result.email_result?.success === true
      const smsSuccess = !options.sendSMS || result.sms_result?.success === true
      result.success = emailSuccess && smsSuccess && result.errors.length === 0

      // Log the notification attempt
      await this.logNotificationAttempt({
        customer_id: customer.id,
        notification_type: 'portal_access_granted',
        channels: [
          ...(options.sendEmail ? ['email'] : []),
          ...(options.sendSMS ? ['sms'] : [])
        ],
        success: result.success,
        details: {
          email_success: result.email_result?.success,
          sms_success: result.sms_result?.success,
          language,
          errors: result.errors
        }
      })

      return result

    } catch (error) {
      const errorMsg = `Portal notification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMsg)
      result.success = false

      console.error('Portal notification service error:', error)
      return result
    }
  }

  /**
   * Send magic link via Supabase Auth for password-free login
   */
  async sendMagicLink(
    email: string,
    redirectTo?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo || `${process.env.NEXT_PUBLIC_APP_URL}/portal`,
          data: {
            user_type: 'customer',
            portal_access: true,
            ...metadata
          }
        }
      })

      if (error) {
        console.error('Magic link generation error:', error)
        return {
          success: false,
          error: error.message || 'Failed to generate magic link'
        }
      }

      return { success: true }

    } catch (error) {
      console.error('Magic link service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate secure magic link token for manual email/SMS sending
   */
  async generateMagicLink(
    email: string,
    expiresInMinutes: number = 60
  ): Promise<{ success: boolean; magic_link?: string; token?: string; error?: string }> {
    try {
      // Generate secure token
      const token = this.generateSecureToken()
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

      // Store token in database
      const { error } = await this.supabase
        .from('magic_link_tokens')
        .insert({
          email,
          token,
          expires_at: expiresAt.toISOString()
        })

      if (error) {
        console.error('Magic link token storage error:', error)
        return {
          success: false,
          error: 'Failed to generate magic link'
        }
      }

      const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-magic-link?token=${token}&email=${encodeURIComponent(email)}`

      return {
        success: true,
        magic_link: magicLink,
        token
      }

    } catch (error) {
      console.error('Magic link generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get customer language preference
   */
  private async getCustomerLanguage(customerId: string): Promise<string> {
    try {
      const { data } = await this.supabase.rpc('get_customer_language', {
        customer_id: customerId
      })

      return data || 'en'
    } catch (error) {
      console.error('Error getting customer language:', error)
      return 'en'
    }
  }

  /**
   * Prepare template variables for notifications
   */
  private async prepareTemplateVariables(
    customer: Customer,
    magicLink: string
  ): Promise<Record<string, string>> {
    const customerName = customer.name || 
                        (customer.first_name && customer.last_name ? 
                         `${customer.first_name} ${customer.last_name}` : 
                         customer.first_name || 
                         customer.email.split('@')[0])

    return {
      customer_name: customerName,
      company_name: process.env.COMPANY_NAME || 'Limn Systems',
      magic_link: magicLink,
      portal_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal`,
      support_email: process.env.SUPPORT_EMAIL || 'support@limnsystems.com',
      sales_rep_email: process.env.SALES_EMAIL || 'sales@limnsystems.com',
      company_phone: process.env.COMPANY_PHONE || '(555) 123-4567',
      company_address: process.env.COMPANY_ADDRESS || '123 Business St, City, ST 12345',
      company_website: process.env.COMPANY_WEBSITE || 'https://limnsystems.com'
    }
  }

  /**
   * Generate cryptographically secure token
   */
  private generateSecureToken(length: number = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    let result = ''
    
    // Use crypto for secure random generation
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomArray = new Uint8Array(length)
      crypto.getRandomValues(randomArray)
      
      for (let i = 0; i < length; i++) {
        result += chars[randomArray[i] % chars.length]
      }
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
      }
    }
    
    return result
  }

  /**
   * Log notification attempt for analytics and debugging
   */
  private async logNotificationAttempt(event: {
    customer_id: string
    notification_type: string
    channels: string[]
    success: boolean
    details: Record<string, unknown>
  }) {
    try {
      await this.supabase
        .from('portal_activity_log')
        .insert({
          customer_id: event.customer_id,
          activity_type: 'notification_sent',
          description: `${event.notification_type} notification via ${event.channels.join(', ')}`,
          metadata: {
            notification_type: event.notification_type,
            channels: event.channels,
            success: event.success,
            timestamp: new Date().toISOString(),
            ...event.details
          }
        })
    } catch (error) {
      console.error('Failed to log notification attempt:', error)
      // Don't throw - logging failures shouldn't break notifications
    }
  }

  /**
   * Get notification preferences for a customer
   */
  async getCustomerNotificationPreferences(customerId: string): Promise<{
    email_enabled: boolean
    sms_enabled: boolean
    language: string
  }> {
    try {
      const { data } = await this.supabase
        .from('customers')
        .select(`
          id,
          language,
          customer_portal_access (
            user_id,
            user_preferences (
              notification_email,
              notification_sms,
              language
            )
          )
        `)
        .eq('id', customerId)
        .single()

      if (!data) {
        return {
          email_enabled: true,
          sms_enabled: false,
          language: 'en'
        }
      }

      const preferences = data.customer_portal_access?.[0]?.user_preferences
      
      return {
        email_enabled: Boolean((preferences as unknown as Record<string, unknown>)?.notification_email ?? true),
        sms_enabled: Boolean((preferences as unknown as Record<string, unknown>)?.notification_sms ?? false),
        language: String((preferences as unknown as Record<string, unknown>)?.language || (data as unknown as Record<string, unknown>).language || 'en')
      }
    } catch (error) {
      console.error('Error getting customer notification preferences:', error)
      return {
        email_enabled: true,
        sms_enabled: false,
        language: 'en'
      }
    }
  }

  /**
   * Validate magic link token
   */
  async validateMagicLinkToken(token: string, email: string): Promise<{
    valid: boolean
    expired?: boolean
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('magic_link_tokens')
        .select('*')
        .eq('token', token)
        .eq('email', email)
        .is('used_at', null)
        .single()

      if (error || !data) {
        return {
          valid: false,
          error: 'Invalid token'
        }
      }

      // Check if token is expired
      const now = new Date()
      const expiresAt = new Date(data.expires_at)
      
      if (now > expiresAt) {
        return {
          valid: false,
          expired: true,
          error: 'Token expired'
        }
      }

      // Mark token as used
      await this.supabase
        .from('magic_link_tokens')
        .update({ 
          used_at: new Date().toISOString() 
        })
        .eq('id', data.id)

      return { valid: true }

    } catch (error) {
      console.error('Magic link token validation error:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation error'
      }
    }
  }
}

// Export default instance
export const portalNotificationService = new PortalNotificationService()
export default PortalNotificationService