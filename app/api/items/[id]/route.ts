import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/items/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get specific item
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        collections (
          id,
          name,
          prefix
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Items GET by ID error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    )
  }
}

// PATCH /api/items/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body
    const body = await request.json()

    // Map frontend fields to database columns
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    }

    // Update item
    const { data, error } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        collections (
          id,
          name,
          prefix
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Items PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

// PUT /api/items/[id] (alias for PATCH)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params })
}

// DELETE /api/items/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete item
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Items DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}