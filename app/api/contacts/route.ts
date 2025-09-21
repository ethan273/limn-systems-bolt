/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['customers.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient();

    // Get contacts with comprehensive information
     
    let contacts: any[] = []
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          title,
          company,
          department,
          is_primary,
          source,
          status,
          tags,
          notes,
          linkedin_url,
          created_at,
          updated_at,
          last_contact_date,
          next_follow_up
        `)
        .order('created_at', { ascending: false })

      if (error && error.code === 'PGRST205') {
        // Table doesn't exist yet - return database empty message
        console.log('Contacts table not yet created. Database empty.')
        contacts = []
      } else if (error) {
        console.error('Database error fetching contacts:', error)
        // Return empty array on error - no fallback mock data
        contacts = []
      } else {
        contacts = data || []
      }
    } catch {
      console.log('Database connection issue. Database empty.')
      contacts = []
    }

    return NextResponse.json({
      success: true,
      data: contacts,
      count: contacts.length
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['customers.create'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }
    const { user: _user } = authResult
    
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    
    // Validate required fields
    const { first_name, last_name, email, company } = body
    
    if (!first_name || !last_name || !email || !company) {
      return NextResponse.json({
        error: 'Missing required fields: first_name, last_name, email, company'
      }, { status: 400 })
    }

    const contactData = {
      first_name,
      last_name,
      email,
      phone: body.phone || '',
      title: body.title || '',
      company,
      department: body.department || '',
      is_primary: body.is_primary || false,
      source: body.source || 'manual',
      status: body.status || 'active',
      tags: body.tags || [],
      notes: body.notes || '',
      linkedin_url: body.linkedin_url || '',
      next_follow_up: body.next_follow_up || null
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()

      if (error) {
        return NextResponse.json({
          error: 'Failed to create contact',
          details: error.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: data[0],
        message: 'Contact created successfully'
      })
    } catch (_dbError) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: 'Please check database configuration'
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}

