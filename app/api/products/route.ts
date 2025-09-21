import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

/**
 * PRODUCTS API ROUTE
 * 
 * Products are items that have been ordered by customers with specific material selections.
 * This differs from Items which are the base catalog.
 */

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['orders.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    // Query order_items with all related data to build full product SKUs
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        item_id,
        quantity,
        unit_price,
        material_selections,
        custom_specifications,
        sku_full,
        client_sku,
        created_at,
        orders (
          id,
          order_number,
          status,
          customer_id,
          created_at,
          customers (
            id,
            name,
            company_name
          )
        ),
        items (
          id,
          name,
          sku,
          base_price,
          description,
          dimensions,
          collections (
            id,
            name,
            prefix
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Products query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products', details: error.message },
        { status: 500 }
      )
    }

    // Transform the data for the frontend
    const transformedProducts = (orderItems || []).map((orderItem: unknown) => {
      const item = orderItem as Record<string, unknown>
      const order = item.orders as Record<string, unknown> | undefined
      const customer = order?.customers as Record<string, unknown> | undefined
      const baseItem = item.items as Record<string, unknown> | undefined
      const collection = (baseItem?.collections as Record<string, unknown> | undefined)
      const materialSelections = item.material_selections as Record<string, unknown> | undefined

      // Generate Full SKU from base SKU + materials
      const baseSku = String(baseItem?.sku) || 'UNKNOWN'
      const materialCodes: string[] = []

      if (materialSelections) {
        // Add material codes based on selections
        if (materialSelections.fabric) {
          const fabricCode = String(materialSelections.fabric).substring(0, 3).toUpperCase() + '-FAB'
          materialCodes.push(fabricCode)
        }
        if (materialSelections.wood) {
          const woodCode = String(materialSelections.wood).substring(0, 3).toUpperCase() + '-WOD'
          materialCodes.push(woodCode)
        }
        if (materialSelections.metal) {
          const metalCode = String(materialSelections.metal).substring(0, 3).toUpperCase() + '-MET'
          materialCodes.push(metalCode)
        }
        if (materialSelections.stone) {
          const stoneCode = String(materialSelections.stone).substring(0, 3).toUpperCase() + '-STN'
          materialCodes.push(stoneCode)
        }
        if (materialSelections.weave) {
          const weaveCode = String(materialSelections.weave).substring(0, 3).toUpperCase() + '-WVE'
          materialCodes.push(weaveCode)
        }
        if (materialSelections.carving) {
          const carvingCode = String(materialSelections.carving).substring(0, 3).toUpperCase() + '-CRV'
          materialCodes.push(carvingCode)
        }
      }

      let fullSku = baseSku
      if (materialCodes.length > 0) {
        fullSku += '-' + materialCodes.join('-')
      }

      // Generate Client SKU (Unique client/project identifier)
      const customerCode = String(customer?.company_name || customer?.name || '').substring(0, 3).toUpperCase()
      const orderNumber = String(order?.order_number) || `ORD-${item.order_id}`
      const clientSku = customerCode ? `${customerCode}-${orderNumber}-${String(item.id).slice(-4)}` : `CLT-${orderNumber}-${String(item.id).slice(-4)}`

      return {
        id: String(item.id),
        order_id: String(item.order_id),
        order_number: String(order?.order_number) || `ORD-${item.order_id}`,
        item_name: String(baseItem?.name) || 'Unknown Item',
        collection_name: String(collection?.name || '') || 'General',
        base_sku: baseSku,
        sku_full: String(item.sku_full) || fullSku, // Use stored full SKU or generate
        client_sku: String(item.client_sku) || clientSku, // Use stored client SKU or generate
        customer_name: String(customer?.company_name || customer?.name) || 'Unknown Customer',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || Number(baseItem?.base_price) || 0,
        total_price: (Number(item.quantity) || 1) * (Number(item.unit_price) || Number(baseItem?.base_price) || 0),
        status: String(order?.status) || 'pending',
        is_rush: false, // Could be derived from order priority
        materials: materialSelections || {},
        dimensions: baseItem?.dimensions || {},
        custom_specifications: String(item.custom_specifications) || undefined,
        created_at: String(item.created_at)
      }
    })

    const response = NextResponse.json({
      success: true,
      data: transformedProducts,
      total: transformedProducts.length
    })

    // Add cache-control headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['orders.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Prepare update data for order_items table
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Add fields that can be updated
    if (body.custom_specifications !== undefined) updateData.custom_specifications = body.custom_specifications
    if (body.dimensions !== undefined) updateData.dimensions = body.dimensions

    const { data: orderItem, error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Products update error:', error)
      return NextResponse.json(
        { error: 'Failed to update product', details: error.message },
        { status: 500 }
      )
    }

    // If status is being updated, update the order status as well
    if (body.status !== undefined) {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: body.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderItem.order_id)

      if (orderError) {
        console.warn('Warning: Failed to update order status:', orderError)
      }
    }

    return NextResponse.json({
      success: true,
      data: orderItem
    })

  } catch (error) {
    console.error('Products PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['orders.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Products delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete product', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })

  } catch (error) {
    console.error('Products DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}