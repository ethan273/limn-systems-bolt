import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DesignProjectFormData } from '@/types/designer'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Get project with related data
    const { data, error } = await supabase
      .from('design_projects')
      .select(`
        *,
        designers (*),
        design_briefs (*),
        design_deliverables (*),
        design_revisions (*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Design project not found' }, { status: 404 })
      }
      console.error('Error fetching design project:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const body: Partial<DesignProjectFormData & { current_stage: string }> = await request.json()

    // Validate project exists
    const { data: existingProject, error: fetchError } = await supabase
      .from('design_projects')
      .select('id, project_code')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Design project not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Check if project code already exists (if being updated)
    if (body.project_code && body.project_code !== existingProject.project_code) {
      const { data: codeExists } = await supabase
        .from('design_projects')
        .select('id')
        .eq('project_code', body.project_code)
        .neq('id', id)
        .single()

      if (codeExists) {
        return NextResponse.json(
          { error: 'Project code already exists' },
          { status: 409 }
        )
      }
    }

    // Validate designer exists (if provided)
    if (body.designer_id) {
      const { data: designer, error: designerError } = await supabase
        .from('designers')
        .select('id')
        .eq('id', body.designer_id)
        .single()

      if (designerError || !designer) {
        return NextResponse.json(
          { error: 'Invalid designer ID' },
          { status: 400 }
        )
      }
    }

    // Update design project
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Only update fields that were provided
    if (body.project_name) updateData.project_name = body.project_name
    if (body.project_code !== undefined) updateData.project_code = body.project_code
    if (body.designer_id !== undefined) updateData.designer_id = body.designer_id
    if (body.collection_id !== undefined) updateData.collection_id = body.collection_id
    if (body.project_type) updateData.project_type = body.project_type
    if (body.current_stage) updateData.current_stage = body.current_stage
    if (body.target_launch_date !== undefined) updateData.target_launch_date = body.target_launch_date
    if (body.budget !== undefined) updateData.budget = body.budget
    if (body.priority) updateData.priority = body.priority

    const { data, error } = await supabase
      .from('design_projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating design project:', error)
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
  return PATCH(request, { params })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check if project can be deleted (not in certain stages)
    const { data: project, error: fetchError } = await supabase
      .from('design_projects')
      .select('current_stage')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Design project not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (project.current_stage === 'approved_for_prototype') {
      return NextResponse.json(
        { error: 'Cannot delete project that has been approved for prototype' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('design_projects')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting design project:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Design project deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}