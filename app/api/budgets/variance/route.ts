/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface VarianceAnalysis {
  period: string
  categories: Array<{
    name: string
    budget: number
    actual: number
    variance: number
    variance_percent: number
    trend: 'up' | 'down' | 'stable'
  }>
  insights: {
    top_overruns: Array<{ category: string; amount: number; percent: number }>
    top_savings: Array<{ category: string; amount: number; percent: number }>
    projected_year_end: number
    recommendations: string[]
  }
  chart_data: {
    waterfall: Array<{ category: string; value: number; type: 'budget' | 'actual' | 'variance' }>
    trend: Array<{ month: string; budget: number; actual: number }>
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const searchParams = request.nextUrl.searchParams
  
  const period_id = searchParams.get('period_id')
  // // const compare_period = searchParams.get('compare_period')

  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current period data
    const { data: currentPeriod } = await supabase
      .from('financial_periods')
      .select('*')
      .eq('id', period_id || '')
      .single()

    if (!currentPeriod) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    // Get budgets for the selected period
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('period_id', period_id || '')

    if (budgetError) {
      console.error('Error fetching budgets:', budgetError)
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
    }

    // Get cost tracking data for the period
    const { data: costs, error: costError } = await supabase
      .from('cost_tracking')
      .select('*')
      .gte('created_at', currentPeriod.start_date)
      .lte('created_at', currentPeriod.end_date)

    if (costError) {
      console.error('Error fetching costs:', costError)
      return NextResponse.json({ error: 'Failed to fetch cost data' }, { status: 500 })
    }

    // Group by category and calculate variances
    const categoryData = new Map<string, { budget: number; actual: number }>()

    // Initialize with budget data
    budgets?.forEach((budget: any) => {
      const category = budget.category || 'General'
      const existing = categoryData.get(category) || { budget: 0, actual: 0 }
      categoryData.set(category, {
        budget: existing.budget + budget.amount,
        actual: existing.actual
      })
    })

    // Add actual costs
    costs?.forEach((cost: any) => {
      const category = cost.category || 'General'
      const existing = categoryData.get(category) || { budget: 0, actual: 0 }
      categoryData.set(category, {
        budget: existing.budget,
        actual: existing.actual + (cost.amount || 0)
      })
    })

    // Convert to categories array with variance calculations
    const categories = Array.from(categoryData.entries()).map(([name, data]) => {
      const variance = data.actual - data.budget
      const variance_percent = data.budget > 0 ? (variance / data.budget) * 100 : 0
      
      // Determine trend (for now, using variance as proxy)
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (variance_percent > 5) trend = 'up'
      else if (variance_percent < -5) trend = 'down'

      return {
        name,
        budget: data.budget,
        actual: data.actual,
        variance,
        variance_percent,
        trend
      }
    })

    // Calculate insights
    const overruns = categories
      .filter(cat => cat.variance > 0)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 3)
      .map(cat => ({
        category: cat.name,
        amount: cat.variance,
        percent: cat.variance_percent
      }))

    const savings = categories
      .filter(cat => cat.variance < 0)
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 3)
      .map(cat => ({
        category: cat.name,
        amount: Math.abs(cat.variance),
        percent: Math.abs(cat.variance_percent)
      }))

    // Calculate projected year-end (simple extrapolation)
    const totalActual = categories.reduce((sum, cat) => sum + cat.actual, 0)
    const periodStart = new Date(currentPeriod.start_date)
    const periodEnd = new Date(currentPeriod.end_date)
    const now = new Date()
    
    const periodDuration = periodEnd.getTime() - periodStart.getTime()
    const elapsedTime = Math.min(now.getTime() - periodStart.getTime(), periodDuration)
    const completionRatio = elapsedTime / periodDuration
    
    const projected_year_end = completionRatio > 0 ? (totalActual / completionRatio) * 4 : totalActual * 4 // Assuming quarterly periods

    // Generate recommendations
    const recommendations: string[] = []
    
    if (overruns.length > 0) {
      recommendations.push(`Monitor ${overruns[0].category} spending - currently ${overruns[0].percent.toFixed(1)}% over budget`)
    }
    
    if (savings.length > 0) {
      recommendations.push(`Consider reallocating unused budget from ${savings[0].category} to over-budget categories`)
    }

    const totalVariance = categories.reduce((sum, cat) => sum + cat.variance, 0)
    if (totalVariance > 0) {
      recommendations.push('Implement spending controls to prevent further overruns')
    } else {
      recommendations.push('Current spending is within budget targets')
    }

    // Prepare chart data
    const waterfall = [
      { category: 'Budget', value: categories.reduce((sum, cat) => sum + cat.budget, 0), type: 'budget' as const },
      { category: 'Actual', value: categories.reduce((sum, cat) => sum + cat.actual, 0), type: 'actual' as const },
      { category: 'Variance', value: totalVariance, type: 'variance' as const }
    ]

    // Generate monthly trend data (mock for now - would need historical data)
    const trend = Array.from({ length: 3 }, (_, i) => ({
      month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      budget: categories.reduce((sum, cat) => sum + cat.budget, 0) / 3,
      actual: categories.reduce((sum, cat) => sum + cat.actual, 0) / 3 * (1 + i * 0.1)
    }))

    const response: VarianceAnalysis = {
      period: currentPeriod.name,
      categories,
      insights: {
        top_overruns: overruns,
        top_savings: savings,
        projected_year_end,
        recommendations
      },
      chart_data: {
        waterfall,
        trend
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Variance analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}