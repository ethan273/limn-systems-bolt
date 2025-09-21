import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single()

    if (orderError) throw orderError

    // Get template if specified
    let template = null
    if (body.template !== 'custom') {
      const { data: templateData } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('template_key', body.template)
        .single()
      
      template = templateData
    }

    // Create notification log
    const { data: log, error: logError } = await supabase
      .from('notification_logs')
      .insert({
        order_id: id,
        customer_id: order.customer_id,
        notification_type: body.type,
        template_id: template?.id,
        recipient: order.customer.email,
        subject: body.subject || template?.subject,
        content: body.message || template?.email_body,
        status: 'pending'
      })
      .select()
      .single()

    if (logError) throw logError

    // Here you would integrate with email/SMS service
    // For now, we'll just mark as sent
    await supabase
      .from('notification_logs')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', log.id)

    return NextResponse.json({ success: true, data: log })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}