import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/prototypes/[id]/promote
 * Promote an approved prototype to catalog items
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const prototypeId = resolvedParams.id
    const body = await request.json()
    const { notes } = body

    // Call the database function to promote prototype
    const { data: result, error } = await supabase
      .rpc('promote_prototype_to_catalog', {
        p_prototype_id: prototypeId,
        p_promoted_by: user.id,
        p_notes: notes || null
      })

    if (error) {
      console.error('Error promoting prototype:', error)
      return NextResponse.json(
        {
          error: 'Failed to promote prototype',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Get the newly created catalog item details
    const { data: catalogItem, error: itemError } = await supabase
      .from('items')
      .select(`
        id,
        sku_base,
        name,
        collection_id,
        base_price,
        is_active,
        collections (
          name,
          prefix
        )
      `)
      .eq('id', result)
      .single()

    if (itemError) {
      console.error('Error fetching promoted catalog item:', itemError)
    }

    return NextResponse.json({
      success: true,
      message: 'Prototype successfully promoted to catalog',
      data: {
        prototype_id: prototypeId,
        catalog_item_id: result,
        catalog_item: catalogItem
      }
    })

  } catch (error) {
    console.error('Error in prototype promotion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/prototypes/[id]/promote
 * Check if prototype is ready for promotion
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const prototypeId = resolvedParams.id

    // Call the database function to check readiness
    const { data: readinessCheck, error } = await supabase
      .rpc('is_prototype_ready_for_promotion', {
        p_prototype_id: prototypeId
      })

    if (error) {
      console.error('Error checking prototype readiness:', error)
      return NextResponse.json(
        { error: 'Failed to check prototype readiness' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: readinessCheck
    })

  } catch (error) {
    console.error('Error in prototype readiness check:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}