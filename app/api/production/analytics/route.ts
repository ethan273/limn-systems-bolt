/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ProductionTracking, ProductionMilestone, safeNumber, safeString, safeArray, safeProp } from '@/lib/types/database-types'
import { safeAdd, safeMultiply, safeDivide, safeGet, hasProperty, safeArrayAccess, safeHandleAPIError } from '@/lib/utils/bulk-type-fixes'

// TypeScript interfaces for production analytics
interface ProductionStage {
  id: string
  name: string
  target_duration?: number
  stage_order: number
}

interface ManufacturerItem {
  manufacturer?: {
    name: string
  }
  production_time?: number
  quality_score?: number
}

interface DailyMetric {
  date: string
  efficiency: number
  completed: number
  started: number
  items_in_progress: number
}

interface ProductionAnalytics {
  efficiency_rate: number
  average_lead_time: number
  quality_pass_rate: number
  on_time_delivery: number
  current_wip: number
  capacity_utilization: number
  stage_metrics: Array<{
    stage: string
    stage_order: number
    item_count: number
    avg_duration: number
    target_duration: number
    bottleneck_score: number
    utilization: number
  }>
  daily_metrics: DailyMetric[]
  production_funnel: Array<{
    stage: string
    item_count: number
    conversion_rate: number
  }>
  manufacturer_performance: Array<{
    name: string
    efficiency_rate: number
    quality_score: number
    avg_lead_time: number
    current_load: number
  }>
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const searchParams = request.nextUrl.searchParams
  
  const period = searchParams.get('period') || '30d' // 7d, 30d, 90d
  const startDate = getStartDate(period)

  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get production stages for reference
    const { data: stages } = await supabase
      .from('production_stages')
      .select('*')
      .order('stage_order')

    // Get production tracking data
    const { data: productionTracking } = await supabase
      .from('production_tracking')
      .select(`
        *,
        production_stages(name, stage_order, target_duration),
        orders(customer_name, total_value, delivery_date)
      `)
      .gte('created_at', startDate)

    // Get production milestones for completion data
    const { data: milestones } = await supabase
      .from('production_milestones')
      .select('*')
      .gte('created_at', startDate)

    // Get manufacturers data
    const { data: manufacturers } = await supabase
      .from('manufacturers')
      .select('*')

    // Calculate stage metrics
    const stageMetrics = safeArrayAccess<ProductionStage>(stages).map((stage: ProductionStage) => {
      const itemsInStage = safeArrayAccess<ProductionTracking>(productionTracking).filter((item: ProductionTracking) => 
        safeProp<string>(item, 'current_stage_id') === stage.id
      )
      
      const avgDuration = calculateAverageStageDuration(stage.id, safeArrayAccess<ProductionTracking>(productionTracking))
      const targetDuration = safeNumber(stage.target_duration, 3) // Default 3 days
      const bottleneckScore = targetDuration > 0 
        ? Math.max(0, safeDivide(avgDuration - targetDuration, targetDuration)) 
        : 0

      return {
        stage: stage.name,
        stage_order: stage.stage_order,
        item_count: itemsInStage.length,
        avg_duration: avgDuration,
        target_duration: targetDuration,
        bottleneck_score: bottleneckScore,
        utilization: Math.min(100, safeMultiply(safeDivide(itemsInStage.length, 10), 100)) // Assume max 10 items per stage
      }
    })

    // Calculate overall metrics
    const totalItems = safeArrayAccess<ProductionTracking>(productionTracking).length
    // Calculate completed items from milestones
    const completedItems = safeArrayAccess<ProductionMilestone>(milestones).filter((m: ProductionMilestone) => 
      safeProp<string>(m, 'milestone_type') === 'completed'
    ).length
    const onTimeItems = calculateOnTimeDeliveries(safeArrayAccess<ProductionTracking>(productionTracking))
    
    const efficiency_rate = calculateEfficiencyRate(safeArrayAccess<ProductionTracking>(productionTracking), safeArrayAccess<ProductionStage>(stages))
    const average_lead_time = calculateAverageLeadTime(safeArrayAccess<ProductionTracking>(productionTracking))
    const quality_pass_rate = calculateQualityPassRate(safeArrayAccess<ProductionMilestone>(milestones))
    const on_time_delivery = totalItems > 0 ? safeMultiply(safeDivide(onTimeItems, totalItems), 100) : 100
    const current_wip = safeArrayAccess<ProductionTracking>(productionTracking).filter((item: ProductionTracking) => 
      !['completed', 'shipped', 'delivered'].includes(safeProp<string>(item, 'status') || '')
    ).length
    const capacity_utilization = calculateCapacityUtilization(stageMetrics)

    // Generate daily metrics for the past 30 days
    const daily_metrics = generateDailyMetrics(
      safeArrayAccess<ProductionTracking>(productionTracking), 
      safeArrayAccess<ProductionMilestone>(milestones), 
      30
    )

    // Calculate production funnel
    const production_funnel = stageMetrics.map((stage: any, index: number) => ({
      stage: stage.stage,
      item_count: stage.item_count,
      conversion_rate: index === 0 ? 100 : 
        stageMetrics[0].item_count > 0 
          ? safeMultiply(safeDivide(stage.item_count, stageMetrics[0].item_count), 100)
          : 100
    }))

    // Calculate manufacturer performance
    const manufacturer_performance = safeArrayAccess<any>(manufacturers).map((manufacturer: any) => {
      const manufacturerItems = safeArrayAccess<ProductionTracking>(productionTracking).filter((item: ProductionTracking) => 
        safeProp<string>(item, 'manufacturer_id') === safeProp<string>(manufacturer, 'id')
      )
      
      return {
        name: safeProp<string>(manufacturer, 'name') || 'Unknown',
        efficiency_rate: calculateManufacturerEfficiency(manufacturerItems as unknown as ManufacturerItem[]),
        quality_score: calculateManufacturerQuality(manufacturerItems as unknown as ManufacturerItem[]),
        avg_lead_time: calculateAverageLeadTime(manufacturerItems),
        current_load: manufacturerItems.filter((item: ProductionTracking) => 
          !['completed', 'shipped'].includes(safeProp<string>(item, 'status') || '')
        ).length
      }
    })

    const analytics: ProductionAnalytics = {
      efficiency_rate,
      average_lead_time,
      quality_pass_rate,
      on_time_delivery,
      current_wip,
      capacity_utilization,
      stage_metrics: stageMetrics,
      daily_metrics,
      production_funnel,
      manufacturer_performance
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Production analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function getStartDate(period: string): string {
  const now = new Date()
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
}

function calculateAverageStageDuration(stageId: string, tracking: ProductionTracking[]): number {
  const stageItems = tracking.filter(item => safeProp<string>(item, 'current_stage_id') === stageId)
  if (stageItems.length === 0) return 0
  
  const durations = stageItems.map(item => {
    const stageStarted = safeProp<string>(item, 'stage_started_at')
    const createdAt = safeProp<string>(item, 'created_at')
    const start = new Date(stageStarted || createdAt || new Date().toISOString())
    const now = new Date()
    return Math.ceil(safeDivide(now.getTime() - start.getTime(), 1000 * 60 * 60 * 24))
  })
  
  return safeDivide(durations.reduce((sum, duration) => safeAdd(sum, duration), 0), durations.length)
}

function calculateEfficiencyRate(tracking: ProductionTracking[], stages: ProductionStage[]): number {
  if (tracking.length === 0 || stages.length === 0) return 85 // Default mock value
  
  let totalEfficiency = 0
  let stageCount = 0
  
  stages.forEach(stage => {
    const stageItems = tracking.filter(item => safeProp<string>(item, 'current_stage_id') === safeProp<string>(stage, 'id'))
    if (stageItems.length > 0) {
      const avgDuration = calculateAverageStageDuration(stage.id, tracking)
      const targetDuration = safeNumber(stage.target_duration, 3)
      const stageEfficiency = Math.min(100, safeMultiply(safeDivide(targetDuration, avgDuration), 100))
      totalEfficiency = safeAdd(totalEfficiency, stageEfficiency)
      stageCount++
    }
  })
  
  return stageCount > 0 ? safeDivide(totalEfficiency, stageCount) : 85
}

function calculateAverageLeadTime(tracking: ProductionTracking[]): number {
  if (tracking.length === 0) return 14.5 // Default mock value
  
  const completedItems = tracking.filter(item => safeProp<string>(item, 'completed_at'))
  if (completedItems.length === 0) return 14.5
  
  const leadTimes = completedItems.map(item => {
    const createdAt = safeProp<string>(item, 'created_at')
    const completedAt = safeProp<string>(item, 'completed_at')
    const start = new Date(createdAt || new Date().toISOString())
    const end = new Date(completedAt || new Date().toISOString())
    return Math.ceil(safeDivide(end.getTime() - start.getTime(), 1000 * 60 * 60 * 24))
  })
  
  return safeDivide(leadTimes.reduce((sum, time) => safeAdd(sum, time), 0), leadTimes.length)
}

function calculateQualityPassRate(milestones: ProductionMilestone[]): number {
  const qcMilestones = milestones.filter(m => safeProp<string>(m, 'milestone_type') === 'quality_check')
  if (qcMilestones.length === 0) return 94 // Default mock value
  
  const passedQC = qcMilestones.filter(m => {
    const status = safeProp<string>(m, 'status')
    return status === 'passed' || status === 'completed'
  })
  return safeMultiply(safeDivide(passedQC.length, qcMilestones.length), 100)
}

function calculateOnTimeDeliveries(tracking: ProductionTracking[]): number {
  return tracking.filter(item => {
    const deliveryDate = safeGet(item, ['orders', 'delivery_date']) as string
    const completedAt = safeProp<string>(item, 'completed_at')
    if (!deliveryDate || !completedAt) return false
    return new Date(completedAt) <= new Date(deliveryDate)
  }).length
}

function calculateCapacityUtilization(stageMetrics: Array<{utilization: number}>): number {
  if (stageMetrics.length === 0) return 0
  return safeDivide(stageMetrics.reduce((sum, stage) => safeAdd(sum, stage.utilization), 0), stageMetrics.length)
}

function generateDailyMetrics(tracking: ProductionTracking[], milestones: ProductionMilestone[], days: number): DailyMetric[] {
  const metrics = []
  const now = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayCompleted = milestones.filter(m => {
      const completedAt = safeProp<string>(m, 'completed_at')
      return completedAt && completedAt.startsWith(dateStr)
    }).length
    
    const dayStarted = tracking.filter(t => {
      const createdAt = safeProp<string>(t, 'created_at')
      return createdAt && createdAt.startsWith(dateStr)
    }).length
    
    const itemsInProgress = tracking.filter(t => {
      const createdAt = safeProp<string>(t, 'created_at')
      const completedAt = safeProp<string>(t, 'completed_at')
      return createdAt && new Date(createdAt) <= date && 
        (!completedAt || new Date(completedAt) > date)
    }).length
    
    // Mock efficiency calculation based on completion vs target
    const efficiency = Math.min(100, Math.max(60, 85 + Math.random() * 20 - 10))
    
    metrics.push({
      date: dateStr,
      efficiency: Math.round(efficiency * 10) / 10,
      completed: dayCompleted,
      started: dayStarted,
      items_in_progress: itemsInProgress
    })
  }
  
  return metrics
}

function calculateManufacturerEfficiency(items: ManufacturerItem[]): number {
  if (items.length === 0) return 85
  return Math.min(100, 75 + Math.random() * 25) // Mock calculation
}

function calculateManufacturerQuality(items: ManufacturerItem[]): number {
  if (items.length === 0) return 90
  return Math.min(100, 85 + Math.random() * 15) // Mock calculation
}