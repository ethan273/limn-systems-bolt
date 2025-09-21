import twilio from 'twilio'

interface SMSProvider {
  name: string
  sendSMS: (to: string, message: string, options?: Record<string, unknown>) => Promise<SMSResult>
  validatePhoneNumber: (phoneNumber: string) => Promise<boolean>
  getDeliveryStatus: (messageId: string) => Promise<SMSDeliveryStatus>
}

interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
  timestamp: string
}

interface SMSDeliveryStatus {
  messageId: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'unknown'
  updatedAt: string
  errorCode?: string
  errorMessage?: string
}

interface SMSTemplate {
  id: string
  name: string
  message: string
  variables: string[]
}

interface SMSLog {
  id: string
  to: string
  message: string
  provider: string
  messageId?: string
  status: 'sent' | 'delivered' | 'failed' | 'pending'
  sentAt: string
  deliveredAt?: string
  failedAt?: string
  errorMessage?: string
}

// Twilio Provider
class TwilioProvider implements SMSProvider {
  public name = 'Twilio'
  private client: twilio.Twilio
  private fromNumber: string

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || ''

    if (!accountSid || !authToken || !this.fromNumber) {
      throw new Error('Twilio credentials not configured')
    }

    this.client = twilio(accountSid, authToken)
  }

  async sendSMS(to: string, message: string, options: Record<string, unknown> = {}): Promise<SMSResult> {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.normalizePhoneNumber(to),
        ...options
      })

      return {
        success: true,
        messageId: result.sid,
        provider: this.name,
        timestamp: new Date().toISOString()
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
        provider: this.name,
        timestamp: new Date().toISOString()
      }
    }
  }

  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      const lookup = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch()
      return !!lookup.phoneNumber
    } catch {
      return false
    }
  }

  async getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus> {
    try {
      const message = await this.client.messages(messageId).fetch()
      
      return {
        messageId,
        status: this.mapTwilioStatus(message.status),
        updatedAt: new Date().toISOString(),
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined
      }
    } catch (error: unknown) {
      return {
        messageId,
        status: 'unknown',
        updatedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '')
    
    // If no country code, assume US (+1)
    if (!cleaned.startsWith('+')) {
      return `+1${cleaned}`
    }
    
    return cleaned
  }

  private mapTwilioStatus(status: string): SMSDeliveryStatus['status'] {
    switch (status) {
      case 'queued':
      case 'accepted':
        return 'queued'
      case 'sent':
        return 'sent'
      case 'delivered':
        return 'delivered'
      case 'failed':
      case 'undelivered':
        return 'failed'
      default:
        return 'unknown'
    }
  }
}

// Mock Provider for Development
class MockSMSProvider implements SMSProvider {
  public name = 'Mock'

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    console.log(`📱 [MOCK SMS] To: ${to}, Message: ${message}`)
    
    // Simulate random success/failure for testing
    const success = Math.random() > 0.1 // 90% success rate
    
    if (success) {
      return {
        success: true,
        messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: this.name,
        timestamp: new Date().toISOString()
      }
    } else {
      return {
        success: false,
        error: 'Mock SMS failure for testing',
        provider: this.name,
        timestamp: new Date().toISOString()
      }
    }
  }

  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    // Basic validation for mock
    const cleaned = phoneNumber.replace(/[^\d+]/g, '')
    return cleaned.length >= 10 && cleaned.length <= 15
  }

  async getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus> {
    return {
      messageId,
      status: 'delivered',
      updatedAt: new Date().toISOString()
    }
  }
}

// SMS Templates
const SMS_TEMPLATES: Record<string, SMSTemplate> = {
  order_confirmation: {
    id: 'order_confirmation',
    name: 'Order Confirmation',
    message: 'Hi {{customer_name}}, your order {{order_number}} has been confirmed. Total: ${{total_amount}}. Thanks for choosing Limn Systems!',
    variables: ['customer_name', 'order_number', 'total_amount']
  },
  
  order_update: {
    id: 'order_update',
    name: 'Order Status Update',
    message: 'Order {{order_number}} update: Status changed to {{status}}. {{tracking_info}}Track your order at {{portal_link}}',
    variables: ['order_number', 'status', 'tracking_info', 'portal_link']
  },

  shipping_notification: {
    id: 'shipping_notification',
    name: 'Shipping Notification',
    message: 'Great news! Your order {{order_number}} has shipped. Tracking: {{tracking_number}}. Estimated delivery: {{delivery_date}}',
    variables: ['order_number', 'tracking_number', 'delivery_date']
  },

  delivery_confirmation: {
    id: 'delivery_confirmation',
    name: 'Delivery Confirmation',
    message: 'Your order {{order_number}} has been delivered! We hope you love your new items. Leave a review at {{review_link}}',
    variables: ['order_number', 'review_link']
  },

  production_update: {
    id: 'production_update',
    name: 'Production Update',
    message: 'Production update for order {{order_number}}: Now in {{stage}} phase ({{progress}}% complete). Est. completion: {{completion_date}}',
    variables: ['order_number', 'stage', 'progress', 'completion_date']
  },

  appointment_reminder: {
    id: 'appointment_reminder',
    name: 'Appointment Reminder',
    message: 'Reminder: You have a {{appointment_type}} scheduled for {{date}} at {{time}}. Location: {{location}}. Questions? Call us!',
    variables: ['appointment_type', 'date', 'time', 'location']
  },

  payment_reminder: {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    message: 'Payment reminder for order {{order_number}}: ${{amount}} due by {{due_date}}. Pay securely at {{payment_link}}',
    variables: ['order_number', 'amount', 'due_date', 'payment_link']
  },

  custom: {
    id: 'custom',
    name: 'Custom Message',
    message: '{{message}}',
    variables: ['message']
  }
}

export class SMSService {
  private provider: SMSProvider
  private isEnabled: boolean

  constructor() {
    this.isEnabled = process.env.SMS_ENABLED === 'true'
    
    if (!this.isEnabled) {
      this.provider = new MockSMSProvider()
      console.log('📱 SMS Service initialized with Mock Provider (SMS_ENABLED=false)')
      return
    }

    try {
      this.provider = new TwilioProvider()
      console.log('📱 SMS Service initialized with Twilio Provider')
    } catch (error) {
      console.warn('📱 Failed to initialize Twilio, falling back to Mock Provider:', error)
      this.provider = new MockSMSProvider()
      this.isEnabled = false
    }
  }

  async sendSMS(to: string, message: string, options: Record<string, unknown> = {}): Promise<SMSResult> {
    try {
      // Validate phone number first
      const isValidNumber = await this.validatePhoneNumber(to)
      if (!isValidNumber) {
        return {
          success: false,
          error: 'Invalid phone number',
          provider: this.provider.name,
          timestamp: new Date().toISOString()
        }
      }

      const result = await this.provider.sendSMS(to, message, options)
      
      // Log the SMS
      await this.logSMS({
        id: result.messageId || `log_${Date.now()}`,
        to,
        message,
        provider: this.provider.name,
        messageId: result.messageId,
        status: result.success ? 'sent' : 'failed',
        sentAt: result.timestamp,
        errorMessage: result.error
      })

      return result
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS service error',
        provider: this.provider.name,
        timestamp: new Date().toISOString()
      }
    }
  }

  async sendTemplatedSMS(to: string, templateId: string, variables: Record<string, string>): Promise<SMSResult> {
    const template = SMS_TEMPLATES[templateId]
    
    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found`,
        provider: this.provider.name,
        timestamp: new Date().toISOString()
      }
    }

    // Replace variables in template
    let message = template.message
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    // Check for unreplaced variables
    const unreplacedVars = message.match(/{{.*?}}/g)
    if (unreplacedVars) {
      console.warn(`📱 SMS template ${templateId} has unreplaced variables:`, unreplacedVars)
      // Remove unreplaced variables
      unreplacedVars.forEach(variable => {
        message = message.replace(variable, '')
      })
      // Clean up extra spaces
      message = message.replace(/\s+/g, ' ').trim()
    }

    return this.sendSMS(to, message)
  }

  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    return this.provider.validatePhoneNumber(phoneNumber)
  }

  async getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus> {
    return this.provider.getDeliveryStatus(messageId)
  }

  // Send bulk SMS
  async sendBulkSMS(recipients: string[], message: string, options: Record<string, unknown> = {}): Promise<SMSResult[]> {
    const results: SMSResult[] = []
    
    for (const recipient of recipients) {
      const result = await this.sendSMS(recipient, message, options)
      results.push(result)
      
      // Add small delay between messages to avoid rate limiting
      if (recipients.length > 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results
  }

  // Get available templates
  getTemplates(): SMSTemplate[] {
    return Object.values(SMS_TEMPLATES)
  }

  getTemplate(templateId: string): SMSTemplate | null {
    return SMS_TEMPLATES[templateId] || null
  }

  // Provider info
  getProviderInfo() {
    return {
      name: this.provider.name,
      enabled: this.isEnabled
    }
  }

  // Log SMS to database (implement based on your database)
  private async logSMS(log: SMSLog): Promise<void> {
    try {
      // In a real implementation, save to database
      console.log('📱 SMS Log:', {
        to: log.to.replace(/\d(?=\d{4})/g, '*'), // Mask phone number for privacy
        status: log.status,
        provider: log.provider,
        timestamp: log.sentAt
      })
    } catch (error) {
      console.error('📱 Failed to log SMS:', error)
    }
  }

  // Get SMS logs (implement based on your database)
  async getSMSLogs(): Promise<SMSLog[]> {
    // In a real implementation, query from database
    return []
  }

  // SMS analytics
  async getSMSAnalytics() {
    // In a real implementation, calculate from database
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      deliveryRate: 0,
      costAnalysis: {
        totalCost: 0,
        costPerMessage: 0
      },
      topTemplates: [],
      dailyVolume: []
    }
  }
}

// Singleton instance
export const smsService = new SMSService()

// Helper functions
export const formatPhoneNumber = (phoneNumber: string, format: 'international' | 'national' = 'international'): string => {
  const cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  if (format === 'national' && cleaned.startsWith('+1')) {
    const number = cleaned.slice(2)
    return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`
  }
  
  return cleaned
}

export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  const cleaned = phoneNumber.replace(/[^\d+]/g, '')
  return cleaned.length >= 10 && cleaned.length <= 15 && /^\+?\d+$/.test(cleaned)
}

// Export types for use in other components
export type { SMSResult, SMSTemplate, SMSLog, SMSDeliveryStatus }