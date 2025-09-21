import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// GET /api/portal/notifications - Get notifications for the current customer
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const unreadOnly = searchParams.get('unread') === 'true'
    
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

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    
    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error: notificationsError } = await query

    if (notificationsError) {
      return NextResponse.json({ error: notificationsError.message }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)

    if (category) countQuery = countQuery.eq('category', category)
    if (unreadOnly) countQuery = countQuery.eq('read', false)

    const { count } = await countQuery

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/portal/notifications - Create a new notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { 
      customer_id, 
      type, 
      title, 
      message, 
      category = 'general',
      priority = 'normal',
      link,
      metadata = {} 
    } = body

    if (!customer_id || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, type, title, message' },
        { status: 400 }
      )
    }

    // Get the auth user_id for the customer
    const { data: customer } = await supabase
      .from('customers')
      .select('auth_user_id')
      .eq('id', customer_id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        customer_id,
        recipient_id: customer.auth_user_id,
        type,
        title,
        message,
        category,
        priority,
        link,
        metadata
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_customer_id: customer_id,
      p_activity_type: 'notification_sent',
      p_entity_type: 'notification',
      p_entity_id: notification.id,
      p_description: `Notification sent: ${title}`,
      p_metadata: { notification_type: type, category, priority }
    })

    return NextResponse.json({ notification })

  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}