import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Add fields that can be updated
    if (body.status !== undefined) updateData.status = body.status
    if (body.quality_score !== undefined) updateData.quality_score = body.quality_score
    if (body.defects_found !== undefined) updateData.defects_found = body.defects_found
    if (body.defect_types !== undefined) updateData.defect_types = body.defect_types
    if (body.pass_fail !== undefined) updateData.pass_fail = body.pass_fail
    if (body.corrective_actions !== undefined) updateData.corrective_actions = body.corrective_actions
    if (body.reinspection_required !== undefined) updateData.reinspection_required = body.reinspection_required
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.photos !== undefined) updateData.photos = body.photos

    const { data: inspection, error } = await supabase
      .from('qc_inspections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('QC Inspection update error:', error)
      return NextResponse.json(
        { error: 'Failed to update QC inspection', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: inspection
    })

  } catch (error) {
    console.error('QC Inspections PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check user permissions
    const authResult = await requirePermissions(request, ['production.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: inspection, error } = await supabase
      .from('qc_inspections')
      .select(`
        *,
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
      .eq('id', id)
      .single()

    if (error) {
      console.error('QC Inspection fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch QC inspection', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: inspection
    })

  } catch (error) {
    console.error('QC Inspections GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}