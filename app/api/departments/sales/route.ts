/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Sales Department API: Fetching sales team data for user:', user.email)

    const departmentData = {
      pipeline_orders: [] as unknown[],
      quotes: [] as unknown[],
      communications: [] as unknown[],
      tasks: [] as unknown[],
      sales_metrics: {
        total_pipeline_value: 0,
        active_deals: 0,
        monthly_revenue: 0,
        win_rate: 0,
        average_deal_size: 0,
        quotes_pending: 0
      }
    }

    try {
      // Fetch pipeline orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['quote', 'proposal', 'negotiation', 'approved'])
        .order('created_at', { ascending: false })
        .limit(15)

      if (!ordersError) {
        departmentData.pipeline_orders = orders || []
        
        // Calculate pipeline metrics
        const totalValue = orders?.reduce((sum: any, order: any) => 
          sum + (parseFloat(order.total_amount) || 0), 0) || 0
        departmentData.sales_metrics.total_pipeline_value = totalValue
        
        const activeDeals = orders?.filter((o: any) => 
          ['proposal', 'negotiation'].includes(o.status)
        ).length || 0
        departmentData.sales_metrics.active_deals = activeDeals
        
        const approvedDeals = orders?.filter((o: any) => o.status === 'approved') || []
        const monthlyRevenue = approvedDeals.reduce((sum: any, order: any) => 
          sum + (parseFloat(order.total_amount) || 0), 0)
        departmentData.sales_metrics.monthly_revenue = monthlyRevenue
        
        // Calculate win rate
        const totalDeals = orders?.length || 0
        const wonDeals = approvedDeals.length
        departmentData.sales_metrics.win_rate = totalDeals > 0 ? 
          Math.round((wonDeals / totalDeals) * 100) : 0
        
        // Calculate average deal size
        departmentData.sales_metrics.average_deal_size = totalDeals > 0 ? 
          Math.round(totalValue / totalDeals) : 0
          
      } else {
        console.warn('Orders table may not exist:', ordersError)
      }

      // Fetch quotes
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!quotesError) {
        departmentData.quotes = quotes || []
        departmentData.sales_metrics.quotes_pending = quotes?.filter((q: any) => 
          ['sent', 'viewed'].includes(q.status)
        ).length || 0
      } else {
        console.warn('Quotes table may not exist:', quotesError)
      }

      // Fetch customer communications
      const { data: communications, error: commsError } = await supabase
        .from('customer_communications')
        .select('*')
        .order('date', { ascending: false })
        .limit(12)

      if (!commsError) {
        departmentData.communications = communications || []
      } else {
        console.warn('Customer communications table may not exist:', commsError)
      }

      // Fetch sales department tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('department', 'sales')
        .order('created_at', { ascending: false })
        .limit(15)

      if (!tasksError) {
        departmentData.tasks = tasks || []
      } else {
        console.warn('Tasks table may not exist or no sales tasks found:', tasksError)
      }

    } catch {
      console.log('Database connection issue. Sales department will use fallback data.')
    }

    console.log('Sales Department API: Returning data for', 
      departmentData.pipeline_orders.length, 'pipeline orders,', 
      departmentData.quotes.length, 'quotes,',
      departmentData.communications.length, 'communications,',
      departmentData.tasks.length, 'tasks')

    return NextResponse.json({
      success: true,
      data: departmentData,
      department: 'sales',
      computed_at: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}