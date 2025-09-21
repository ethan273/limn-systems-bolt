import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DesignerFormData } from '@/types/designer'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('designers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Designer not found' }, { status: 404 })
      }
      console.error('Error fetching designer:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const body: DesignerFormData = await request.json()

    // Validate required fields
    if (!body.name || !body.contact_email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.contact_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if another designer with this email exists
    const { data: existingDesigner } = await supabase
      .from('designers')
      .select('id')
      .eq('contact_email', body.contact_email)
      .neq('id', id)
      .single()

    if (existingDesigner) {
      return NextResponse.json(
        { error: 'Another designer with this email already exists' },
        { status: 409 }
      )
    }

    // Update designer
    const { data, error } = await supabase
      .from('designers')
      .update({
        name: body.name,
        company_name: body.company_name || null,
        contact_email: body.contact_email,
        phone: body.phone || null,
        website: body.website || null,
        portfolio_url: body.portfolio_url || null,
        specialties: body.specialties,
        design_style: body.design_style,
        hourly_rate: body.hourly_rate || null,
        currency: body.currency || 'USD',
        status: body.status || 'prospect',
        years_experience: body.years_experience || null,
        certifications: body.certifications,
        notes: body.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Designer not found' }, { status: 404 })
      }
      console.error('Error updating designer:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check if designer has active projects
    const { data: activeProjects } = await supabase
      .from('design_projects')
      .select('id')
      .eq('designer_id', id)
      .not('current_stage', 'in', '(cancelled,approved_for_prototype)')

    if (activeProjects && activeProjects.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete designer with active projects' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('designers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting designer:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Designer deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}