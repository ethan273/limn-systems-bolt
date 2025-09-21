import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DesignBriefFormData } from '@/types/designer'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('design_briefs')
      .select(`
        *,
        design_projects (
          id,
          project_name,
          project_code,
          current_stage,
          priority,
          designers (
            id,
            name,
            contact_email
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Design brief not found' }, { status: 404 })
      }
      console.error('Error fetching design brief:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const body: DesignBriefFormData = await request.json()

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Update design brief
    const { data, error } = await supabase
      .from('design_briefs')
      .update({
        title: body.title,
        description: body.description || null,
        target_market: body.target_market || null,
        price_point_min: body.price_point_min || null,
        price_point_max: body.price_point_max || null,
        materials_preference: body.materials_preference || [],
        style_references: body.style_references || [],
        functional_requirements: body.functional_requirements || null,
        dimensional_constraints: body.dimensional_constraints || {},
        sustainability_requirements: body.sustainability_requirements || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Design brief not found' }, { status: 404 })
      }
      console.error('Error updating design brief:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check if brief is approved (might want to prevent deletion)
    const { data: brief, error: fetchError } = await supabase
      .from('design_briefs')
      .select('approved_date, design_projects(current_stage)')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Design brief not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (brief.approved_date && brief.design_projects?.length > 0 && brief.design_projects[0]?.current_stage !== 'brief_creation') {
      return NextResponse.json(
        { error: 'Cannot delete approved brief after project has progressed' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('design_briefs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting design brief:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Design brief deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Approve or reject a design brief
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const body: { action: 'approve' | 'reject'; comments?: string } = await request.json()

    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Check if brief exists
    const { data: brief, error: fetchError } = await supabase
      .from('design_briefs')
      .select('id, approved_date, design_project_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Design brief not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (brief.approved_date) {
      return NextResponse.json(
        { error: 'Brief has already been approved' },
        { status: 409 }
      )
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (body.action === 'approve') {
      updateData.approved_date = new Date().toISOString()
      // Could add approved_by field with user ID if auth is implemented
      
      // Update project stage to next stage
      await supabase
        .from('design_projects')
        .update({ 
          current_stage: 'designer_review',
          updated_at: new Date().toISOString() 
        })
        .eq('id', brief.design_project_id)
    }

    const { data, error } = await supabase
      .from('design_briefs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating design brief:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}