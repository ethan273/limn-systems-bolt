import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermissions(request, ['customers.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const { id } = await params
    // Note: supabase will be used when lead_products table is implemented
    // const supabase = await createServerSupabaseClient()

    // For now, return mock data since we don't have lead_products table yet
    // This assumes a lead_products junction table would exist
    const mockData = [
      {
        id: `interest-${Date.now()}-1`,
        lead_id: id,
        product_id: 'prod-1',
        product_name: 'Executive Conference Table',
        product_image: '/placeholder.jpg',
        interest_level: 'high'
      },
      {
        id: `interest-${Date.now()}-2`,
        lead_id: id,
        product_id: 'prod-2',
        product_name: 'Ergonomic Office Chair',
        product_image: '/placeholder.jpg',
        interest_level: 'medium'
      }
    ]

    // TODO: Replace with real query when lead_products table is created
    // const { data, error } = await supabase
    //   .from('lead_products')
    //   .select(`
    //     *,
    //     product:products(id, name, sku, image_url)
    //   `)
    //   .eq('lead_id', id)

    return NextResponse.json({ success: true, data: mockData })
  } catch (error) {
    console.error('Error fetching product interests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product interests' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermissions(request, ['customers.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const { id } = await params
    // Note: supabase will be used when lead_products table is implemented
    // const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // For now, return mock success since we don't have lead_products table yet
    const mockInterest = {
      id: `interest-${Date.now()}`,
      lead_id: id,
      product_id: body.product_id,
      interest_level: body.interest_level || 'medium',
      created_at: new Date().toISOString()
    }

    // TODO: Replace with real query when lead_products table is created
    // const { data, error } = await supabase
    //   .from('lead_products')
    //   .insert([{
    //     lead_id: id,
    //     product_id: body.product_id,
    //     interest_level: body.interest_level || 'medium',
    //     created_at: new Date().toISOString()
    //   }])
    //   .select()
    //   .single()

    return NextResponse.json({ success: true, data: mockInterest })
  } catch (error) {
    console.error('Error adding product interest:', error)
    return NextResponse.json(
      { error: 'Failed to add product interest' },
      { status: 500 }
    )
  }
}