import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

/**
 * SIMPLIFIED ITEMS API ROUTE
 */

export async function GET(request: NextRequest) {
  try {
    // Simple auth check (allow unauthenticated for product catalog)
    const supabase = await createServerSupabaseClient()
    
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const collectionId = searchParams.get('collection_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build simple query
    let query = supabase
      .from('items')
      .select(`
        *,
        collections (
          id,
          name
        )
      `)
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (collectionId && collectionId !== 'all') {
      query = query.eq('collection_id', collectionId)
    }

    const { data: items, error } = await query

    if (error) {
      console.error('Items query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch items', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: items || [],
      total: items?.length || 0
    })

  } catch (error) {
    console.error('Items API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermissions(request, ['products.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      )
    }

    const { data: item, error } = await supabase
      .from('items')
      .insert({
        name: body.name,
        description: body.description,
        category: body.category,
        collection_id: body.collection_id,
        base_price: body.base_price || 0,
        sku_base: body.sku_base,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Item creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create item', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: item
    })

  } catch (error) {
    console.error('Items POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}