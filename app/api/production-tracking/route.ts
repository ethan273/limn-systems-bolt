import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['production.read'])
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
    const stage = url.searchParams.get('stage')
    const orderId = url.searchParams.get('order_id')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log('Production Tracking API: Query params', { status, stage, orderId, limit, offset })

    // Query production items with related data
    let query = supabase
      .from('production_items')
      .select(`
        *,
        order:orders(
          order_number,
          customer:customers(name)
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Apply filters if specified
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (stage && stage !== 'all') {
      query = query.eq('current_stage', stage)
    }

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data: items, error } = await query

    if (error) {
      console.error('Production tracking query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch production tracking data', details: error.message },
        { status: 500 }
      )
    }

    console.log('Production Tracking API: Success, returning', items?.length || 0, 'items')

    return NextResponse.json({
      success: true,
      data: items || [],
      total: items?.length || 0
    })

  } catch (error) {
    console.error('Production Tracking API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['production.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Add fields that can be updated
    if (body.status !== undefined) updateData.status = body.status
    if (body.current_stage !== undefined) updateData.current_stage = body.current_stage
    if (body.completion_percentage !== undefined) updateData.completion_percentage = body.completion_percentage
    if (body.estimated_completion !== undefined) updateData.estimated_completion = body.estimated_completion

    const { data: item, error } = await supabase
      .from('production_items')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Production tracking update error:', error)
      return NextResponse.json(
        { error: 'Failed to update production tracking item', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: item
    })

  } catch (error) {
    console.error('Production Tracking PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}