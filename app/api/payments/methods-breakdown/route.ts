/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/error-handling/error-middleware'
// import { secureLogger } from '@/lib/logging/secure-logger' // Unused

export async function GET(request: NextRequest) {
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

    // Fetch payment transactions grouped by method
    const { data: transactions, error } = await supabase
      .from('payment_transactions')
      .select('method, amount, status, net_amount')
      .gte('created_date', startDate.toISOString())
      .lte('created_date', endDate.toISOString())

    if (error) {
      return await errorResponses.database(error, request)
    }

    if (!transactions || transactions.length === 0) {
      // Return fallback data
      return NextResponse.json({
        success: true,
        data: [
          {
            method: 'ach',
            count: 0,
            total_amount: 0,
            success_rate: 0
          },
          {
            method: 'wire',
            count: 0,
            total_amount: 0,
            success_rate: 0
          },
          {
            method: 'check',
            count: 0,
            total_amount: 0,
            success_rate: 0
          },
          {
            method: 'credit_card',
            count: 0,
            total_amount: 0,
            success_rate: 0
          }
        ]
      })
    }

    // Group transactions by payment method
    const methodGroups = transactions.reduce((groups: Record<string, Array<{method: string, amount: number, status: string, net_amount: number}>>, transaction: any) => {
      const method = transaction.method || 'unknown'
      if (!groups[method]) {
        groups[method] = []
      }
      groups[method].push(transaction)
      return groups
    }, {})

    // Calculate metrics for each method
    const methodBreakdown = Object.entries(methodGroups).map(([method, transactions]: [string, any]) => {
      const count = transactions.length
      const totalAmount = (transactions as any[]).reduce((sum: any, t: any) => sum + (t.net_amount || 0), 0)
      const successfulTransactions = (transactions as any[]).filter((t: any) => t.status === 'completed')
      const successRate = count > 0 ? Math.round((successfulTransactions.length / count) * 100) : 0

      return {
        method,
        count,
        total_amount: totalAmount,
        success_rate: successRate
      }
    })

    // Sort by total amount descending
    methodBreakdown.sort((a, b) => b.total_amount - a.total_amount)

    return NextResponse.json({
      success: true,
      data: methodBreakdown,
      period,
      total_transactions: transactions.length
    })

  } catch (error) {
    return await errorResponses.internal(error as Error, request)
  }
}