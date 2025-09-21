import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
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
    const designer = url.searchParams.get('designer')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log('Design Tracker API: Query params', { status, priority, designer, limit, offset })

    // Query design projects for tracking
    let query = supabase
      .from('design_projects')
      .select(`
        id,
        project_name,
        designer_name,
        current_stage,
        priority,
        budget,
        target_launch_date,
        manufacturer_name,
        created_at,
        updated_at
      `)
      .range(offset, offset + limit - 1)
      .order('updated_at', { ascending: false })

    // Apply filters if specified
    if (status && status !== 'all') {
      query = query.eq('current_stage', status)
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    if (designer && designer !== 'all') {
      query = query.eq('designer_name', designer)
    }

    const { data: projects, error } = await query

    if (error) {
      console.error('Design tracker query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch design tracking data', details: error.message },
        { status: 500 }
      )
    }

    // Transform data to match the frontend interface
    const transformedProjects = (projects || []).map((project: Record<string, unknown>) => ({
      id: project.id as string,
      project_name: project.project_name as string || '',
      designer: project.designer_name as string || 'Unassigned',
      status: (project.current_stage as string || 'concept') as 'concept' | 'in_progress' | 'review' | 'approved' | 'production',
      priority: (project.priority as string || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
      client: 'Client Name', // Would need to join with clients/customers table
      deadline: project.target_launch_date as string || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: project.created_at as string || new Date().toISOString(),
      updated_at: project.updated_at as string || new Date().toISOString(),
      revision_count: Math.floor(Math.random() * 5) + 1, // Mock data - would calculate from revisions table
      description: `Design project for ${project.project_name}` // Mock description
    }))

    console.log('Design Tracker API: Success, returning', transformedProjects.length, 'projects')

    return NextResponse.json({
      success: true,
      data: transformedProjects,
      total: transformedProjects.length
    })

  } catch (error) {
    console.error('Design Tracker API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['design.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate required fields
    if (!body.project_name || !body.designer) {
      return NextResponse.json(
        { error: 'Missing required fields: project_name, designer' },
        { status: 400 }
      )
    }

    // Create design project for tracking
    const { data: project, error } = await supabase
      .from('design_projects')
      .insert({
        project_name: body.project_name,
        designer_name: body.designer,
        current_stage: body.status || 'concept',
        priority: body.priority || 'medium',
        target_launch_date: body.deadline || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Design tracker creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create design project', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: project
    })

  } catch (error) {
    console.error('Design Tracker POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}