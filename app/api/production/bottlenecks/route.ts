/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface BottleneckAnalysis {
  bottlenecks: Array<{
    stage: string
    stage_order: number
    severity: 'critical' | 'warning' | 'minor'
    items_affected: number
    avg_delay: number
    avg_duration: number
    target_duration: number
    variance_percent: number
    root_causes: string[]
    recommendations: string[]
    trend: 'improving' | 'stable' | 'worsening'
  }>
  impact_analysis: {
    total_items_delayed: number
    average_delay_days: number
    cost_impact_estimate: number
    customer_impact_score: number
  }
  historical_trends: Array<{
    week: string
    stage: string
    avg_duration: number
    bottleneck_score: number
  }>
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const searchParams = request.nextUrl.searchParams
  
  const analysisDepth = searchParams.get('depth') || 'standard' // standard, detailed

  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get production stages with targets
    const { data: stages } = await supabase
      .from('production_stages')
      .select('*')
      .order('stage_order')

    // Get production tracking data for analysis
    const { data: productionTracking } = await supabase
      .from('production_tracking')
      .select(`
        *,
        production_stages(name, stage_order, target_duration),
        orders(customer_name, priority, total_value, delivery_date)
      `)
      .gte('created_at', getAnalysisStartDate(30)) // Last 30 days

    // Get production milestones for completion tracking - currently unused
    // await supabase
    //   .from('production_milestones')
    //   .select('*')
    //   .gte('created_at', getAnalysisStartDate(30))

    // Analyze bottlenecks for each stage
    const bottlenecks = (stages || []).map((stage: any) => {
      const stageItems = (productionTracking || []).filter((item: any) => 
        item.current_stage_id === stage.id || 
        (item.stage_history && item.stage_history.some((h: Record<string, unknown>) => h.stage === stage.name))
      )
      
      const analysis = analyzeStageBottleneck(stage, stageItems)
      return analysis
    }).filter((bottleneck: any) => bottleneck.severity !== 'none') // Only include actual bottlenecks

    // Calculate overall impact
    const impactAnalysis = calculateImpactAnalysis(bottlenecks, productionTracking || [])

    // Generate historical trends (if detailed analysis requested)
    const historicalTrends = analysisDepth === 'detailed' 
      ? generateHistoricalTrends(stages || [], productionTracking || [])
      : []

    const analysis: BottleneckAnalysis = {
      bottlenecks: bottlenecks as Array<{
        stage: string
        stage_order: number
        severity: 'critical' | 'warning' | 'minor'
        items_affected: number
        avg_delay: number
        avg_duration: number
        target_duration: number
        variance_percent: number
        root_causes: string[]
        recommendations: string[]
        trend: 'improving' | 'stable' | 'worsening'
      }>,
      impact_analysis: impactAnalysis,
      historical_trends: historicalTrends
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Bottleneck analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function getAnalysisStartDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function analyzeStageBottleneck(stage: Record<string, unknown>, stageItems: Record<string, unknown>[]) {
  const targetDuration = (stage.target_duration as number) || 3
  const currentItems = stageItems.filter(item => item.current_stage_id === stage.id)
  
  // Calculate durations for items that have passed through this stage
  const completedStageItems = stageItems.filter(item => 
    item.stage_history && 
    Array.isArray(item.stage_history) &&
    (item.stage_history as Record<string, unknown>[]).some((h: Record<string, unknown>) => h.stage === stage.name)
  )
  
  const durations = completedStageItems.map(item => {
    const stageHistory = Array.isArray(item.stage_history) 
      ? (item.stage_history as Record<string, unknown>[]).find((h: Record<string, unknown>) => h.stage === stage.name)
      : undefined
    if (stageHistory && stageHistory.duration) {
      return stageHistory.duration as number
    }
    // Estimate duration based on timestamps
    const stageStart = new Date((item.stage_started_at as string) || (item.created_at as string))
    const stageEnd = new Date((stageHistory?.timestamp as string) || (item.updated_at as string))
    return Math.ceil((stageEnd.getTime() - stageStart.getTime()) / (1000 * 60 * 60 * 24))
  }).filter(d => d > 0)
  
  const avgDuration = durations.length > 0 
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
    : targetDuration
  
  const avgDelay = Math.max(0, avgDuration - targetDuration)
  const variancePercent = targetDuration > 0 ? (avgDelay / targetDuration) * 100 : 0
  
  // Determine severity
  let severity: 'critical' | 'warning' | 'minor' | 'none' = 'none'
  if (variancePercent > 50 || currentItems.length > 8) severity = 'critical'
  else if (variancePercent > 25 || currentItems.length > 5) severity = 'warning'
  else if (variancePercent > 10 || currentItems.length > 3) severity = 'minor'
  
  // Generate root causes based on analysis
  const rootCauses = generateRootCauses(stage, currentItems, avgDelay, variancePercent)
  
  // Generate recommendations
  const recommendations = generateStageRecommendations(stage, severity, currentItems.length, avgDelay)
  
  // Determine trend (simplified - would need historical data for accurate trend)
  const trend = variancePercent > 30 ? 'worsening' : variancePercent < 15 ? 'improving' : 'stable'
  
  return {
    stage: (stage.name as string) || 'Unknown Stage',
    stage_order: (stage.stage_order as number) || 0,
    severity,
    items_affected: currentItems.length,
    avg_delay: Math.round(avgDelay * 10) / 10,
    avg_duration: Math.round(avgDuration * 10) / 10,
    target_duration: targetDuration,
    variance_percent: Math.round(variancePercent * 10) / 10,
    root_causes: rootCauses,
    recommendations,
    trend
  }
}

function generateRootCauses(stage: Record<string, unknown>, currentItems: Record<string, unknown>[], avgDelay: number, variancePercent: number): string[] {
  const causes = []
  
  if (currentItems.length > 6) {
    causes.push('High volume of items queued in stage')
  }
  
  if (avgDelay > 2) {
    causes.push('Stage duration exceeds target by significant margin')
  }
  
  if (variancePercent > 40) {
    causes.push('High variability in processing time')
  }
  
  // Stage-specific causes
  switch ((stage.name as string || '').toLowerCase()) {
    case 'design':
      if (variancePercent > 25) causes.push('Complex design requirements or client revisions')
      break
    case 'cutting':
      if (avgDelay > 1) causes.push('Material preparation delays or equipment issues')
      break
    case 'assembly':
      if (currentItems.length > 4) causes.push('Limited assembly workspace or skilled labor')
      break
    case 'finishing':
      if (avgDelay > 2) causes.push('Drying time, weather conditions, or quality requirements')
      break
    case 'qc':
      if (variancePercent > 30) causes.push('Quality issues requiring rework')
      break
  }
  
  if (causes.length === 0) {
    causes.push('Stage is performing within normal parameters')
  }
  
  return causes
}

function generateStageRecommendations(stage: Record<string, unknown>, severity: string, itemCount: number, avgDelay: number): string[] {
  const recommendations = []
  
  if (severity === 'critical') {
    recommendations.push('Immediate attention required - reallocate resources to this stage')
    if (itemCount > 8) {
      recommendations.push('Consider parallel processing or additional workstations')
    }
  }
  
  if (severity === 'warning') {
    recommendations.push('Monitor closely and prepare contingency plans')
  }
  
  if (avgDelay > 2) {
    recommendations.push('Review stage processes for optimization opportunities')
  }
  
  // Stage-specific recommendations
  switch ((stage.name as string || '').toLowerCase()) {
    case 'design':
      recommendations.push('Consider design templates or standardization')
      break
    case 'cutting':
      recommendations.push('Pre-cut materials during low-demand periods')
      break
    case 'assembly':
      recommendations.push('Cross-train staff or consider sub-assembly processes')
      break
    case 'finishing':
      recommendations.push('Optimize environmental conditions or batch similar items')
      break
    case 'qc':
      recommendations.push('Implement upstream quality controls to reduce rework')
      break
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Continue current practices - stage is performing well')
  }
  
  return recommendations
}

function calculateImpactAnalysis(bottlenecks: Record<string, unknown>[], productionTracking: Record<string, unknown>[]) {
  const totalItemsDelayed = bottlenecks.reduce((sum, b) => sum + (b.items_affected as number || 0), 0)
  const averageDelayDays = bottlenecks.length > 0 
    ? bottlenecks.reduce((sum, b) => sum + (b.avg_delay as number || 0), 0) / bottlenecks.length 
    : 0
  
  // Estimate cost impact (simplified calculation)
  const dailyCostPerItem = 50 // Daily holding/opportunity cost per item
  const costImpactEstimate = totalItemsDelayed * averageDelayDays * dailyCostPerItem
  
  // Customer impact score (0-100, higher is worse)
  const urgentItems = productionTracking.filter(item => 
    (item.orders as { priority?: string })?.priority === 'urgent' && 
    bottlenecks.some(b => item.current_stage_id && (b.stage as string) === (item.production_stages as { name?: string })?.name)
  ).length
  
  const customerImpactScore = Math.min(100, (urgentItems / Math.max(1, productionTracking.length)) * 100 + averageDelayDays * 5)
  
  return {
    total_items_delayed: totalItemsDelayed,
    average_delay_days: Math.round(averageDelayDays * 10) / 10,
    cost_impact_estimate: Math.round(costImpactEstimate),
    customer_impact_score: Math.round(customerImpactScore * 10) / 10
  }
}

function generateHistoricalTrends(stages: Record<string, unknown>[], productionTracking: Record<string, unknown>[]): Array<{ week: string; stage: string; avg_duration: number; bottleneck_score: number; }> {
  const trends: Array<{ week: string; stage: string; avg_duration: number; bottleneck_score: number; }> = []
  const weeksBack = 8
  
  for (let week = weeksBack - 1; week >= 0; week--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (week + 1) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    
    const weekStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
    
    stages.forEach(stage => {
      productionTracking.filter(item => {
        const itemDate = new Date(item.created_at as string)
        return itemDate >= weekStart && itemDate < weekEnd && 
               item.current_stage_id === stage.id
      })
      
      // Mock historical data - in production this would come from historical records
      const targetDuration = (stage.target_duration as number) || 3
      const avgDuration = targetDuration + Math.random() * 2
      const bottleneckScore = Math.max(0, (avgDuration - targetDuration) / targetDuration)
      
      trends.push({
        week: weekStr,
        stage: (stage.name as string) || 'Unknown',
        avg_duration: Math.round(avgDuration * 10) / 10,
        bottleneck_score: Math.round(bottleneckScore * 100) / 100
      })
    })
  }
  
  return trends
}