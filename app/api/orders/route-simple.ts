import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

/**
 * SIMPLIFIED ORDERS API ROUTE
 * 
 * This is a simplified version to restore functionality while debugging
 * the complex middleware systems. Will be replaced once issues resolved.
 */

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
    
    // Simple query to get orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        status,
        customer_id,
        created_at,
        customers (
          id,
          name,
          company_name
        )
      `)
      .limit(50)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Orders query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
      total: orders?.length || 0
    })

  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['orders.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Basic validation
    if (!body.customer_id || !body.total_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: body.customer_id,
        total_amount: body.total_amount,
        status: body.status || 'draft',
        order_number: `ORD-${Date.now()}`, // Simple order number generation
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Order creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create order', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: order
    })

  } catch (error) {
    console.error('Orders POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}