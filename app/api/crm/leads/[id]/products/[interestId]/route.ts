import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; interestId: string }> }
) {
  try {
    const authResult = await requirePermissions(request, ['customers.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    // Note: params and supabase will be used when lead_products table is implemented
    await params // Consume params to avoid unused warning

    // For now, return mock success since we don't have lead_products table yet
    // TODO: Replace with real query when lead_products table is created
    // const supabase = await createServerSupabaseClient()
    // const { error } = await supabase
    //   .from('lead_products')
    //   .delete()
    //   .eq('id', interestId)
    //   .eq('lead_id', id)

    return NextResponse.json({
      success: true,
      message: 'Product interest removed successfully'
    })
  } catch (error) {
    console.error('Error removing product interest:', error)
    return NextResponse.json(
      { error: 'Failed to remove product interest' },
      { status: 500 }
    )
  }
}