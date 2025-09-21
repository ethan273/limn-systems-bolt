import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const PRODUCTION_STAGES = ['Design', 'Cutting', 'Assembly', 'Finishing', 'QC', 'Packaging']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const { orderId } = await params

    // 1. Verify user authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = session.user.email

    // 2. Check user owns the order
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Verify order belongs to customer
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_id')
      .eq('id', orderId)
      .eq('customer_id', customer.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 3. Verify portal_settings.show_production_tracking = true
    const { data: portalSettings, error: settingsError } = await supabase
      .from('portal_settings')
      .select('show_production_tracking')
      .eq('customer_id', customer.id)
      .single()

    if (settingsError) {
      console.error('Error fetching portal settings:', settingsError)
      // Allow access if no settings found (default behavior)
    } else if (!portalSettings?.show_production_tracking) {
      return NextResponse.json(
        { error: 'Production tracking not enabled for your account' }, 
        { status: 403 }
      )
    }

    // 4. Fetch production items with order items
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        item_name,
        quantity,
        production_items (
          id,
          stage,
          progress,
          started_at,
          completed_at,
          notes
        )
      `)
      .eq('order_id', orderId)

    if (orderItemsError) {
      console.error('Error fetching production data:', orderItemsError)
      return NextResponse.json(
        { error: 'Failed to fetch production data' }, 
        { status: 500 }
      )
    }

    // 5. Process and structure the data
    const items = orderItems?.map(orderItem => {
      // Group production items by stage
      const productionItems = (orderItem.production_items || []) as unknown[]
      const stageData: Record<string, unknown> = {}
      
      // Initialize all stages with default values
      PRODUCTION_STAGES.forEach(stage => {
        stageData[stage] = {
          progress: 0,
          started_at: null,
          completed_at: null,
          notes: null
        }
      })

      // Fill in actual data
      productionItems.forEach((item: unknown) => {
        const productionItem = item as { stage: string; progress?: number; started_at?: string; completed_at?: string; notes?: string }
        if (productionItem.stage && PRODUCTION_STAGES.includes(productionItem.stage)) {
          stageData[productionItem.stage] = {
            progress: productionItem.progress || 0,
            started_at: productionItem.started_at,
            completed_at: productionItem.completed_at,
            notes: productionItem.notes
          }
        }
      })

      // Calculate current stage and overall progress
      let currentStage = 'Design' // Default to first stage
      let overallProgress = 0
      const totalStages = PRODUCTION_STAGES.length
      let completedStages = 0

      for (const stage of PRODUCTION_STAGES) {
        const stageProgress = (stageData[stage] as Record<string, unknown>)?.progress as number || 0
        overallProgress += stageProgress / totalStages

        if (stageProgress === 100) {
          completedStages++
        } else if (stageProgress > 0) {
          currentStage = stage
          break
        }
      }

      // If all stages are complete, set to last stage
      if (completedStages === totalStages) {
        currentStage = 'Packaging'
      }

      const stageProgress = (stageData[currentStage] as Record<string, unknown>)?.progress as number || 0

      return {
        id: orderItem.id,
        item_name: orderItem.item_name,
        quantity: orderItem.quantity,
        currentStage,
        stageProgress,
        overallProgress: Math.round(overallProgress),
        stages: stageData
      }
    }) || []

    // 6. Calculate overall order progress
    const totalOverallProgress = items.length > 0 
      ? Math.round(
          items.reduce((sum, item) => sum + (item.overallProgress * item.quantity), 0) / 
          items.reduce((sum, item) => sum + item.quantity, 0)
        )
      : 0

    // Determine current overall stage
    let currentOverallStage = 'Design'
    if (totalOverallProgress > 0) {
      // Find the most common current stage
      const stageCounts: Record<string, number> = {}
      items.forEach(item => {
        stageCounts[item.currentStage] = (stageCounts[item.currentStage] || 0) + item.quantity
      })
      
      currentOverallStage = Object.keys(stageCounts).reduce((a, b) => 
        stageCounts[a] > stageCounts[b] ? a : b
      ) || 'Design'
    }

    // Estimate completion (simplified - could be more sophisticated)
    const estimatedCompletion = new Date()
    const remainingProgress = 100 - totalOverallProgress
    const daysToComplete = Math.max(1, Math.round(remainingProgress / 10)) // ~10% per day estimate
    estimatedCompletion.setDate(estimatedCompletion.getDate() + daysToComplete)

    const response = {
      orderId,
      orderNumber: order.order_number,
      items,
      overallProgress: totalOverallProgress,
      currentStage: currentOverallStage,
      estimatedCompletion: estimatedCompletion.toISOString()
    }

    return NextResponse.json(response)

  } catch (error: unknown) {
    console.error('Production API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Log production view for analytics
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const { orderId } = await params

    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer ID
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (customer) {
      // Find active session and log the activity
      const { data: activeSessions } = await supabase
        .from('portal_sessions')
        .select('id, activity_log')
        .eq('customer_id', customer.id)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)

      if (activeSessions && activeSessions.length > 0) {
        const session = activeSessions[0]
        const currentLog = session.activity_log || []
        
        const newActivity = {
          action: 'production_view',
          timestamp: new Date().toISOString(),
          details: { 
            order_id: orderId,
            page: '/portal/production'
          }
        }

        const updatedLog = [...currentLog, newActivity]

        await supabase
          .from('portal_sessions')
          .update({
            activity_log: updatedLog,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', session.id)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error logging production view:', error)
    return NextResponse.json({ success: false })
  }
}