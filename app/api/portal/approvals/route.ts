import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'completed', or 'all'

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get customer ID
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check if design approval is enabled
    const { data: portalSettings } = await supabase
      .from('portal_settings')
      .select('allow_design_approval')
      .eq('customer_id', customer.id)
      .single()

    if (!portalSettings?.allow_design_approval) {
      return NextResponse.json(
        { error: 'Design approval access not enabled' },
        { status: 403 }
      )
    }

    // Build query based on status filter
    let query = supabase
      .from('design_approvals')
      .select(`
        id,
        title,
        description,
        status,
        reviewer_notes,
        created_at,
        updated_at,
        design_file:design_files(
          id,
          file_url,
          thumbnail_url,
          file_name,
          version,
          uploaded_at
        ),
        order:orders(
          id,
          order_number
        )
      `)
      .eq('customer_id', customer.id)

    // Filter by status
    if (status === 'pending') {
      query = query.in('status', ['pending', 'reviewing'])
    } else if (status === 'completed') {
      query = query.in('status', ['approved', 'rejected'])
    }

    const { data: approvals, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching approvals:', error)
      return NextResponse.json(
        { error: 'Failed to fetch approvals' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      approvals: approvals || [],
      settings: {
        allow_design_approval: true
      }
    })

  } catch (error) {
    console.error('Error in approvals API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}