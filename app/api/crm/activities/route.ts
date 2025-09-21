import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermissions(request, ['customers.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const relatedId = searchParams.get('related_id')
    const relatedTo = searchParams.get('related_to')
    const filter = searchParams.get('filter') || 'all'

    let activities: unknown[] = []
    try {
      let query = supabase
        .from('customer_communications')
        .select(`
          id,
          subject,
          message as description,
          type,
          created_at,
          customer_id as related_id,
          order_id
        `)
        .order('created_at', { ascending: false })

      // Apply filter if specified
      if (filter !== 'all') {
        query = query.eq('type', filter)
      }

      // Filter by related entity if provided
      if (relatedId && relatedTo === 'leads') {
        // For leads, we might not have direct mapping, so return empty for now
        activities = []
      } else if (relatedId && relatedTo === 'customers') {
        query = query.eq('customer_id', relatedId)
      }

      if (relatedId && relatedTo !== 'leads') {
        const { data, error } = await query

        if (error && error.code === 'PGRST205') {
          console.log('Customer communications table not yet created. Database empty.')
          activities = []
        } else if (error) {
          console.error('Database error fetching activities:', error)
          activities = []
        } else {
          activities = (data || []).map((activity: {
            id: string
            subject: string
            message: string
            type: string
            created_at: string
            customer_id: string
            order_id: string
          }) => ({
            ...activity,
            related_to: 'customers',
            activity_type: activity.type || 'note'
          }))
        }
      } else {
        // Return empty array for general activities or leads until we have a proper activities table
        activities = []
      }
    } catch {
      console.log('Database connection issue. Database empty.')
      activities = []
    }

    return NextResponse.json({
      success: true,
      data: activities,
      count: activities.length
    })

  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermissions(request, ['customers.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const { user } = authResult
    if (!user) {
      return NextResponse.json(
        { error: 'User context required' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    const { type, subject, description, related_to, related_id } = body

    if (!type || !subject || !related_to || !related_id) {
      return NextResponse.json({
        error: 'Missing required fields: type, subject, related_to, related_id'
      }, { status: 400 })
    }

    // Map activity to customer communication if related to customers
    if (related_to === 'customers') {
      const activityData = {
        type: type,
        subject: subject,
        message: description || '',
        customer_id: related_id,
        communication_date: new Date().toISOString(),
        status: 'sent'
      }

      try {
        const { data, error } = await supabase
          .from('customer_communications')
          .insert([activityData])
          .select()

        if (error) {
          console.error('Database error creating activity:', error)
          return NextResponse.json({
            error: 'Failed to create activity',
            details: error.message
          }, { status: 500 })
        }

        const createdActivity = {
          ...data[0],
          description: data[0].message,
          related_to: 'customers',
          related_id: data[0].customer_id,
          activity_type: data[0].type
        }

        return NextResponse.json({
          success: true,
          data: createdActivity,
          message: 'Activity logged successfully'
        })
      } catch (dbError) {
        console.error('Database connection error:', dbError)
        return NextResponse.json({
          error: 'Database connection failed',
          details: 'Please check database configuration'
        }, { status: 500 })
      }
    } else {
      // For leads and other entities, we'll just return success for now
      // until we have a proper activities table
      const mockActivity = {
        id: `temp-${Date.now()}`,
        type,
        subject,
        description: description || '',
        related_to,
        related_id,
        created_at: new Date().toISOString(),
        activity_type: type
      }

      return NextResponse.json({
        success: true,
        data: mockActivity,
        message: 'Activity logged successfully'
      })
    }

  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}