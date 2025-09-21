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

    // Get orders ready to invoice from view
    const { data: readyOrders, error: readyError } = await supabase
      .from('v_ready_to_invoice')
      .select('*')
      .order('last_item_completed', { ascending: true })

    if (readyError) {
      console.error('Ready to invoice error:', readyError)
      return NextResponse.json(
        { error: 'Failed to fetch ready to invoice data' },
        { status: 500 }
      )
    }

    // Calculate totals
    const totalAmount = readyOrders?.reduce((sum: any, order: any) => sum + order.total_amount, 0) || 0
    const totalOrders = readyOrders?.length || 0

    return NextResponse.json({
      ready_orders: readyOrders || [],
      summary: {
        total_orders: totalOrders,
        total_amount: totalAmount,
        average_order_value: totalOrders > 0 ? totalAmount / totalOrders : 0
      },
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Ready to invoice API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ready to invoice data' },
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
    const { order_id, action } = body

    if (!order_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, action' },
        { status: 400 }
      )
    }

    let result = null

    switch (action) {
      case 'mark_ready':
        result = await markOrderReadyForInvoicing(supabase, order_id)
        break
      
      case 'unmark_ready':
        result = await unmarkOrderReadyForInvoicing(supabase, order_id)
        break
      
      case 'queue_invoice':
        result = await queueSingleInvoiceCreation(supabase, order_id)
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
    console.error('Ready to invoice action error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    )
  }
}

async function markOrderReadyForInvoicing(supabase: SupabaseClient, orderId: string) {
  // First verify all production items are completed
  const { data: productionItems, error: productionError } = await supabase
    .from('production_items')
    .select('status, id')
    .eq('order_id', orderId)

  if (productionError) {
    throw new Error(`Failed to check production status: ${productionError.message}`)
  }

  const incompleteItems = productionItems?.filter((item: Record<string, unknown>) => item.status !== 'completed')
  
  if (incompleteItems && incompleteItems.length > 0) {
    return NextResponse.json(
      { 
        error: `Cannot mark as ready: ${incompleteItems.length} production items are not completed`,
        incomplete_items: incompleteItems
      },
      { status: 400 }
    )
  }

  // Mark order as ready to invoice
  const { error: orderError } = await supabase
    .from('orders')
    .update({ 
      ready_to_invoice: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (orderError) {
    throw new Error(`Failed to mark order ready: ${orderError.message}`)
  }

  // Log the action
  await supabase
    .from('quickbooks_sync_logs')
    .insert({
      sync_type: 'manual_ready_marking',
      status: 'success',
      message: `Order ${orderId} manually marked as ready to invoice`,
      entity_type: 'order',
      entity_id: orderId,
      synced_at: new Date().toISOString()
    })

  return { marked_ready: true, order_id: orderId }
}

async function unmarkOrderReadyForInvoicing(supabase: SupabaseClient, orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ 
      ready_to_invoice: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (error) {
    throw new Error(`Failed to unmark order: ${error.message}`)
  }

  return { unmarked_ready: true, order_id: orderId }
}

async function queueSingleInvoiceCreation(supabase: SupabaseClient, orderId: string) {
  // Check if order is ready to invoice
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('ready_to_invoice, status')
    .eq('id', orderId)
    .single()

  if (orderError) {
    throw new Error(`Order not found: ${orderError.message}`)
  }

  if (!order.ready_to_invoice) {
    throw new Error('Order is not ready to invoice')
  }

  // Check if already has invoice
  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('order_id', orderId)
    .single()

  if (existingInvoice) {
    throw new Error('Order already has an invoice')
  }

  // Queue for invoice creation
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
    throw new Error(`Failed to queue invoice: ${queueError.message}`)
  }

  return { queued: true, order_id: orderId }
}