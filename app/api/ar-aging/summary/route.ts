/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch all outstanding invoices with customer information
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        amount_paid,
        amount_due,
        invoice_date,
        due_date,
        status,
        customer_id,
        customers:customer_id(
          id,
          name,
          company_name,
          email,
          phone,
          credit_limit,
          payment_terms
        )
      `)
      .in('status', ['sent', 'overdue', 'partial'])
      .gt('amount_due', 0)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch AR data' }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      // Return fallback data if no outstanding invoices
      return NextResponse.json({
        success: true,
        data: {
          total_outstanding: 0,
          total_overdue: 0,
          weighted_average_days: 0,
          dso: 0,
          collection_efficiency: 100,
          aging_buckets: [
            { range: 'Current (0-15 days)', days_min: 0, days_max: 15, count: 0, total_amount: 0, percentage: 0, color: '#10B981', risk_level: 'low' },
            { range: '16-30 days', days_min: 16, days_max: 30, count: 0, total_amount: 0, percentage: 0, color: '#3B82F6', risk_level: 'low' },
            { range: '31-45 days', days_min: 31, days_max: 45, count: 0, total_amount: 0, percentage: 0, color: '#F59E0B', risk_level: 'medium' },
            { range: '46-60 days', days_min: 46, days_max: 60, count: 0, total_amount: 0, percentage: 0, color: '#EF4444', risk_level: 'high' },
            { range: '61-90 days', days_min: 61, days_max: 90, count: 0, total_amount: 0, percentage: 0, color: '#DC2626', risk_level: 'high' },
            { range: '90+ days', days_min: 90, days_max: null, count: 0, total_amount: 0, percentage: 0, color: '#991B1B', risk_level: 'critical' }
          ],
          trending: {
            current_vs_prior: 0,
            improvement_trend: 'stable' as const
          }
        }
      })
    }

    // Calculate aging for each invoice
    const today = new Date()
    const invoicesWithAging = invoices.map((invoice: any) => {
      const dueDate = new Date(invoice.due_date)
      const daysOutstanding = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...invoice,
        days_outstanding: Math.max(0, daysOutstanding) // Don't go negative for early payments
      }
    })

    // Define aging buckets
    const buckets = [
      { range: 'Current (0-15 days)', days_min: 0, days_max: 15, color: '#10B981', risk_level: 'low' as const },
      { range: '16-30 days', days_min: 16, days_max: 30, color: '#3B82F6', risk_level: 'low' as const },
      { range: '31-45 days', days_min: 31, days_max: 45, color: '#F59E0B', risk_level: 'medium' as const },
      { range: '46-60 days', days_min: 46, days_max: 60, color: '#EF4444', risk_level: 'high' as const },
      { range: '61-90 days', days_min: 61, days_max: 90, color: '#DC2626', risk_level: 'high' as const },
      { range: '90+ days', days_min: 90, days_max: null, color: '#991B1B', risk_level: 'critical' as const }
    ]

    // Calculate totals
    const totalOutstanding = invoicesWithAging.reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)
    const totalOverdue = invoicesWithAging
      .filter((inv: any) => inv.days_outstanding > 15)
      .reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)

    // Calculate aging buckets
    const agingBuckets = buckets.map(bucket => {
      const bucketInvoices = invoicesWithAging.filter((inv: any) => {
        if (bucket.days_max === null) {
          return inv.days_outstanding >= bucket.days_min
        }
        return inv.days_outstanding >= bucket.days_min && inv.days_outstanding <= bucket.days_max
      })

      const total_amount = bucketInvoices.reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)
      const percentage = totalOutstanding > 0 ? Math.round((total_amount / totalOutstanding) * 100) : 0

      return {
        ...bucket,
        count: bucketInvoices.length,
        total_amount,
        percentage
      }
    })

    // Calculate weighted average days outstanding
    const totalWeightedDays = invoicesWithAging.reduce((sum: any, inv: any) => 
      sum + (inv.days_outstanding * (inv.amount_due || 0)), 0
    )
    const weightedAverageDays = totalOutstanding > 0 ? Math.round(totalWeightedDays / totalOutstanding) : 0

    // Calculate DSO (Days Sales Outstanding) - simplified calculation
    const dso = weightedAverageDays // In a real system, this would use sales data

    // Calculate collection efficiency (placeholder calculation)
    const collectionEfficiency = Math.max(0, Math.min(100, 100 - (totalOverdue / totalOutstanding * 100)))

    // Calculate trending (would need historical data in real implementation)
    const trending = {
      current_vs_prior: Math.random() * 10 - 5, // Placeholder: -5% to +5%
      improvement_trend: totalOverdue < totalOutstanding * 0.2 ? 'improving' as const : 
                        totalOverdue > totalOutstanding * 0.4 ? 'deteriorating' as const : 'stable' as const
    }

    const summary = {
      total_outstanding: totalOutstanding,
      total_overdue: totalOverdue,
      weighted_average_days: weightedAverageDays,
      dso,
      collection_efficiency: Math.round(collectionEfficiency),
      aging_buckets: agingBuckets,
      trending
    }

    return NextResponse.json({
      success: true,
      data: summary,
      invoice_count: invoicesWithAging.length
    })

  } catch (error) {
    console.error('Error calculating AR aging summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}