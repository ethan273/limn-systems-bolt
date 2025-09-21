/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { errorResponses } from '@/lib/error-handling/error-middleware'
// import { secureLogger } from '@/lib/logging/secure-logger' // Unused

export async function GET(request: NextRequest) {
  // Apply financial read operations rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.financial_read_secure)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    const supabase = await createServerSupabaseClient()

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    // Fetch all payment transactions for the period
    const { data: transactions, error } = await supabase
      .from('payment_transactions')
      .select(`
        type,
        amount,
        status,
        quickbooks_sync_status,
        created_date,
        net_amount
      `)
      .gte('created_date', startDate.toISOString())
      .lte('created_date', endDate.toISOString())

    if (error) {
      return await errorResponses.database(error, request)
    }

    if (!transactions || transactions.length === 0) {
      // Return fallback data if no transactions exist
      return NextResponse.json({
        success: true,
        data: {
          total_incoming: 0,
          total_outgoing: 0,
          net_position: 0,
          pending_incoming: 0,
          pending_outgoing: 0,
          completed_today: 0,
          failed_count: 0,
          reconciliation_pending: 0
        }
      })
    }

    // Calculate summary metrics
    const today = new Date().toISOString().split('T')[0]
    
    const totalIncoming = transactions
      .filter((t: any) => t.type === 'incoming')
      .reduce((sum: any, t: any) => sum + (t.net_amount || 0), 0)

    const totalOutgoing = transactions
      .filter((t: any) => t.type === 'outgoing')
      .reduce((sum: any, t: any) => sum + (t.net_amount || 0), 0)

    const pendingIncoming = transactions
      .filter((t: any) => t.type === 'incoming' && ['pending', 'processing'].includes(t.status))
      .reduce((sum: any, t: any) => sum + (t.net_amount || 0), 0)

    const pendingOutgoing = transactions
      .filter((t: any) => t.type === 'outgoing' && ['pending', 'processing'].includes(t.status))
      .reduce((sum: any, t: any) => sum + (t.net_amount || 0), 0)

    const completedToday = transactions
      .filter((t: any) => t.status === 'completed' && t.created_date.startsWith(today))
      .length

    const failedCount = transactions
      .filter((t: any) => t.status === 'failed')
      .length

    const reconciliationPending = transactions
      .filter((t: any) => ['pending', 'failed'].includes(t.quickbooks_sync_status))
      .length

    const summary = {
      total_incoming: totalIncoming,
      total_outgoing: totalOutgoing,
      net_position: totalIncoming - totalOutgoing,
      pending_incoming: pendingIncoming,
      pending_outgoing: pendingOutgoing,
      completed_today: completedToday,
      failed_count: failedCount,
      reconciliation_pending: reconciliationPending
    }

    return NextResponse.json({
      success: true,
      data: summary,
      period,
      transaction_count: transactions.length
    })

  } catch (error) {
    return await errorResponses.internal(error as Error, request)
  }
}