import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/collections/[id]
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

    // Get specific collection
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
      }
      throw error
    }

    // Map to frontend format
    const mappedCollection = {
      id: data.id,
      name: data.name,
      prefix: data.prefix || '',
      description: data.description || '',
      image_url: data.image_url || '',
      display_order: data.display_order || 1,
      is_active: data.is_active !== false,
      designer: data.metadata?.designer || '',
      created_at: data.created_at,
      updated_at: data.updated_at
    }

    return NextResponse.json({ success: true, data: mappedCollection })
  } catch (error) {
    console.error('Collections GET by ID error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    )
  }
}

// PUT /api/collections/[id]
export async function PUT(
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
      name: body.name,
      prefix: body.prefix,
      description: body.description,
      image_url: body.image_url || '',
      display_order: body.display_order || 1,
      is_active: body.is_active !== false,
      metadata: {
        designer: body.designer
      },
      updated_at: new Date().toISOString()
    }

    // Update collection
    const { data, error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
      }
      throw error
    }

    // Map response back to frontend format
    const mappedCollection = {
      id: data.id,
      name: data.name,
      prefix: data.prefix,
      description: data.description,
      image_url: data.image_url,
      display_order: data.display_order,
      is_active: data.is_active,
      designer: data.metadata?.designer || '',
      created_at: data.created_at,
      updated_at: data.updated_at
    }

    return NextResponse.json({ success: true, data: mappedCollection })
  } catch (error) {
    console.error('Collections PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check authentication - using getUser() for security
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete collection
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: 'Collection deleted successfully' })
  } catch (error) {
    console.error('Collections DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete collection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}