import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// GET /api/portal/messages/threads - Get message threads
export async function GET() {
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

    // Get threads with related data
    const { data: threads, error: threadsError } = await supabase
      .from('message_threads')
      .select(`
        *,
        order:orders(order_number),
        messages!inner(
          id,
          content,
          sender_type,
          sender_name,
          read_at,
          created_at
        )
      `)
      .eq('customer_id', customer.id)
      .order('last_message_at', { ascending: false })

    if (threadsError) {
      return NextResponse.json({ error: threadsError.message }, { status: 500 })
    }

    // Process threads to add unread count and last message
    const processedThreads = threads?.map(thread => {
      const threadMessages = Array.isArray(thread.messages) ? thread.messages : []
      const unreadCount = threadMessages.filter((m: Record<string, unknown>) => !m.read_at && m.sender_type === 'staff').length
      const lastMessage = threadMessages
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())[0]

      return {
        ...thread,
        unread_count: unreadCount,
        last_message: lastMessage?.content?.substring(0, 100) + (lastMessage?.content?.length > 100 ? '...' : ''),
        messages: undefined // Remove messages array to clean up response
      }
    }) || []

    return NextResponse.json({ threads: processedThreads })

  } catch (error) {
    console.error('Error fetching threads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/portal/messages/threads - Create new thread
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { subject, message, order_id, priority = 'normal' } = body

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, message' },
        { status: 400 }
      )
    }

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

    // Create thread
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({
        customer_id: customer.id,
        order_id: order_id || null,
        subject,
        status: 'open',
        priority
      })
      .select()
      .single()

    if (threadError) {
      return NextResponse.json({ error: threadError.message }, { status: 500 })
    }

    // Create first message
    const { data: firstMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: thread.id,
        sender_type: 'customer',
        sender_id: customer.id,
        sender_name: user.email || 'Customer',
        sender_email: user.email,
        content: message
      })
      .select()
      .single()

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_customer_id: customer.id,
      p_activity_type: 'message_sent',
      p_entity_type: 'message',
      p_entity_id: thread.id,
      p_description: `Started new conversation: ${subject}`,
      p_metadata: { thread_id: thread.id, order_id, priority }
    })

    // Create notification for new thread (would typically notify staff)
    await supabase.rpc('create_notification', {
      p_customer_id: customer.id,
      p_type: 'new_message_thread',
      p_title: 'New message thread created',
      p_message: `Customer started a new conversation: ${subject}`,
      p_category: 'system',
      p_priority: 'normal',
      p_metadata: { thread_id: thread.id, subject }
    })

    return NextResponse.json({ thread, first_message: firstMessage })

  } catch (error) {
    console.error('Error creating thread:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}