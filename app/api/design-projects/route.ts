import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'
import { DesignProjectFormData } from '@/types/designer'

export async function GET(request: NextRequest) {
  try {
    console.log('Design Projects API: Starting request...')

    const authResult = await requirePermissions(request, ['design.read'])
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
    const priority = url.searchParams.get('priority')
    const stage = url.searchParams.get('stage')
    const designer_id = url.searchParams.get('designer_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log('Design Projects API: Query params', { status, priority, stage, designer_id, limit, offset })

    // Query design projects with proper filtering
    let query = supabase
      .from('design_projects')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Apply filters if specified
    if (status && status !== 'all') {
      query = query.eq('project_status', status)
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    if (stage && stage !== 'all') {
      query = query.eq('current_stage', stage)
    }

    if (designer_id) {
      query = query.eq('designer_id', designer_id)
    }

    const { data: projects, error } = await query

    if (error) {
      console.error('Design projects query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch design projects', details: error.message },
        { status: 500 }
      )
    }

    console.log('Design Projects API: Success, returning', projects?.length || 0, 'projects')

    return NextResponse.json({
      success: true,
      data: projects || [],
      total: projects?.length || 0
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Design Projects POST API: Starting request...')

    const authResult = await requirePermissions(request, ['design.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    const body: DesignProjectFormData = await request.json()

    // Validate required fields
    if (!body.project_name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    // Check if project code already exists (if provided)
    if (body.project_code) {
      const { data: existingProject } = await supabase
        .from('design_projects')
        .select('id')
        .eq('project_code', body.project_code)
        .single()

      if (existingProject) {
        return NextResponse.json(
          { error: 'Project code already exists' },
          { status: 409 }
        )
      }
    }


    // Create design project
    const { data, error } = await supabase
      .from('design_projects')
      .insert({
        project_name: body.project_name,
        project_code: body.project_code || null,
        current_stage: body.current_stage || 'brief_creation',
        priority: body.priority || 'normal',
        budget: body.budget || null,
        target_launch_date: body.target_launch_date || null,
        designer_name: body.designer_name || null,
        manufacturer_name: body.manufacturer_name || null,
        next_action: body.next_action || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating design project:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}