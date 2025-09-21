import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermissions(request, ['customers.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid lead ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    if (error) {
      console.error('Database error fetching lead:', error)
      return NextResponse.json({
        error: 'Failed to fetch lead',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermissions(request, ['customers.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid lead ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Remove id and created_at from updates
    const { id: bodyId, created_at, ...updateData } = body
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _unused = { bodyId, created_at }
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error && error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    if (error) {
      console.error('Database error updating lead:', error)
      return NextResponse.json({
        error: 'Failed to update lead',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Lead updated successfully'
    })

  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermissions(request, ['customers.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid lead ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error deleting lead:', error)
      return NextResponse.json({
        error: 'Failed to delete lead',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}