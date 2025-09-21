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
        { error: 'Valid contact ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (error) {
      console.error('Database error fetching contact:', error)
      return NextResponse.json({
        error: 'Failed to fetch contact',
        details: error.message
      }, { status: 500 })
    }

    const contact = {
      ...data,
      company: data.company_name,
      title: data.type,
      industry: 'General',
      relationship_stage: 'prospect',
      lifetime_value: 0,
      last_interaction: data.updated_at || data.created_at
    }

    return NextResponse.json({
      success: true,
      data: contact
    })

  } catch (error) {
    console.error('Error fetching contact:', error)
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
        { error: 'Valid contact ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Map contact fields to customer table fields
    const updateData: Record<string, unknown> = {}
    if (body.name) updateData.name = body.name
    if (body.email) updateData.email = body.email
    if (body.phone) updateData.phone = body.phone
    if (body.company) updateData.company_name = body.company
    if (body.title) updateData.type = body.title
    if (body.address) updateData.address = body.address

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error && error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (error) {
      console.error('Database error updating contact:', error)
      return NextResponse.json({
        error: 'Failed to update contact',
        details: error.message
      }, { status: 500 })
    }

    const updatedContact = {
      ...data,
      company: data.company_name,
      title: data.type,
      industry: body.industry || 'General',
      relationship_stage: body.relationship_stage || 'prospect',
      lifetime_value: body.lifetime_value || 0,
      last_interaction: data.updated_at
    }

    return NextResponse.json({
      success: true,
      data: updatedContact,
      message: 'Contact updated successfully'
    })

  } catch (error) {
    console.error('Error updating contact:', error)
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
        { error: 'Valid contact ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error deleting contact:', error)
      return NextResponse.json({
        error: 'Failed to delete contact',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}