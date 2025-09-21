import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// PUT /api/portal/notifications/[id]/read - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const notificationId = id
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer ID
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Update notification
    const { data: notification, error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('customer_id', customer.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ notification })

  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}