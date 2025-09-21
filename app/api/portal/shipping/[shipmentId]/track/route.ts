import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const { shipmentId } = await params
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get customer ID
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Verify ownership of shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, customer_id, tracking_number, carrier')
      .eq('id', shipmentId)
      .eq('customer_id', customer.id)
      .single()

    if (shipmentError || !shipment) {
      return NextResponse.json(
        { error: 'Shipment not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch tracking events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_tracking_events')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('timestamp', { ascending: false })

    if (eventsError) {
      console.error('Error fetching tracking events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch tracking events' },
        { status: 500 }
      )
    }

    // In a real implementation, you might also fetch fresh data from carrier APIs
    // and update the database with any new tracking events

    return NextResponse.json({
      shipment: {
        id: shipment.id,
        tracking_number: shipment.tracking_number,
        carrier: shipment.carrier
      },
      events: events || [],
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in tracking API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}