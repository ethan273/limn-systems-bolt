// SMS Campaigns API Route
// Phase 2 Implementation

import { NextRequest } from 'next/server'
import { SMSCampaignManager } from '@/lib/sms/campaign-manager'

export async function POST(request: NextRequest) {
  try {
    const { name, type, templateId, targetAudience, scheduledDate } = await request.json()

    if (!name || !type || !templateId) {
      return Response.json(
        { error: 'Missing required fields: name, type, templateId' },
        { status: 400 }
      )
    }

    const campaignManager = new SMSCampaignManager()
    const campaign = await campaignManager.createCampaign({
      name,
      type,
      templateId,
      targetAudience,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined
    })

    return Response.json(campaign)
  } catch (error: unknown) {
    console.error('Campaign creation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create campaign' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const campaignId = searchParams.get('campaignId')

    const campaignManager = new SMSCampaignManager()

    if (action === 'execute' && campaignId) {
      const results = await campaignManager.executeCampaign(campaignId)
      return Response.json(results)
    }

    if (action === 'analytics' && campaignId) {
      const analytics = await campaignManager.getCampaignAnalytics(campaignId)
      return Response.json(analytics)
    }

    return Response.json({ error: 'Invalid action or missing campaignId' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Campaign API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Campaign API error' },
      { status: 500 }
    )
  }
}