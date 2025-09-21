import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action, notes, user_id } = await request.json()
    const quoteId = id

    if (!action || !['approve', 'reject', 'book', 'track'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be approve, reject, book, or track' 
      }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // First, fetch the current quote
    const { data: currentQuote, error: fetchError } = await supabase
      .from('shipping_quotes')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (fetchError) {
      console.error('Error fetching quote:', fetchError)
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (!currentQuote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    let updateData: Record<string, unknown> = {}
    let responseMessage = ''

    switch (action) {
      case 'approve':
        if (currentQuote.status !== 'quoted') {
          return NextResponse.json({ 
            error: 'Quote must be in quoted status to approve' 
          }, { status: 400 })
        }
        
        updateData = {
          status: 'approved',
          approved_by: user_id || 'system',
          approved_date: new Date().toISOString()
        }
        responseMessage = 'Quote approved successfully'
        break

      case 'reject':
        if (!['quoted', 'pending'].includes(currentQuote.status)) {
          return NextResponse.json({ 
            error: 'Quote must be in quoted or pending status to reject' 
          }, { status: 400 })
        }
        
        updateData = {
          status: 'rejected',
          rejection_reason: notes || 'No reason provided',
          approved_by: user_id || 'system',
          approved_date: new Date().toISOString()
        }
        responseMessage = 'Quote rejected'
        break

      case 'book':
        if (currentQuote.status !== 'approved') {
          return NextResponse.json({ 
            error: 'Quote must be approved before booking' 
          }, { status: 400 })
        }

        // Generate tracking number and booking details
        const trackingNumber = `SK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        const sekoBookingId = `SEKO-${Date.now()}`
        
        updateData = {
          status: 'booked',
          tracking_number: trackingNumber,
          seko_booking_id: sekoBookingId,
          pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          delivery_date: new Date(Date.now() + (currentQuote.transit_time_days + 1) * 24 * 60 * 60 * 1000).toISOString()
        }
        responseMessage = `Shipment booked successfully. Tracking number: ${trackingNumber}`
        break

      case 'track':
        if (!currentQuote.tracking_number) {
          return NextResponse.json({ 
            error: 'No tracking number available for this quote' 
          }, { status: 400 })
        }

        // In a real implementation, this would call the Seko tracking API
        const trackingInfo = await getTrackingInfo(currentQuote.tracking_number)
        
        return NextResponse.json({
          success: true,
          data: trackingInfo,
          message: 'Tracking information retrieved'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update the quote
    const { data: updatedQuote, error: updateError } = await supabase
      .from('shipping_quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select(`
        *,
        orders:order_id(order_number, total_amount),
        customers:customer_id(name, company_name, email, phone)
      `)
      .single()

    if (updateError) {
      console.error('Error updating quote:', updateError)
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
    }

    // Log the action for audit trail
    await supabase
      .from('shipping_quote_actions')
      .insert({
        quote_id: quoteId,
        action,
        performed_by: user_id || 'system',
        notes: notes || null,
        created_date: new Date().toISOString(),
        previous_status: currentQuote.status,
        new_status: updateData.status || currentQuote.status
      })

    // Transform response data
    const transformedQuote = {
      ...updatedQuote,
      customer_name: updatedQuote.customers?.name || updatedQuote.customers?.company_name || 'Unknown Customer',
      order_number: updatedQuote.orders?.order_number || 'N/A'
    }

    return NextResponse.json({
      success: true,
      data: transformedQuote,
      message: responseMessage
    })

  } catch (error) {
    console.error('Error performing quote action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mock function to get tracking information
// In a real implementation, this would integrate with Seko's tracking API
async function getTrackingInfo(trackingNumber: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // Mock tracking data
  const mockStatuses = [
    'Label Created',
    'Picked Up',
    'In Transit',
    'Out for Delivery',
    'Delivered'
  ]

  const currentStatusIndex = Math.floor(Math.random() * mockStatuses.length)
  const currentStatus = mockStatuses[currentStatusIndex]

  return {
    tracking_number: trackingNumber,
    status: currentStatus,
    estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_update: new Date().toISOString(),
    location: 'Distribution Center',
    events: [
      {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Label Created',
        location: 'Origin Facility'
      },
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Picked Up',
        location: 'Customer Location'
      },
      {
        date: new Date().toISOString(),
        status: currentStatus,
        location: 'Distribution Center'
      }
    ]
  }
}