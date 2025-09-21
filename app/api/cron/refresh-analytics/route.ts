// Analytics Refresh Cron Job
// Phase 2 Implementation

// Removed unused NextRequest import
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // Calculate SMS analytics
    const { data: smsLogs } = await supabase
      .from('sms_logs')
      .select('*')
      .gte('created_at', today)

    const totalSent = smsLogs?.filter(s => s.status === 'sent').length || 0
    const totalFailed = smsLogs?.filter(s => s.status === 'failed').length || 0
    const successRate = totalSent + totalFailed > 0 ? (totalSent / (totalSent + totalFailed)) * 100 : 0

    // Store SMS analytics
    const { error: smsError } = await supabase
      .from('sms_analytics')
      .upsert({
        date: today,
        total_sent: totalSent,
        total_failed: totalFailed,
        success_rate: successRate,
        updated_at: new Date()
      })

    if (smsError) {
      console.warn('Failed to update SMS analytics:', smsError)
    }

    // Calculate payment analytics
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .gte('created_at', today)

    const totalPayments = payments?.length || 0
    const successfulPayments = payments?.filter(p => p.status === 'completed').length || 0
    const failedPayments = payments?.filter(p => p.status === 'failed').length || 0

    // Store payment analytics
    const { error: paymentError } = await supabase
      .from('performance_metrics')
      .upsert({
        date: today,
        metric_type: 'payments',
        metric_value: totalPayments,
        additional_data: {
          successful: successfulPayments,
          failed: failedPayments,
          success_rate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0
        },
        updated_at: new Date()
      })

    if (paymentError) {
      console.warn('Failed to update payment analytics:', paymentError)
    }

    // Calculate dashboard metrics
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('order_date', today)

    const dailyRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

    // Store dashboard metrics
    const { error: metricsError } = await supabase
      .from('performance_metrics')
      .upsert({
        date: today,
        metric_type: 'revenue',
        metric_value: dailyRevenue,
        updated_at: new Date()
      })

    if (metricsError) {
      console.warn('Failed to update revenue metrics:', metricsError)
    }

    return Response.json({ 
      success: true, 
      message: 'Analytics refreshed successfully',
      data: {
        sms: { sent: totalSent, failed: totalFailed, successRate },
        payments: { total: totalPayments, successful: successfulPayments, failed: failedPayments },
        revenue: { daily: dailyRevenue }
      }
    })

  } catch (error: unknown) {
    console.error('Analytics refresh error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Analytics refresh failed' },
      { status: 500 }
    )
  }
}