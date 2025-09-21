import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'
import { DesignBriefFormData } from '@/types/designer'

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
    const project_id = url.searchParams.get('project_id')
    const approved = url.searchParams.get('approved')
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Query design briefs with related data
    let query = supabase
      .from('design_briefs')
      .select(`
        *,
        design_projects (
          id,
          project_name,
          project_code,
          priority,
          designers (
            id,
            name
          )
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Apply filters if specified
    if (project_id) {
      query = query.eq('design_project_id', project_id)
    }

    if (approved === 'true') {
      query = query.not('approved_date', 'is', null)
    } else if (approved === 'false') {
      query = query.is('approved_date', null)
    }

    if (status && status !== 'all') {
      if (status === 'approved') {
        query = query.not('approved_date', 'is', null)
      } else if (status === 'draft') {
        query = query.is('approved_date', null)
      }
    }

    if (priority && priority !== 'all') {
      query = query.eq('design_projects.priority', priority)
    }

    const { data: briefs, error } = await query

    if (error) {
      console.error('Design briefs query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch design briefs', details: error.message },
        { status: 500 }
      )
    }

    // Transform data to match frontend interface
    const transformedBriefs = (briefs || []).map((brief: Record<string, unknown>) => {
      const designProject = brief.design_projects as Record<string, unknown> | null
      const designer = designProject?.designers as Record<string, unknown> | null

      return {
        ...brief,
        project_name: designProject?.project_name || null,
        project_code: designProject?.project_code || null,
        project_priority: designProject?.priority || null,
        designer_name: designer?.name || null
      }
    })

    console.log('Design Briefs API: Success, returning', transformedBriefs.length, 'briefs')

    return NextResponse.json({
      success: true,
      data: transformedBriefs,
      total: transformedBriefs.length
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const body: DesignBriefFormData & { design_project_id: string } = await request.json()

    // Validate required fields
    if (!body.title || !body.design_project_id) {
      return NextResponse.json(
        { error: 'Title and design project ID are required' },
        { status: 400 }
      )
    }

    // Validate project exists
    const { data: project, error: projectError } = await supabase
      .from('design_projects')
      .select('id')
      .eq('id', body.design_project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Invalid design project ID' },
        { status: 400 }
      )
    }

    // Check if brief already exists for this project
    const { data: existingBrief } = await supabase
      .from('design_briefs')
      .select('id')
      .eq('design_project_id', body.design_project_id)
      .single()

    if (existingBrief) {
      return NextResponse.json(
        { error: 'Design brief already exists for this project' },
        { status: 409 }
      )
    }

    // Create design brief
    const { data, error } = await supabase
      .from('design_briefs')
      .insert({
        design_project_id: body.design_project_id,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating design brief:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}