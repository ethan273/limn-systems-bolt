/* eslint-disable @typescript-eslint/no-unused-vars */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { 
  safeGet, 
  safeAdd, 
  safeMultiply, 
  safeDivide, 
  safeArrayAccess, 
  safeSpread, 
  hasProperty 
} from '@/lib/utils/bulk-type-fixes'
import { 
  safeProp, 
  safeNumber, 
  safeString, 
  safeArray, 
  BaseRow 
} from '@/lib/types/database-types'

interface CapacityAnalysis {
  stages: Array<{
    name: string
    stage_order: number
    current_load: number
    max_capacity: number
    utilization_percent: number
    projected_overflow_date?: string
    recommended_capacity: number
  }>
  schedule: Array<{
    order_id: string
    order_number: string
    customer_name: string
    priority: string
    start_date: string
    end_date: string
    current_stage: string
    stages: Array<{
      stage: string
      estimated_start: string
      estimated_end: string
      duration_days: number
    }>
  }>
  capacity_forecast: Array<{
    date: string
    total_demand: number
    total_capacity: number
    utilization_percent: number
    bottleneck_stage?: string
  }>
  recommendations: string[]
  resource_allocation: Array<{
    resource_type: string
    allocated: number
    available: number
    efficiency: number
  }>
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const searchParams = request.nextUrl.searchParams
  
  const planningPeriod = searchParams.get('period') || 'month' // week, month, quarter

  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get production stages
    const { data: stages } = await supabase
      .from('production_stages')
      .select('*')
      .order('stage_order')

    // Get current production tracking
    const { data: productionTracking } = await supabase
      .from('production_tracking')
      .select(`
        *,
        production_stages(name, stage_order),
        orders(order_number, customer_name, delivery_date, priority, total_value)
      `)
      .not('status', 'in', '(completed,shipped,delivered)')

    // Get orders in pipeline (not yet started)
    const { data: upcomingOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'confirmed')
      .is('production_started_at', null)
      .order('delivery_date')

    // Calculate stage capacity
    const stageCapacity = safeArray(stages).map(stage => {
      const currentLoad = safeArray(productionTracking).filter(item => 
        safeProp(item, 'current_stage_id') === safeProp(stage, 'id')
      ).length
      
      // Estimate max capacity based on stage type and typical throughput
      const stageName = safeString(safeProp(stage, 'name'))
      const maxCapacity = getStageMaxCapacity(stageName)
      const utilizationPercent = maxCapacity > 0 ? (currentLoad / maxCapacity) * 100 : 0
      
      // Project when capacity will be exceeded
      const projectedOverflow = projectCapacityOverflow(stage, currentLoad, maxCapacity, safeArray(upcomingOrders))
      
      return {
        name: stageName,
        stage_order: safeNumber(safeProp(stage, 'stage_order')),
        current_load: currentLoad,
        max_capacity: maxCapacity,
        utilization_percent: utilizationPercent,
        projected_overflow_date: projectedOverflow,
        recommended_capacity: Math.ceil(maxCapacity * 1.2) // 20% buffer
      }
    })

    // Generate production schedule
    const schedule = generateProductionSchedule(safeArray(productionTracking), safeArray(upcomingOrders), safeArray(stages))

    // Generate capacity forecast
    const forecast = generateCapacityForecast(stageCapacity, schedule, planningPeriod)

    // Generate recommendations
    const recommendations = generateRecommendations(stageCapacity, forecast)

    // Calculate resource allocation
    const resourceAllocation = calculateResourceAllocation(safeArray(productionTracking))

    const analysis: CapacityAnalysis = {
      stages: stageCapacity,
      schedule,
      capacity_forecast: forecast,
      recommendations,
      resource_allocation: resourceAllocation
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Capacity analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function getStageMaxCapacity(stageName: string): number {
  const capacities: Record<string, number> = {
    'Design': 20,
    'Cutting': 15,
    'Assembly': 12,
    'Finishing': 10,
    'QC': 8,
    'Packaging': 15,
    'Shipping': 20
  }
  return capacities[stageName] || 10
}

function projectCapacityOverflow(stage: unknown, currentLoad: number, maxCapacity: number, upcomingOrders: unknown[]): string | undefined {
  if (currentLoad >= maxCapacity) {
    return new Date().toISOString().split('T')[0] // Today
  }
  
  // Simple projection: assume orders come in at current rate
  const safeOrders = safeArray(upcomingOrders)
  const ordersPerWeek = safeOrders.length / 4 // Spread over 4 weeks
  const itemsPerOrder = 2 // Average items per order
  const weeklyInflow = safeMultiply(ordersPerWeek, itemsPerOrder)
  
  if (weeklyInflow <= 0) return undefined
  
  const weeksToOverflow = safeDivide(maxCapacity - currentLoad, weeklyInflow)
  if (weeksToOverflow <= 0) return undefined
  
  const overflowDate = new Date()
  overflowDate.setDate(overflowDate.getDate() + safeMultiply(weeksToOverflow, 7))
  return overflowDate.toISOString().split('T')[0]
}

function generateProductionSchedule(tracking: unknown[], upcoming: unknown[], stages: unknown[]): Array<{
  order_id: string
  order_number: string
  customer_name: string
  priority: string
  start_date: string
  end_date: string
  current_stage: string
  stages: Array<{
    stage: string
    estimated_start: string
    estimated_end: string
    duration_days: number
  }>
}> {
  const schedule: Array<{
    order_id: string
    order_number: string
    customer_name: string
    priority: string
    start_date: string
    end_date: string
    current_stage: string
    stages: Array<{
      stage: string
      estimated_start: string
      estimated_end: string
      duration_days: number
    }>
  }> = []
  
  // Add current production items
  safeArray(tracking).forEach(item => {
    const orders = safeProp(item, 'orders')
    if (orders) {
      const productionStages = safeProp(item, 'production_stages')
      const currentStageOrder = safeNumber(safeProp(productionStages, 'stage_order'), 1)
      
      const remainingStages = safeArray(stages).filter(stage => 
        safeNumber(safeProp(stage, 'stage_order')) >= currentStageOrder
      )
      
      const stageSchedule = remainingStages.map((stage, index) => {
        const targetDuration = safeNumber(safeProp(stage, 'target_duration'), 3)
        const startOffset = safeMultiply(index, targetDuration)
        const duration = targetDuration
        
        const estimatedStart = new Date()
        estimatedStart.setDate(estimatedStart.getDate() + startOffset)
        
        const estimatedEnd = new Date(estimatedStart)
        estimatedEnd.setDate(estimatedEnd.getDate() + duration)
        
        return {
          stage: safeString(safeProp(stage, 'name')),
          estimated_start: estimatedStart.toISOString().split('T')[0],
          estimated_end: estimatedEnd.toISOString().split('T')[0],
          duration_days: duration
        }
      })
      
      schedule.push({
        order_id: safeString(safeProp(item, 'order_id')),
        order_number: safeString(safeProp(orders, 'order_number')),
        customer_name: safeString(safeProp(orders, 'customer_name')),
        priority: safeString(safeProp(orders, 'priority'), 'normal'),
        start_date: safeString(safeProp(item, 'started_at'), new Date().toISOString()),
        end_date: safeString(safeProp(orders, 'delivery_date')),
        current_stage: safeString(safeProp(productionStages, 'name'), 'Unknown'),
        stages: stageSchedule
      })
    }
  })
  
  // Add upcoming orders
  safeArray(upcoming).slice(0, 10).forEach((order, index) => {
    const startOffset = safeMultiply(safeAdd(safeArray(tracking).length, index), 2) // Stagger starts
    const totalDuration = safeArray(stages).reduce((sum, stage) => {
      return safeAdd(sum, safeNumber(safeProp(stage, 'target_duration'), 3))
    }, 0)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + startOffset)
    
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + safeNumber(totalDuration))
    
    const stageSchedule = safeArray(stages).map((stage, stageIndex) => {
      const stageDuration = safeNumber(safeProp(stage, 'target_duration'), 3)
      const stageStart = new Date(startDate)
      stageStart.setDate(stageStart.getDate() + safeMultiply(stageIndex, stageDuration))
      
      const stageEnd = new Date(stageStart)
      stageEnd.setDate(stageEnd.getDate() + stageDuration)
      
      return {
        stage: safeString(safeProp(stage, 'name')),
        estimated_start: stageStart.toISOString().split('T')[0],
        estimated_end: stageEnd.toISOString().split('T')[0],
        duration_days: stageDuration
      }
    })
    
    schedule.push({
      order_id: safeString(safeProp(order, 'id')),
      order_number: safeString(safeProp(order, 'order_number')),
      customer_name: safeString(safeProp(order, 'customer_name')),
      priority: safeString(safeProp(order, 'priority'), 'normal'),
      start_date: startDate.toISOString().split('T')[0],
      end_date: safeString(safeProp(order, 'delivery_date'), endDate.toISOString().split('T')[0]),
      current_stage: 'Pending',
      stages: stageSchedule
    })
  })
  
  return schedule.sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  })
}

function generateCapacityForecast(stageCapacity: unknown[], schedule: unknown[], period: string): Array<{
  date: string
  total_demand: number
  total_capacity: number
  utilization_percent: number
  bottleneck_stage?: string
}> {
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
  const forecast: Array<{
    date: string
    total_demand: number
    total_capacity: number
    utilization_percent: number
    bottleneck_stage?: string
  }> = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    // Calculate demand for this date
    let totalDemand = 0
    let bottleneckStage = ''
    let maxUtilization = 0
    
    safeArray(stageCapacity).forEach(stage => {
      const stageName = safeString(safeProp(stage, 'name'))
      const maxCapacity = safeNumber(safeProp(stage, 'max_capacity'))
      
      const stageItemsOnDate = safeArray(schedule).filter(item => 
        safeArray(safeProp(item, 'stages')).some(s => {
          const stageStart = safeString(safeProp(s, 'estimated_start'))
          const stageEnd = safeString(safeProp(s, 'estimated_end'))
          const stageType = safeString(safeProp(s, 'stage'))
          return dateStr >= stageStart && dateStr <= stageEnd && stageType === stageName
        })
      ).length
      
      const stageUtilization = maxCapacity > 0 ? (stageItemsOnDate / maxCapacity) * 100 : 0
      if (stageUtilization > maxUtilization) {
        maxUtilization = stageUtilization
        bottleneckStage = stageName
      }
      
      totalDemand = safeAdd(totalDemand, stageItemsOnDate)
    })
    
    const totalCapacity = safeNumber(safeArray(stageCapacity).reduce((sum, stage) => {
      return safeAdd(sum, safeNumber(safeProp(stage, 'max_capacity')))
    }, 0))
    
    forecast.push({
      date: dateStr,
      total_demand: totalDemand,
      total_capacity: totalCapacity,
      utilization_percent: Math.round(maxUtilization * 10) / 10,
      bottleneck_stage: maxUtilization > 80 ? bottleneckStage : undefined
    })
  }
  
  return forecast
}

function generateRecommendations(stageCapacity: unknown[], forecast: unknown[]): string[] {
  const recommendations = []
  
  // Check for current bottlenecks
  const bottlenecks = safeArray(stageCapacity).filter(stage => 
    safeNumber(safeProp(stage, 'utilization_percent')) > 90
  )
  bottlenecks.forEach(stage => {
    const stageName = safeString(safeProp(stage, 'name'))
    const utilization = safeNumber(safeProp(stage, 'utilization_percent'))
    recommendations.push(`${stageName} stage is at ${utilization.toFixed(1)}% capacity - consider adding resources`)
  })
  
  // Check for upcoming capacity issues
  const upcomingBottlenecks = safeArray(forecast).filter(f => 
    safeNumber(safeProp(f, 'utilization_percent')) > 90
  )
  if (upcomingBottlenecks.length > 0) {
    const firstBottleneck = upcomingBottlenecks[0]
    const date = safeString(safeProp(firstBottleneck, 'date'))
    const bottleneckStage = safeString(safeProp(firstBottleneck, 'bottleneck_stage'))
    recommendations.push(`Capacity will exceed 90% on ${date} in ${bottleneckStage}`)
  }
  
  // Check for underutilized stages
  const underutilized = safeArray(stageCapacity).filter(stage => 
    safeNumber(safeProp(stage, 'utilization_percent')) < 50
  )
  underutilized.forEach(stage => {
    const stageName = safeString(safeProp(stage, 'name'))
    const utilization = safeNumber(safeProp(stage, 'utilization_percent'))
    recommendations.push(`${stageName} stage is only ${utilization.toFixed(1)}% utilized - consider cross-training staff`)
  })
  
  // Overflow warnings
  safeArray(stageCapacity).forEach(stage => {
    const overflowDate = safeProp(stage, 'projected_overflow_date')
    if (overflowDate) {
      const stageName = safeString(safeProp(stage, 'name'))
      recommendations.push(`${stageName} capacity will be exceeded by ${overflowDate}`)
    }
  })
  
  if (recommendations.length === 0) {
    recommendations.push('Production capacity is well-balanced across all stages')
  }
  
  return recommendations
}

function calculateResourceAllocation(tracking: unknown[]): Array<{
  resource_type: string
  allocated: number
  available: number
  efficiency: number
}> {
  const trackingArray = safeArray(tracking)
  const trackingLength = trackingArray.length
  
  return [
    {
      resource_type: 'Production Staff',
      allocated: trackingLength,
      available: 25,
      efficiency: Math.min(100, safeDivide(safeMultiply(trackingLength, 100), 20))
    },
    {
      resource_type: 'Equipment',
      allocated: Math.ceil(safeDivide(trackingLength, 3)),
      available: 12,
      efficiency: 85
    },
    {
      resource_type: 'Floor Space',
      allocated: safeMultiply(trackingLength, 10), // sq ft per item
      available: 500,
      efficiency: Math.min(100, safeDivide(safeMultiply(trackingLength, 1000), 400))
    }
  ]
}