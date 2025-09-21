import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['orders.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Parse query parameters for filtering
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const searchTerm = url.searchParams.get('search')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log('Order Tracking API: Query params', { status, searchTerm, limit, offset })

    // Query orders with related data for tracking
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total_amount,
        created_at,
        updated_at,
        shipping_address,
        customer:customers(
          id,
          name,
          email
        ),
        order_items(
          id,
          quantity,
          price,
          item:items(
            id,
            name,
            sku_base
          )
        ),
        production_status(
          id,
          status,
          stage,
          progress,
          actual_start_date,
          actual_completion_date
        ),
        shipments(
          id,
          tracking_number,
          carrier,
          status as shipping_status,
          estimated_delivery,
          actual_delivery
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Apply filters if specified
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Order tracking query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch order tracking data', details: error.message },
        { status: 500 }
      )
    }

    // Transform data to match frontend interface
    const transformedOrders = (orders || []).map((order: Record<string, unknown>) => {
      const customer = order.customer as Record<string, unknown> | null
      const orderItems = order.order_items as Array<Record<string, unknown>> || []
      const production = order.production_status as Array<Record<string, unknown>> || []
      const shipments = order.shipments as Array<Record<string, unknown>> || []

      const latestProduction = production[0] || {}
      const latestShipment = shipments[0] || {}

      // Calculate computed status based on production and shipping
      let computedStatus = order.status as string || 'pending'
      if (latestShipment.shipping_status === 'delivered') {
        computedStatus = 'delivered'
      } else if (latestShipment.shipping_status === 'shipped' || latestShipment.shipping_status === 'in_transit') {
        computedStatus = 'shipped'
      } else if (latestProduction.status === 'in_progress' || latestProduction.status === 'active') {
        computedStatus = 'processing'
      }

      return {
        id: order.id as string,
        order_number: order.order_number as string || '',
        customer_name: customer?.name as string || 'Unknown Customer',
        customer_email: customer?.email as string || 'Unknown Email',
        status: order.status as string || 'pending',
        computed_status: computedStatus,
        tracking_number: latestShipment.tracking_number as string || null,
        carrier_name: latestShipment.carrier as string || null,
        shipping_status: latestShipment.shipping_status as string || null,
        total_amount: order.total_amount as number || 0,
        created_at: order.created_at as string || new Date().toISOString(),
        estimated_delivery: latestShipment.estimated_delivery as string || null,
        shipping_address: order.shipping_address || { city: '', state: '', country: '' },
        production_stage: latestProduction.stage as string || 'Not Started',
        production_progress: latestProduction.progress as number || 0,
        item_count: orderItems.length,
        customer: customer,
        order_items: orderItems,
        production: production,
        shipment: shipments
      }
    })

    // Apply search filter if specified (done after transformation for better performance)
    let filteredOrders = transformedOrders
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filteredOrders = transformedOrders.filter((order: Record<string, unknown>) =>
        (order.order_number as string || '').toLowerCase().includes(term) ||
        (order.customer_name as string || '').toLowerCase().includes(term) ||
        (order.customer_email as string || '').toLowerCase().includes(term) ||
        (order.tracking_number as string || '').toLowerCase().includes(term)
      )
    }

    console.log('Order Tracking API: Success, returning', filteredOrders.length, 'orders')

    return NextResponse.json({
      success: true,
      data: filteredOrders,
      total: filteredOrders.length
    })

  } catch (error) {
    console.error('Order Tracking API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}