/* eslint-disable @typescript-eslint/no-explicit-any */
// SMS Campaign Manager
// Phase 2 Implementation

import { createClient } from '@supabase/supabase-js'
import { SMSProviderService } from './provider-service'

export class SMSCampaignManager {
  private supabase: unknown
  private smsService: SMSProviderService

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
    this.smsService = new SMSProviderService()
  }

  /**
   * Create a new SMS campaign
   */
  async createCampaign(params: {
    name: string
    type: string
    templateId: string
    targetAudience: Record<string, unknown>
    scheduledDate?: Date
  }) {
    // Get recipients based on target audience
    const recipients = await this.getTargetRecipients(params.targetAudience)

    // Create campaign
    const { data: campaign, error } = await (this.supabase as any)
      .from('sms_campaigns')
      .insert({
        campaign_name: params.name,
        campaign_type: params.type,
        template_id: params.templateId,
        target_audience: params.targetAudience,
        scheduled_date: params.scheduledDate,
        status: params.scheduledDate ? 'scheduled' : 'draft',
        total_recipients: recipients.length
      })
      .select()
      .single()

    if (error) throw error

    // Schedule if needed
    if (params.scheduledDate) {
      await this.scheduleCampaign(campaign.id, params.scheduledDate, recipients)
    }

    return campaign
  }

  /**
   * Execute a campaign
   */
  async executeCampaign(campaignId: string) {
    // Get campaign details
    const { data: campaign, error } = await (this.supabase as any)
      .from('sms_campaigns')
      .select('*, template:sms_templates(*)')
      .eq('id', campaignId)
      .single()

    if (error) throw error

    // Update campaign status
    await (this.supabase as any)
      .from('sms_campaigns')
      .update({ status: 'active' })
      .eq('id', campaignId)

    // Get recipients
    const recipients = await this.getTargetRecipients(campaign.target_audience)

    // Initialize SMS service
    await this.smsService.initialize()

    // Process recipients in batches
    const batchSize = 100
    const results = {
      sent: 0,
      failed: 0,
      optedOut: 0
    }

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (recipient: any) => {
        try {
          // Personalize message
          const message = this.personalizeMessage(
            campaign.template.message,
            recipient
          )

          // Send SMS
          await this.smsService.sendSMS(
            recipient.phone,
            message,
            campaignId
          )

          results.sent++
        } catch (error: unknown) {
          if ((error as any).message?.includes('opted out')) {
            results.optedOut++
          } else {
            results.failed++
          }
        }
      }))

      // Update progress
      await this.updateCampaignProgress(campaignId, results)
    }

    // Mark campaign as completed
    await (this.supabase as any)
      .from('sms_campaigns')
      .update({
        status: 'completed',
        sent_count: results.sent,
        failed_count: results.failed,
        opt_out_count: results.optedOut,
        completed_at: new Date()
      })
      .eq('id', campaignId)

    return results
  }

  /**
   * Get target recipients based on criteria
   */
  private async getTargetRecipients(criteria: Record<string, unknown>) {
    let query = (this.supabase as any)
      .from('customers')
      .select('id, company_name, phone, metadata')
      .not('phone', 'is', null)

    // Apply filters based on criteria
    if ((criteria as any).segments) {
      for (const segment of (criteria as any).segments) {
        switch (segment.type) {
          case 'tag':
            query = query.contains('tags', [segment.value])
            break
          case 'status':
            query = query.eq('status', segment.value)
            break
          case 'created_after':
            query = query.gte('created_at', segment.value)
            break
          // Add more segment types as needed
        }
      }
    }

    const { data, error } = await query

    if (error) throw error

    // Filter out opted-out recipients
    const { data: optedOut } = await (this.supabase as any)
      .from('sms_opt_outs')
      .select('phone_number')

    const optedOutPhones = new Set(optedOut?.map((o: any) => o.phone_number) || [])
    
    return data.filter((r: any) => !optedOutPhones.has(r.phone))
  }

  /**
   * Personalize message with recipient data
   */
  private personalizeMessage(template: string, recipient: Record<string, unknown>): string {
    let message = template

    // Replace standard placeholders
    message = message.replace(/{{company_name}}/g, (recipient as any).company_name || '')
    message = message.replace(/{{first_name}}/g, (recipient as any).metadata?.first_name || '')
    message = message.replace(/{{last_name}}/g, (recipient as any).metadata?.last_name || '')

    // Replace custom placeholders from metadata
    if ((recipient as any).metadata) {
      Object.keys((recipient as any).metadata).forEach((key: string) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        message = message.replace(regex, (recipient as any).metadata[key] || '')
      })
    }

    return message
  }

  /**
   * Schedule campaign for later execution
   */
  private async scheduleCampaign(
    campaignId: string,
    scheduledDate: Date,
    recipients: Record<string, unknown>[]
  ) {
    const { error } = await (this.supabase as any)
      .from('sms_scheduled_jobs')
      .insert({
        job_type: 'campaign',
        recipient_list: recipients.map(r => r.phone),
        scheduled_time: scheduledDate,
        status: 'pending',
        metadata: { campaign_id: campaignId }
      })

    if (error) throw error
  }

  /**
   * Update campaign progress
   */
  private async updateCampaignProgress(campaignId: string, results: Record<string, unknown>) {
    await (this.supabase as any)
      .from('sms_campaigns')
      .update({
        sent_count: results.sent,
        failed_count: results.failed,
        opt_out_count: results.optedOut,
        updated_at: new Date()
      })
      .eq('id', campaignId)
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string) {
    // Get campaign data
    const { data: campaign } = await (this.supabase as any)
      .from('sms_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    // Get delivery stats
    const { data: deliveryStats } = await (this.supabase as any)
      .from('sms_delivery_logs')
      .select('delivery_status, count')
      .eq('campaign_id', campaignId)
      .select('delivery_status')

    // Calculate metrics
    const deliveryRate = campaign.sent_count / campaign.total_recipients * 100
    const failureRate = campaign.failed_count / campaign.total_recipients * 100
    const optOutRate = campaign.opt_out_count / campaign.total_recipients * 100

    return {
      campaign,
      metrics: {
        deliveryRate,
        failureRate,
        optOutRate,
        totalCost: campaign.sent_count * 0.01 // Assuming $0.01 per SMS
      },
      deliveryStats
    }
  }
}