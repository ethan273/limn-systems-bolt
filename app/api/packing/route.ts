import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

/**
 * PACKING JOBS API ROUTE
 * 
 * Handles packing workflow data including jobs, statuses, and assignments
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
    
    // Query packing jobs with all related data
    const { data: packingJobs, error } = await supabase
      .from('packing_jobs')
      .select(`
        id,
        order_id,
        order_item_id,
        quantity,
        packed_quantity,
        packing_status,
        priority,
        box_count,
        total_weight,
        special_instructions,
        packed_date,
        tracking_number,
        created_at,
        updated_at,
        orders (
          id,
          order_number,
          status,
          priority,
          created_at,
          customers (
            id,
            name,
            company_name
          )
        ),
        order_items (
          id,
          quantity,
          unit_price,
          items (
            id,
            name,
            description,
            dimensions,
            weight_lbs
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Packing jobs query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch packing jobs', details: error.message },
        { status: 500 }
      )
    }

    // Transform the data for the frontend
    const transformedJobs = (packingJobs || []).map((job: unknown) => {
      const jobData = job as Record<string, unknown>
      const order = jobData.orders as Record<string, unknown> | undefined
      const customer = order?.customers as Record<string, unknown> | undefined
      const orderItem = jobData.order_items as Record<string, unknown> | undefined
      const item = orderItem?.items as Record<string, unknown> | undefined

      // Calculate weights
      const itemWeightLbs = Number(item?.weight_lbs) || 0
      const itemWeightKg = itemWeightLbs * 0.453592 // Convert lbs to kg
      const totalQuantity = Number(jobData.quantity) || Number(orderItem?.quantity) || 1
      const totalWeightLbs = itemWeightLbs * totalQuantity
      const totalWeightKg = totalWeightLbs * 0.453592

      return {
        id: String(jobData.id),
        order_id: String(jobData.order_id),
        order_number: String(order?.order_number) || `ORD-${jobData.order_id}`,
        item_name: String(item?.name) || 'Unknown Item',
        quantity: Number(jobData.quantity) || Number(orderItem?.quantity) || 1,
        packed_quantity: Number(jobData.packed_quantity) || 0,
        box_count: Number(jobData.box_count) || 0,
        total_weight: Number(jobData.total_weight) || totalWeightLbs, // Use calculated weight if not set
        weight_lbs: Math.round(totalWeightLbs * 100) / 100, // Round to 2 decimal places
        weight_kg: Math.round(totalWeightKg * 100) / 100,   // Round to 2 decimal places
        unit_weight_lbs: Math.round(itemWeightLbs * 100) / 100,
        unit_weight_kg: Math.round(itemWeightKg * 100) / 100,
        dimensions: String(item?.dimensions) || '0" x 0" x 0"',
        packing_status: String(jobData.packing_status) || 'pending',
        packer_assigned: 'Production Team', // Would come from user lookup in future
        customer_name: String(customer?.name) || String(customer?.company_name) || 'Unknown Customer',
        shipping_method: 'Standard Freight', // Default for now
        special_instructions: String(jobData.special_instructions) || undefined,
        packed_date: String(jobData.packed_date) || undefined,
        tracking_number: String(jobData.tracking_number) || undefined,
        priority: String(jobData.priority) || String(order?.priority) || 'normal',
        created_at: String(jobData.created_at)
      }
    })

    const response = NextResponse.json({
      success: true,
      data: transformedJobs,
      total: transformedJobs.length
    })

    // Add cache-control headers to prevent stale data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Packing API error:', error)
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
    if (!body.order_id) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id' },
        { status: 400 }
      )
    }

    const { data: packingJob, error } = await supabase
      .from('packing_jobs')
      .insert({
        order_id: body.order_id,
        order_item_id: body.order_item_id,
        quantity: body.quantity || 1,
        packed_quantity: body.packed_quantity || 0,
        packing_status: body.packing_status || 'pending',
        priority: body.priority || 'normal',
        box_count: body.box_count || 0,
        total_weight: body.total_weight || 0,
        special_instructions: body.special_instructions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Packing job creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create packing job', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: packingJob
    })

  } catch (error) {
    console.error('Packing POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}