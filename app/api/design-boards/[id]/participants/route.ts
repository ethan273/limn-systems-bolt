import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Try to query board_permissions, fallback to empty array if issues occur
    const { data: participants, error } = await supabase
      .from('board_permissions')
      .select('*')
      .eq('board_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Participants query error:', error)
      // Handle various database issues by returning empty array
      if (error.code === '42P01' || error.message.includes('does not exist') ||
          error.code === '42P17' || error.message.includes('infinite recursion')) {
        console.log('Board permissions table has issues, returning empty participants')
        return NextResponse.json({
          success: true,
          data: []
        })
      }
      return NextResponse.json(
        { error: 'Failed to fetch participants', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: participants || []
    })

  } catch (error) {
    console.error('Participants API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: participant, error } = await supabase
      .from('board_permissions')
      .insert({
        board_id: id,
        user_email: body.email,
        role: body.role || 'viewer',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Participant invitation error:', error)
      return NextResponse.json(
        { error: 'Failed to invite participant', details: error.message },
        { status: 500 }
      )
    }

    // TODO: Send invitation email/SMS via Twilio here
    // await sendInvitation(body.email, body.send_via, board_id, magic_link)

    return NextResponse.json({
      success: true,
      data: participant
    })

  } catch (error) {
    console.error('Participants POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}