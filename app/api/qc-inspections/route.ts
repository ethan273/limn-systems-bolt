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
    const orderId = url.searchParams.get('order_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log('QC Inspections API: Query params', { status, orderId, limit, offset })

    // Query QC inspections with related data
    let query = supabase
      .from('qc_inspections')
      .select(`
        id,
        order_id,
        item_id,
        inspector_name,
        inspection_date,
        inspection_type,
        status,
        quality_score,
        defects_found,
        defect_types,
        pass_fail,
        corrective_actions,
        reinspection_required,
        notes,
        photos,
        created_at,
        updated_at,
        orders (
          id,
          order_number,
          customer_id
        ),
        items (
          id,
          name,
          sku_base
        )
      `)
      .range(offset, offset + limit - 1)
      .order('inspection_date', { ascending: false })

    // Apply filters if specified
    if (status) {
      query = query.eq('status', status)
    }

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data: inspections, error } = await query

    if (error) {
      console.error('QC Inspections query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch QC inspections', details: error.message },
        { status: 500 }
      )
    }

    console.log('QC Inspections API: Success, returning', inspections?.length || 0, 'inspections')

    return NextResponse.json({
      success: true,
      data: inspections || [],
      total: inspections?.length || 0
    })

  } catch (error) {
    console.error('QC Inspections API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    if (!body.order_id || !body.item_id || !body.inspector_name) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, item_id, inspector_name' },
        { status: 400 }
      )
    }

    const inspectionData = {
      order_id: body.order_id,
      item_id: body.item_id,
      inspector_name: body.inspector_name,
      inspection_date: body.inspection_date || new Date().toISOString(),
      inspection_type: body.inspection_type || 'quality_check',
      status: body.status || 'pending',
      quality_score: body.quality_score || null,
      defects_found: body.defects_found || 0,
      defect_types: body.defect_types || [],
      pass_fail: body.pass_fail || null,
      corrective_actions: body.corrective_actions || '',
      reinspection_required: body.reinspection_required || false,
      notes: body.notes || '',
      photos: body.photos || [],
      created_at: new Date().toISOString()
    }

    const { data: inspection, error } = await supabase
      .from('qc_inspections')
      .insert(inspectionData)
      .select()
      .single()

    if (error) {
      console.error('QC Inspection creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create QC inspection', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: inspection
    })

  } catch (error) {
    console.error('QC Inspections POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}