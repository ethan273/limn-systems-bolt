import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

/**
 * SIMPLIFIED PROJECTS API ROUTE
 * 
 * This replaces the complex version to restore functionality while debugging.
 */

export async function GET(request: NextRequest) {
  try {
    console.log('Projects API: Starting request')

    // Check user permissions
    const authResult = await requirePermissions(request, ['projects.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    // Parse query parameters
    const url = new URL(request.url)
    const clientId = url.searchParams.get('clientId')
    const search = url.searchParams.get('search')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log('Projects API: Query params', { clientId, search, limit, offset })

    // Build simple query
    let query = supabase
      .from('projects')
      .select('*')
      .range(offset, offset + limit - 1)

    // Apply filters if specified
    if (clientId) {
      query = query.eq('customer_id', clientId)  // Use customer_id instead of client_id
    }

    if (search) {
      query = query.or(`project_name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: projects, error } = await query

    if (error) {
      console.error('Projects query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch projects', details: error.message },
        { status: 500 }
      )
    }

    console.log('Projects API: Success, returning', projects?.length || 0, 'projects')

    return NextResponse.json({
      success: true,
      data: projects || [],
      total: projects?.length || 0
    })

  } catch (error) {
    console.error('Projects API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermissions(request, ['projects.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    if (!body.project_name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        project_name: body.project_name,
        description: body.description,
        customer_id: body.customer_id,
        status: body.status || 'planning',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Project creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create project', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: project
    })

  } catch (error) {
    console.error('Projects POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}