import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================================
// GET /api/factory-reviews
// List all factory review sessions with filters
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url)

    // Get query parameters
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build query - simplified for our current schema
    let query = supabase
      .from('factory_review_sessions')
      .select('*')
      .order('scheduled_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching factory review sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch review sessions' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('factory_review_sessions')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Unexpected error in factory-reviews GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/factory-reviews
// Create a new factory review session
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json()

    const {
      session_name,
      factory_name,
      scheduled_date,
      session_notes,
      prototype_count = 1
    } = body

    // Validate required fields
    if (!session_name || !factory_name || !scheduled_date) {
      return NextResponse.json(
        { error: 'Missing required fields: session_name, factory_name, scheduled_date' },
        { status: 400 }
      )
    }

    // Create the session with simplified schema
    const { data: session, error: sessionError } = await supabase
      .from('factory_review_sessions')
      .insert({
        session_name,
        factory_name,
        scheduled_date,
        prototype_count: prototype_count,
        session_notes,
        status: 'scheduled'
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating review session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create review session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Factory review session created successfully',
      session: session
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in factory-reviews POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
