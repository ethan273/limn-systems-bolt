import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { participantId } = await params
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

    const updates: Record<string, unknown> = {}

    if (body.access_granted !== undefined) {
      updates.access_granted = body.access_granted
    }

    if (body.role !== undefined) {
      updates.role = body.role
    }

    const { data: participant, error } = await supabase
      .from('board_permissions')
      .update(updates)
      .eq('id', participantId)
      .select()
      .single()

    if (error) {
      console.error('Participant update error:', error)
      return NextResponse.json(
        { error: 'Failed to update participant', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: participant
    })

  } catch (error) {
    console.error('Participant PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { participantId } = await params
    const supabase = await createServerSupabaseClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('board_permissions')
      .delete()
      .eq('id', participantId)

    if (error) {
      console.error('Participant deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete participant', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Participant removed successfully'
    })

  } catch (error) {
    console.error('Participant DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}