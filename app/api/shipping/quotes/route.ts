/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { safeGet } from '@/lib/utils/bulk-type-fixes'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const serviceType = searchParams.get('service_type') || 'all'
    const carrier = searchParams.get('carrier') || 'all'
    const approvalRequired = searchParams.get('approval_required') || 'all'
    const search = searchParams.get('search') || ''
    const dateRange = searchParams.get('date_range') || '30d'

    const supabase = await createServerSupabaseClient()

    // Build comprehensive query with customer and order joins
    let query = supabase
      .from('shipping_quotes')
      .select(`
        id,
        quote_number,
        order_id,
        customer_id,
        status,
        service_type,
        carrier,
        origin_address,
        destination_address,
        dimensions,
        weight_lbs,
        declared_value,
        quoted_cost,
        actual_cost,
        transit_time_days,
        pickup_date,
        delivery_date,
        tracking_number,
        special_instructions,
        requires_approval,
        approved_by,
        approved_date,
        created_date,
        created_by,
        seko_quote_id,
        seko_booking_id,
        insurance_required,
        signature_required,
        inside_delivery,
        white_glove_service,
        orders:order_id(order_number, total_amount),
        customers:customer_id(name, company_name, email, phone)
      `)

    // Apply date range filter
    const endDate = new Date()
    const startDate = new Date()
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }
    query = query.gte('created_date', startDate.toISOString())

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (serviceType !== 'all') {
      query = query.eq('service_type', serviceType)
    }
    if (carrier !== 'all') {
      query = query.eq('carrier', carrier)
    }
    if (approvalRequired !== 'all') {
      query = query.eq('requires_approval', approvalRequired === 'true')
    }

    // Apply search filter
    if (search) {
      query = query.or(`quote_number.ilike.%${search}%,special_instructions.ilike.%${search}%`)
    }

    // Order by creation date descending
    query = query.order('created_date', { ascending: false })

    const { data: quotes, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch shipping quotes' }, { status: 500 })
    }

    // Transform data to include flattened customer and order info
    const transformedQuotes = (quotes || []).map((quote: any) => ({
      ...quote,
      customer_name: safeGet<string>(quote.customers, ['name']) || safeGet<string>(quote.customers, ['company_name']) || 'Unknown Customer',
      order_number: safeGet<string>(quote.orders, ['order_number']) || 'N/A'
    }))

    return NextResponse.json({
      success: true,
      data: transformedQuotes,
      count: transformedQuotes.length,
      filters: {
        status,
        service_type: serviceType,
        carrier,
        approval_required: approvalRequired,
        search,
        date_range: dateRange
      }
    })

  } catch (error) {
    console.error('Error fetching shipping quotes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const supabase = await createServerSupabaseClient()

    // Validate required fields
    const required = ['order_id', 'service_type', 'origin_address', 'destination_address', 'dimensions', 'weight_lbs']
    const missing = required.filter(field => !data[field])
    if (missing.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        missing 
      }, { status: 400 })
    }

    // Generate quote number
    const quoteNumber = `SQ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Insert new shipping quote
    const { data: quote, error } = await supabase
      .from('shipping_quotes')
      .insert({
        quote_number: quoteNumber,
        order_id: data.order_id,
        customer_id: data.customer_id,
        status: 'pending',
        service_type: data.service_type,
        carrier: data.carrier || 'seko',
        origin_address: data.origin_address,
        destination_address: data.destination_address,
        dimensions: data.dimensions,
        weight_lbs: parseFloat(data.weight_lbs),
        declared_value: parseFloat(data.declared_value) || 0,
        quoted_cost: parseFloat(data.quoted_cost) || 0,
        transit_time_days: parseInt(data.transit_time_days) || 5,
        special_instructions: data.special_instructions || null,
        requires_approval: data.requires_approval || false,
        created_date: new Date().toISOString(),
        created_by: data.created_by || 'system',
        insurance_required: data.insurance_required || false,
        signature_required: data.signature_required || false,
        inside_delivery: data.inside_delivery || false,
        white_glove_service: data.white_glove_service || false
      })
      .select(`
        *,
        orders:order_id(order_number, total_amount),
        customers:customer_id(name, company_name, email, phone)
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create shipping quote' }, { status: 500 })
    }

    // Transform response
    const transformedQuote = {
      ...quote,
      customer_name: safeGet<string>(quote.customers, ['name']) || safeGet<string>(quote.customers, ['company_name']) || 'Unknown Customer',
      order_number: safeGet<string>(quote.orders, ['order_number']) || 'N/A'
    }

    return NextResponse.json({
      success: true,
      data: transformedQuote
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating shipping quote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}