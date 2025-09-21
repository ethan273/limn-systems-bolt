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

    // Get deals with comprehensive information
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deals: any[] = []
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          client,
          value,
          stage,
          probability,
          expected_close_date,
          assigned_to,
          created_at,
          updated_at,
          notes
        `)
        .order('updated_at', { ascending: false })

      if (error && error.code === 'PGRST205') {
        // Table doesn't exist yet - return database empty message
        console.log('Deals table not yet created. Database empty.')
        deals = []
      } else if (error) {
        console.error('Database error fetching deals:', error)
        // Return empty array on error - no fallback mock data
        deals = []
      } else {
        deals = data || []
      }
    } catch {
      console.log('Database connection issue. Database empty.')
      deals = []
    }

    return NextResponse.json({
      success: true,
      data: deals,
      count: deals.length
    })

  } catch (error) {
    console.error('Error fetching deals:', error)
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
    const { title, client, value, stage } = body
    
    if (!title || !client || value === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, client, value' 
      }, { status: 400 })
    }

    const dealData = {
      title,
      client,
      value: parseFloat(value),
      stage: stage || 'discovery',
      probability: body.probability || 25,
      expected_close_date: body.expected_close_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      assigned_to: body.assigned_to || user.email,
      notes: body.notes || ''
    }

    try {
      const { data, error } = await supabase
        .from('deals')
        .insert([dealData])
        .select()

      if (error) {
        console.error('Database error creating deal:', error)
        return NextResponse.json({ 
          error: 'Failed to create deal',
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: data[0],
        message: 'Deal created successfully'
      })
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: 'Please check database configuration'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}

