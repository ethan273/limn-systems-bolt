/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

interface ActivityItem {
  id: string
  timestamp: string
  event_type: string
  actor_id: string
  actor_email: string
  actor_name?: string
  action: string
  resource_type: string
  resource_id: string
  details: Record<string, unknown>
  outcome: 'success' | 'failure'
  department?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const searchParams = request.nextUrl.searchParams
  
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const type = searchParams.get('type') || 'all'
  const department = searchParams.get('department') || 'all'
  const user = searchParams.get('user') || 'all'
  const dateRange = searchParams.get('dateRange') || '24h'
  const outcome = searchParams.get('outcome') || 'all'
  
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['reports.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    // Get real activity from existing database tables only
    const recentActivities = await fetchRecentActivity(supabase, limit, dateRange)
    
    if (recentActivities.length === 0) {
      return NextResponse.json({
        activities: [],
        pagination: {
          current_page: page,
          total_pages: 0,
          total_items: 0,
          items_per_page: limit,
          has_next: false,
          has_previous: false
        },
        stats: {
          total: 0,
          by_type: {},
          by_department: {},
          by_outcome: {}
        },
        filters: { type, department, user, dateRange, outcome },
        message: 'Database empty'
      })
    }

    let filteredActivities = recentActivities

    // Apply filters
    if (type !== 'all') {
      filteredActivities = filteredActivities.filter(activity => 
        activity.event_type === type
      )
    }

    if (department !== 'all') {
      filteredActivities = filteredActivities.filter(activity => 
        activity.department === department
      )
    }

    if (user !== 'all') {
      filteredActivities = filteredActivities.filter(activity => 
        activity.actor_email.toLowerCase().includes(user.toLowerCase()) ||
        activity.actor_name?.toLowerCase().includes(user.toLowerCase())
      )
    }

    if (outcome !== 'all') {
      filteredActivities = filteredActivities.filter(activity => 
        activity.outcome === outcome
      )
    }

    // Apply date range filter
    const now = new Date()
    let dateThreshold: Date
    
    switch (dateRange) {
      case '1h':
        dateThreshold = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    filteredActivities = filteredActivities.filter(activity => 
      new Date(activity.timestamp) >= dateThreshold
    )

    // Sort by timestamp (most recent first)
    filteredActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedActivities = filteredActivities.slice(startIndex, endIndex)

    // Calculate totals for statistics
    const totalActivities = filteredActivities.length
    const totalPages = Math.ceil(totalActivities / limit)

    // Activity type counts
    const activityTypeCounts = filteredActivities.reduce((acc, activity) => {
      acc[activity.event_type] = (acc[activity.event_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Department counts
    const departmentCounts = filteredActivities.reduce((acc, activity) => {
      if (activity.department) {
        acc[activity.department] = (acc[activity.department] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Outcome counts
    const outcomeCounts = filteredActivities.reduce((acc, activity) => {
      acc[activity.outcome] = (acc[activity.outcome] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      activities: paginatedActivities,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalActivities,
        items_per_page: limit,
        has_next: page < totalPages,
        has_previous: page > 1
      },
      stats: {
        total: totalActivities,
        by_type: activityTypeCounts,
        by_department: departmentCounts,
        by_outcome: outcomeCounts
      },
      filters: {
        type,
        department,
        user,
        dateRange,
        outcome
      }
    })
  } catch (error: unknown) {
    console.error('Failed to fetch activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' }, 
      { status: 500 }
    )
  }
}

async function fetchRecentActivity(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, limit: number, dateRange: string): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = []
  
  try {
    // Calculate date threshold
    const now = new Date()
    let dateThreshold: Date
    
    switch (dateRange) {
      case '1h':
        dateThreshold = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
    
    // Fetch recent orders with customer details
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id, 
        order_number, 
        status, 
        created_at, 
        customer:customers(name, company_name)
      `)
      .gte('created_at', dateThreshold.toISOString())
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 2))
    
    // Fetch recent customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, company_name, created_at')
      .gte('created_at', dateThreshold.toISOString())
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 2))
    
    // Transform orders to activity items
    orders?.forEach((order: any) => {
      activities.push({
        id: `order-${order.id}`,
        timestamp: order.created_at,
        event_type: 'order_created',
        actor_id: 'system',
        actor_email: 'system@company.com',
        actor_name: 'System',
        action: 'created',
        resource_type: 'order',
        resource_id: order.order_number || order.id,
        details: {
          order_number: order.order_number,
          status: order.status,
           
          customer_name: (order.customer as any)?.company_name || (order.customer as any)?.name || 'Unknown Customer'
        },
        outcome: 'success',
        department: 'sales',
        severity: 'low'
      })
    })
    
    // Transform customers to activity items
    customers?.forEach((customer: any) => {
      activities.push({
        id: `customer-${customer.id}`,
        timestamp: customer.created_at,
        event_type: 'customer_created',
        actor_id: 'system',
        actor_email: 'system@company.com',
        actor_name: 'System',
        action: 'created',
        resource_type: 'customer',
        resource_id: customer.id,
        details: {
          customer_name: customer.company_name || customer.name || 'Unknown Customer'
        },
        outcome: 'success',
        department: 'sales',
        severity: 'low'
      })
    })
    
    // Sort by timestamp (most recent first) and return
    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  } catch (error) {
    console.error('Error fetching real activity data:', error)
    return []
  }
}