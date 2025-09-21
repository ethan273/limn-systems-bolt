import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer ID
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('client_files')
      .select(`
        id,
        file_name,
        file_type,
        file_size,
        file_url,
        category,
        version,
        created_at,
        notes,
        uploaded_by
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`file_name.ilike.%${search}%,notes.ilike.%${search}%,category.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: documents, error: docsError } = await query

    if (docsError) {
      console.error('Documents fetch error:', docsError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('client_files')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category)
    }

    if (search) {
      countQuery = countQuery.or(`file_name.ilike.%${search}%,notes.ilike.%${search}%,category.ilike.%${search}%`)
    }

    const { count } = await countQuery

    return NextResponse.json({
      success: true,
      documents: documents || [],
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit
    })

  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}