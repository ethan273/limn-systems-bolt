import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// GET /api/portal/messages/threads/[id]/messages - Get messages for a thread
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const threadId = id

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

    // Verify thread belongs to customer
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('id')
      .eq('id', threadId)
      .eq('customer_id', customer.id)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    // Mark staff messages as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('sender_type', 'staff')
      .is('read_at', null)

    return NextResponse.json({ messages: messages || [] })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/portal/messages/threads/[id]/messages - Send message in thread
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const threadId = id
    const body = await request.json()

    const { content, attachments = [] } = body

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
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

    // Verify thread belongs to customer
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('id, subject, status')
      .eq('id', threadId)
      .eq('customer_id', customer.id)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_type: 'customer',
        sender_id: customer.id,
        sender_name: user.email || 'Customer',
        sender_email: user.email,
        content: content.trim(),
        attachments
      })
      .select()
      .single()

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }

    // Update thread status to open if it was resolved
    if (thread.status === 'resolved') {
      await supabase
        .from('message_threads')
        .update({ status: 'open' })
        .eq('id', threadId)
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_customer_id: customer.id,
      p_activity_type: 'message_sent',
      p_entity_type: 'message',
      p_entity_id: message.id,
      p_description: `Sent message in thread: ${thread.subject}`,
      p_metadata: { thread_id: threadId, message_length: content.length }
    })

    // Create notification for new message (would typically notify staff)
    await supabase.rpc('create_notification', {
      p_customer_id: customer.id,
      p_type: 'new_message',
      p_title: 'New message received',
      p_message: `Customer sent a message in: ${thread.subject}`,
      p_category: 'system',
      p_priority: 'normal',
      p_metadata: { thread_id: threadId, message_id: message.id }
    })

    return NextResponse.json({ message })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}