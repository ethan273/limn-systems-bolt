import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Log access
    await supabase
      .from('document_access_log')
      .insert({
        document_id: id,
        user_id: user.id,
        action: 'view',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve document', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
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

    const updates = await request.json()

    const allowedFields = [
      'display_name',
      'description',
      'category',
      'status',
      'tags',
      'metadata',
      'is_archived'
    ]

    const filteredUpdates: Record<string, unknown> = {}
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    })

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    filteredUpdates.updated_at = new Date().toISOString()
    filteredUpdates.updated_by = user.id

    const { data: currentDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('documents')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log update
    await supabase
      .from('document_access_log')
      .insert({
        document_id: id,
        user_id: user.id,
        action: 'update',
        metadata: { fields_updated: Object.keys(filteredUpdates) },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      data,
      message: 'Document updated successfully'
    })
  } catch (error) {
    console.error('Update document error:', error)
    return NextResponse.json(
      { error: 'Failed to update document', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
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

    const { data: document } = await supabase
      .from('documents')
      .select('id, name, file_path')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('documents')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    // Log deletion
    await supabase
      .from('document_access_log')
      .insert({
        document_id: id,
        user_id: user.id,
        action: 'delete',
        metadata: { document_name: document.name },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      message: `Document "${document.name}" deleted successfully`
    })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}