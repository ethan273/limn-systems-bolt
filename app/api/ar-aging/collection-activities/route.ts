/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch collection activities with customer information
    const { data: activities, error } = await supabase
      .from('collection_activities')
      .select(`
        id,
        customer_id,
        activity_type,
        description,
        created_date,
        created_by,
        next_action_date,
        status,
        customers:customer_id(
          id,
          name,
          company_name
        )
      `)
      .order('created_date', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch collection activities' }, { status: 500 })
    }

    // Transform data to include customer names
    const transformedActivities = (activities || []).map((activity: any) => ({
      ...activity,
       
      customer_name: (activity.customers as any)?.name || (activity.customers as any)?.company_name || 'Unknown Customer'
    }))

    return NextResponse.json({
      success: true,
      data: transformedActivities
    })

  } catch (error) {
    console.error('Error fetching collection activities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const supabase = await createServerSupabaseClient()

    // Validate required fields
    const required = ['customer_id', 'activity_type', 'description']
    const missing = required.filter(field => !data[field])
    if (missing.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        missing 
      }, { status: 400 })
    }

    // Validate activity type
    const validTypes = ['call', 'email', 'letter', 'meeting', 'payment_plan', 'legal_notice']
    if (!validTypes.includes(data.activity_type)) {
      return NextResponse.json({ 
        error: 'Invalid activity type',
        valid_types: validTypes
      }, { status: 400 })
    }

    // Create collection activity
    const { data: activity, error } = await supabase
      .from('collection_activities')
      .insert({
        customer_id: data.customer_id,
        activity_type: data.activity_type,
        description: data.description,
        created_date: new Date().toISOString(),
        created_by: data.created_by || 'system',
        next_action_date: data.next_action_date || null,
        status: 'completed', // Default to completed for immediate actions
        metadata: data.metadata || {}
      })
      .select(`
        *,
        customers:customer_id(
          id,
          name,
          company_name
        )
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create collection activity' }, { status: 500 })
    }

    // Transform response to include customer name
    const transformedActivity = {
      ...activity,
       
      customer_name: (activity.customers as any)?.name || (activity.customers as any)?.company_name || 'Unknown Customer'
    }

    return NextResponse.json({
      success: true,
      data: transformedActivity
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating collection activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}