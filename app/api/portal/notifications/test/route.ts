import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// POST /api/portal/notifications/test - Send a test notification
export async function POST(request: Request) {
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
      .select('id, auth_user_id')
      .eq('email', user.email)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Create test notification
    const testNotification = {
      customer_id: customer.id,
      recipient_id: customer.auth_user_id,
      type: 'test_notification',
      title: 'Test Notification',
      message: `This is a test notification sent at ${new Date().toLocaleString()}. Your notification preferences are working correctly!`,
      category: 'system',
      priority: 'normal',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent') || 'Unknown'
      }
    }

    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_customer_id: customer.id,
      p_activity_type: 'settings_updated',
      p_entity_type: 'notification',
      p_entity_id: notification.id,
      p_description: 'Sent test notification',
      p_metadata: { test: true, notification_id: notification.id }
    })

    return NextResponse.json({ 
      success: true,
      notification,
      message: 'Test notification sent successfully! Check your notification center to see it.'
    })

  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}