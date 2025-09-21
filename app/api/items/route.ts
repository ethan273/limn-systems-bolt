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

    // Validate and sanitize input parameters
    const search = searchParams.get('search')?.trim().substring(0, 100) || undefined
    const category = searchParams.get('category')?.trim().substring(0, 50) || undefined
    const collectionId = searchParams.get('collection_id')?.trim() || undefined
    const status = searchParams.get('status')?.trim().substring(0, 50) || undefined
    const type = searchParams.get('type')?.trim().substring(0, 50) || undefined
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Build simple query with standardized SKU fields
    let query = supabase
      .from('items')
      .select(`
        id,
        name,
        collection_id,
        base_price,
        description,
        sku_base,
        sku,
        client_sku,
        project_sku,
        dimensions,
        status,
        is_active,
        created_at,
        type,
        prototype_status,
        project_manager,
        prototype_cost,
        assigned_manufacturer_id,
        target_completion,
        prototype_notes,
        prototype_started_at,
        prototype_completed_at,
        collections (
          id,
          name,
          prefix
        )
      `)
      .range(offset, offset + limit - 1)

    // Apply filters with proper parameterization
    if (search) {
      const searchTerm = `%${search.replace(/[%_]/g, '\\$&')}%`
      query = query.or(`name.ilike."${searchTerm}",description.ilike."${searchTerm}"`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (collectionId && collectionId !== 'all') {
      query = query.eq('collection_id', collectionId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('type', type)
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
    const authResult = await requirePermissions(request, ['products.create'])
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
        sku_base: body.sku_base, // Base product SKU (required)
        sku: body.sku, // Full SKU with materials (optional, generated later)
        client_sku: body.client_sku, // Client-specific tracking ID (optional)
        project_sku: body.project_sku, // Project-level grouping (optional)
        type: body.type || 'Concept', // Default to Concept
        prototype_status: body.prototype_status || 'not_started',
        project_manager: body.project_manager,
        prototype_cost: body.prototype_cost,
        assigned_manufacturer_id: body.assigned_manufacturer_id,
        target_completion: body.target_completion,
        prototype_notes: body.prototype_notes,
        prototype_started_at: body.prototype_started_at,
        prototype_completed_at: body.prototype_completed_at,
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