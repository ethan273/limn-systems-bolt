import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// PUT /api/portal/notifications/mark-all-read - Mark all notifications as read
export async function PUT() {
  try {
    const supabase = await createClient()
    
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

    // Update all unread notifications
    const { data: notifications, error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('customer_id', customer.id)
      .eq('read', false)
      .select('id')

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const updatedCount = notifications?.length || 0

    // Log activity
    if (updatedCount > 0) {
      await supabase.rpc('log_activity', {
        p_customer_id: customer.id,
        p_activity_type: 'settings_updated',
        p_entity_type: 'user',
        p_entity_id: customer.id,
        p_description: `Marked ${updatedCount} notifications as read`,
        p_metadata: { action: 'mark_all_read', count: updatedCount }
      })
    }

    return NextResponse.json({ 
      success: true, 
      updated_count: updatedCount,
      message: `${updatedCount} notifications marked as read`
    })

  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}