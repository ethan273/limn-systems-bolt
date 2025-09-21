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

    const supabase = await createServerSupabaseClient()

    // Get leads with comprehensive information
    let leads: unknown[] = []
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          company,
          email,
          phone,
          status,
          source,
          value,
          assigned_to,
          created_at,
          last_contact,
          next_followup,
          notes
        `)
        .order('created_at', { ascending: false })

      if (error && error.code === 'PGRST205') {
        // Table doesn't exist yet - return database empty message
        console.log('Leads table not yet created. Database empty.')
        leads = []
      } else if (error) {
        console.error('Database error fetching leads:', error)
        // Return empty array on error - no fallback mock data
        leads = []
      } else {
        leads = data || []
      }
    } catch {
      console.log('Database connection issue. Database empty.')
      leads = []
    }

    return NextResponse.json({
      success: true,
      data: leads,
      count: leads.length
    })

  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['customers.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }
    const { user } = authResult
    if (!user) {
      return NextResponse.json(
        { error: 'User context required' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    
    // Validate required fields
    const { name, company, email, status, source, value, assigned_to } = body
    
    if (!name || !company || !email) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, company, email' 
      }, { status: 400 })
    }

    const leadData = {
      name,
      company,
      email,
      phone: body.phone || '',
      status: status || 'new',
      source: source || 'manual',
      value: value || 0,
      assigned_to: assigned_to || user.email,
      last_contact: new Date().toISOString(),
      next_followup: body.next_followup || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      notes: body.notes || ''
    }

    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()

      if (error) {
        console.error('Database error creating lead:', error)
        return NextResponse.json({ 
          error: 'Failed to create lead',
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: data[0],
        message: 'Lead created successfully'
      })
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: 'Please check database configuration'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}

