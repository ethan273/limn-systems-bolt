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
        { error: 'Valid client ID is required' },
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
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (error) {
      console.error('Database error fetching client:', error)
      return NextResponse.json({
        error: 'Failed to fetch client',
        details: error.message
      }, { status: 500 })
    }

    const client = {
      ...data,
      company: data.company_name
    }

    return NextResponse.json({
      success: true,
      data: client
    })

  } catch (error) {
    console.error('Error fetching client:', error)
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
        { error: 'Valid client ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Map client fields to customer table fields
    const updateData: Record<string, unknown> = {}
    if (body.name) updateData.name = body.name
    if (body.email) updateData.email = body.email
    if (body.phone) updateData.phone = body.phone
    if (body.company) updateData.company_name = body.company
    if (body.type) updateData.type = body.type
    if (body.address) updateData.address = body.address
    if (body.status) updateData.status = body.status

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error && error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (error) {
      console.error('Database error updating client:', error)
      return NextResponse.json({
        error: 'Failed to update client',
        details: error.message
      }, { status: 500 })
    }

    const updatedClient = {
      ...data,
      company: data.company_name
    }

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Client updated successfully'
    })

  } catch (error) {
    console.error('Error updating client:', error)
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
        { error: 'Valid client ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error deleting client:', error)
      return NextResponse.json({
        error: 'Failed to delete client',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}