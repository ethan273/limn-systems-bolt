import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { shipmentId, scheduledDate, timeWindow, specialInstructions } = body

    if (!shipmentId || !scheduledDate || !timeWindow) {
      return NextResponse.json(
        { error: 'Missing required fields: shipmentId, scheduledDate, timeWindow' },
        { status: 400 }
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

    // Verify ownership of shipment and check if it's schedulable
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, customer_id, status, estimated_delivery')
      .eq('id', shipmentId)
      .eq('customer_id', customer.id)
      .single()

    if (shipmentError || !shipment) {
      return NextResponse.json(
        { error: 'Shipment not found or access denied' },
        { status: 404 }
      )
    }

    // Check if shipment status allows scheduling
    const schedulableStatuses = ['shipped', 'in_transit', 'out_for_delivery']
    if (!schedulableStatuses.includes(shipment.status)) {
      return NextResponse.json(
        { error: `Cannot schedule delivery for shipment with status: ${shipment.status}` },
        { status: 400 }
      )
    }

    // Validate scheduled date (must be within reasonable range)
    const selectedDate = new Date(scheduledDate)
    const today = new Date()
    const estimatedDelivery = new Date(shipment.estimated_delivery)
    const maxDate = new Date(estimatedDelivery.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days after estimated delivery

    if (selectedDate < today || selectedDate > maxDate) {
      return NextResponse.json(
        { error: 'Selected date is outside the allowed scheduling window' },
        { status: 400 }
      )
    }

    // Validate time window
    const validTimeWindows = ['morning', 'afternoon', 'evening']
    if (!validTimeWindows.includes(timeWindow)) {
      return NextResponse.json(
        { error: 'Invalid time window. Must be: morning, afternoon, or evening' },
        { status: 400 }
      )
    }

    // Check if delivery schedule already exists
    const { data: existingSchedule } = await supabase
      .from('delivery_schedules')
      .select('id')
      .eq('shipment_id', shipmentId)
      .single()

    let result
    if (existingSchedule) {
      // Update existing schedule
      const { data, error } = await supabase
        .from('delivery_schedules')
        .update({
          scheduled_date: scheduledDate,
          time_window: timeWindow,
          special_instructions: specialInstructions || null,
          confirmed: false, // Reset confirmation when schedule is updated
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSchedule.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new schedule
      const { data, error } = await supabase
        .from('delivery_schedules')
        .insert({
          shipment_id: shipmentId,
          scheduled_date: scheduledDate,
          time_window: timeWindow,
          special_instructions: specialInstructions || null,
          confirmed: false
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    // In a real implementation, you might:
    // 1. Send the schedule to the carrier's API
    // 2. Create a notification for the customer
    // 3. Log the scheduling activity

    return NextResponse.json({
      success: true,
      schedule: result,
      message: existingSchedule ? 'Delivery schedule updated successfully' : 'Delivery scheduled successfully'
    })

  } catch (error) {
    console.error('Error in delivery scheduling API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Get URL params
    const { searchParams } = new URL(request.url)
    const shipmentId = searchParams.get('shipmentId')

    if (shipmentId) {
      // Get specific shipment's schedule
      const { data: schedule, error } = await supabase
        .from('delivery_schedules')
        .select(`
          *,
          shipment:shipments!inner(
            id,
            customer_id,
            tracking_number,
            carrier
          )
        `)
        .eq('shipment_id', shipmentId)
        .eq('shipment.customer_id', customer.id)
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Schedule not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ schedule })
    } else {
      // Get all schedules for customer
      const { data: schedules, error } = await supabase
        .from('delivery_schedules')
        .select(`
          *,
          shipment:shipments!inner(
            id,
            customer_id,
            tracking_number,
            carrier,
            status
          )
        `)
        .eq('shipment.customer_id', customer.id)
        .order('scheduled_date', { ascending: true })

      if (error) throw error

      return NextResponse.json({ schedules: schedules || [] })
    }

  } catch (error) {
    console.error('Error fetching delivery schedules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}