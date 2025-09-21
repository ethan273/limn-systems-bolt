/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch all shipping quotes for metrics calculation
    const { data: quotes, error } = await supabase
      .from('shipping_quotes')
      .select(`
        id,
        status,
        service_type,
        carrier,
        quoted_cost,
        actual_cost,
        transit_time_days,
        pickup_date,
        delivery_date,
        created_date,
        requires_approval
      `)
      .gte('created_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch shipping metrics' }, { status: 500 })
    }

    if (!quotes || quotes.length === 0) {
      // Return fallback metrics
      return NextResponse.json({
        success: true,
        data: {
          total_quotes: 0,
          pending_approval: 0,
          in_transit: 0,
          delivered_today: 0,
          average_cost: 0,
          cost_savings: 0,
          on_time_delivery_rate: 100,
          carrier_performance: []
        }
      })
    }

    // Calculate metrics
    const today = new Date().toISOString().split('T')[0]

    const totalQuotes = quotes.length
    const pendingApproval = quotes.filter((q: any) => q.requires_approval && q.status === 'quoted').length
    const inTransit = quotes.filter((q: any) => ['shipped', 'booked'].includes(q.status)).length
    const deliveredToday = quotes.filter((q: any) => 
      q.status === 'delivered' && 
      q.delivery_date && 
      q.delivery_date.startsWith(today)
    ).length

    // Calculate average cost
    const quotesWithCost = quotes.filter((q: any) => q.quoted_cost > 0)
    const averageCost = quotesWithCost.length > 0 
      ? quotesWithCost.reduce((sum: any, q: any) => sum + q.quoted_cost, 0) / quotesWithCost.length
      : 0

    // Calculate cost savings (quoted vs actual)
    const quotesWithActualCost = quotes.filter((q: any) => q.actual_cost && q.quoted_cost)
    const costSavings = quotesWithActualCost.length > 0
      ? quotesWithActualCost.reduce((sum: any, q: any) => sum + (q.quoted_cost - (q.actual_cost || 0)), 0)
      : 0

    // Calculate on-time delivery rate
    const deliveredQuotes = quotes.filter((q: any) => q.status === 'delivered' && q.pickup_date && q.delivery_date)
    let onTimeDeliveries = 0
    
    deliveredQuotes.forEach((quote: any) => {
      if (quote.pickup_date && quote.delivery_date) {
        const pickupDate = new Date(quote.pickup_date)
        const deliveryDate = new Date(quote.delivery_date)
        const actualTransitDays = Math.ceil((deliveryDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (actualTransitDays <= quote.transit_time_days) {
          onTimeDeliveries++
        }
      }
    })

    const onTimeDeliveryRate = deliveredQuotes.length > 0 
      ? Math.round((onTimeDeliveries / deliveredQuotes.length) * 100)
      : 100

    // Calculate carrier performance
    const carrierGroups = quotes.reduce((groups: Record<string, typeof quotes>, quote: any) => {
      const carrier = quote.carrier || 'unknown'
      if (!groups[carrier]) {
        groups[carrier] = []
      }
      groups[carrier].push(quote)
      return groups
    }, {})

    const carrierPerformance = Object.entries(carrierGroups).map(([carrier, carrierQuotes]: [string, any]) => {
      const quoteCount = (carrierQuotes as any[]).length
      const avgCost = (carrierQuotes as any[])
        .filter((q: any) => q.quoted_cost > 0)
        .reduce((sum: any, q: any) => sum + q.quoted_cost, 0) / Math.max(1, (carrierQuotes as any[]).filter((q: any) => q.quoted_cost > 0).length)
      
      // Calculate on-time rate for this carrier
      const carrierDelivered = (carrierQuotes as any[]).filter((q: any) => 
        q.status === 'delivered' && q.pickup_date && q.delivery_date
      )
      let carrierOnTime = 0
      
      carrierDelivered.forEach((quote: any) => {
        if (quote.pickup_date && quote.delivery_date) {
          const pickupDate = new Date(quote.pickup_date)
          const deliveryDate = new Date(quote.delivery_date)
          const actualTransitDays = Math.ceil((deliveryDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (actualTransitDays <= quote.transit_time_days) {
            carrierOnTime++
          }
        }
      })

      const onTimeRate = carrierDelivered.length > 0 
        ? Math.round((carrierOnTime / carrierDelivered.length) * 100)
        : 100

      // Calculate success rate (completed quotes vs total)
      const successfulQuotes = (carrierQuotes as any[]).filter((q: any) => 
        ['delivered', 'shipped', 'booked'].includes(q.status)
      ).length
      const successRate = Math.round((successfulQuotes / quoteCount) * 100)

      return {
        carrier,
        quote_count: quoteCount,
        avg_cost: Math.round(avgCost),
        on_time_rate: onTimeRate,
        success_rate: successRate
      }
    })

    // Sort carriers by quote count descending
    carrierPerformance.sort((a, b) => b.quote_count - a.quote_count)

    const metrics = {
      total_quotes: totalQuotes,
      pending_approval: pendingApproval,
      in_transit: inTransit,
      delivered_today: deliveredToday,
      average_cost: Math.round(averageCost),
      cost_savings: Math.round(costSavings),
      on_time_delivery_rate: onTimeDeliveryRate,
      carrier_performance: carrierPerformance
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      calculation_period: '90 days',
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error calculating shipping metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}