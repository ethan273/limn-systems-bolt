import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'
import { DesignerFormData } from '@/types/designer'

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['design.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Parse query parameters for filtering
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const specialty = url.searchParams.get('specialty')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Query designers table with basic info
    let query = supabase
      .from('designers')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Apply filters if specified
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (specialty && specialty !== 'all') {
      query = query.contains('specialties', [specialty])
    }

    // Note: rating filter removed as column doesn't exist in current schema

    const { data: designers, error } = await query

    if (error) {
      console.error('Designers query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch designers', details: error.message },
        { status: 500 }
      )
    }

    console.log('Designers API: Success, returning', designers?.length || 0, 'designers')

    return NextResponse.json({
      success: true,
      data: designers || [],
      total: designers?.length || 0
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['design.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

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

    // Check if designer with email already exists
    const { data: existingDesigner } = await supabase
      .from('designers')
      .select('id')
      .eq('contact_email', body.contact_email)
      .single()

    if (existingDesigner) {
      return NextResponse.json(
        { error: 'Designer with this email already exists' },
        { status: 409 }
      )
    }

    // Create designer
    const { data, error } = await supabase
      .from('designers')
      .insert({
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating designer:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}