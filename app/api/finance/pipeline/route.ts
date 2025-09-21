/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pipeline data from view
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('v_order_financial_pipeline')
      .select('*')
      .order('order_number', { ascending: false })

    if (pipelineError) {
      console.error('Pipeline data error:', pipelineError)
      return NextResponse.json(
        { error: 'Failed to fetch pipeline data' },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const stats = {
      total_orders: pipelineData?.length || 0,
      in_production: pipelineData?.filter((o: any) => o.financial_stage === 'in_production').length || 0,
      ready_to_invoice: pipelineData?.filter((o: any) => o.financial_stage === 'ready_to_invoice').length || 0,
      invoiced: pipelineData?.filter((o: any) => o.financial_stage === 'invoiced').length || 0,
      completed: pipelineData?.filter((o: any) => o.financial_stage === 'completed').length || 0,
      total_pipeline_value: pipelineData?.reduce((sum: any, o: any) => sum + (o.order_value || 0), 0) || 0,
      total_outstanding: pipelineData?.reduce((sum: any, o: any) => sum + (o.balance_due || 0), 0) || 0
    }

    // Group by stage for visualization
    const stageGroups = pipelineData?.reduce((groups: Record<string, unknown[]>, order: Record<string, unknown>) => {
      const stage = (order.financial_stage as string) || 'unknown'
      if (!groups[stage]) {
        groups[stage] = []
      }
      groups[stage].push(order)
      return groups
    }, {} as Record<string, unknown[]>) || {}

    return NextResponse.json({
      pipeline_data: pipelineData || [],
      statistics: stats,
      stage_groups: stageGroups,
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Pipeline API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { order_id, action, stage } = body

    if (!order_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, action' },
        { status: 400 }
      )
    }

    let result = null

    switch (action) {
      case 'advance_stage':
        // Advance order to next stage in pipeline
        result = await advanceOrderStage(supabase, order_id, stage)
        break

      case 'update_production_status':
        // Update production status
        result = await updateProductionStatus(supabase, order_id, body.status, body.progress)
        break

      case 'trigger_invoice_creation':
        // Queue invoice creation for completed order
        result = await queueInvoiceCreation(supabase, order_id)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      order_id,
      result
    })

  } catch (error) {
    console.error('Pipeline action error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pipeline action failed' },
      { status: 500 }
    )
  }
}

async function advanceOrderStage(supabase: SupabaseClient, orderId: string, targetStage: string) {
  // Update order status based on target stage
  const updates: Record<string, unknown> = {}
  
  switch (targetStage) {
    case 'in_production':
      updates.status = 'active'
      break
    case 'ready_to_invoice':
      updates.ready_to_invoice = true
      break
    case 'invoiced':
      // This should be handled by actual invoice creation
      break
    case 'completed':
      updates.status = 'completed'
      break
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`)
    }
  }

  return { stage: targetStage, updates }
}

async function updateProductionStatus(supabase: SupabaseClient, orderId: string, status: string, progress?: number) {
  const updates: Record<string, unknown> = { status }
  
  if (progress !== undefined) {
    updates.progress_percentage = Math.max(0, Math.min(100, progress))
  }
  
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('production_items')
    .update(updates)
    .eq('order_id', orderId)

  if (error) {
    throw new Error(`Failed to update production status: ${error.message}`)
  }

  return { status, progress }
}

async function queueInvoiceCreation(supabase: SupabaseClient, orderId: string) {
  // Check if all production items are completed
  const { data: productionItems, error: productionError } = await supabase
    .from('production_items')
    .select('status')
    .eq('order_id', orderId)

  if (productionError) {
    throw new Error(`Failed to check production status: ${productionError.message}`)
  }

  const allCompleted = productionItems?.every((item: Record<string, unknown>) => item.status === 'completed')
  
  if (!allCompleted) {
    throw new Error('Not all production items are completed')
  }

  // Queue invoice creation
  const { error: queueError } = await supabase
    .from('quickbooks_sync_queue')
    .insert({
      entity_type: 'invoice',
      entity_id: orderId,
      action: 'create',
      priority: 3,
      scheduled_for: new Date().toISOString()
    })

  if (queueError) {
    throw new Error(`Failed to queue invoice creation: ${queueError.message}`)
  }

  return { queued: true, order_id: orderId }
}