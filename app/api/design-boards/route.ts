import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: boards, error } = await supabase
      .from('design_boards')
      .select(`
        id,
        name,
        description,
        status,
        created_at,
        updated_at,
        created_by,
        is_public,
        thumbnail
      `)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Design boards query error:', error)
      console.log('Tables may not exist yet, returning empty data')

      // Return empty data instead of error if tables don't exist
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Transform the data to include participants count
    const transformedBoards = boards?.map((board: { participants?: { count: number }[] }) => ({
      ...board,
      participants_count: board.participants?.[0]?.count || 0
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedBoards
    })

  } catch (error) {
    console.error('Design boards API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: board, error } = await supabase
      .from('design_boards')
      .insert({
        name: body.name,
        description: body.description,
        status: body.status || 'active',
        created_by: user.id,
        settings: {
          gridSize: 20,
          backgroundColor: '#f7f7f7',
          gridVisible: true,
          snapToGrid: true
        },
        is_template: false,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Board creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create board', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: board
    })

  } catch (error) {
    console.error('Design boards POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}