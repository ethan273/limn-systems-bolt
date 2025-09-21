// Automation Processing API Route
// Phase 2 Implementation

import { NextRequest } from 'next/server'
import { AutomationRuleProcessor } from '@/lib/automation/rule-processor'

export async function POST(request: NextRequest) {
  try {
    const { event, data } = await request.json()

    if (!event) {
      return Response.json(
        { error: 'Missing required field: event' },
        { status: 400 }
      )
    }

    const processor = new AutomationRuleProcessor()
    await processor.processRules(event, data)

    return Response.json({ 
      success: true, 
      message: `Processed automation rules for event: ${event}` 
    })
  } catch (error: unknown) {
    console.error('Automation processing error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Automation processing failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const processor = new AutomationRuleProcessor()

    if (action === 'process-all') {
      await processor.processRules()
      return Response.json({ 
        success: true, 
        message: 'Processed all active automation rules' 
      })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Automation API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Automation API error' },
      { status: 500 }
    )
  }
}