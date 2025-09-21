// Dashboard Analytics Widget Components
// Phase 2 Implementation

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { safeFormatString } from '@/lib/utils/string-helpers'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Revenue Widget
export const RevenueWidget: React.FC = () => {
  const [data, setData] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchRevenueData = useCallback(async () => {
    // Get recent orders for revenue calculation
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, order_date')
      .gte('order_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (!error && orders) {
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      const previousPeriodStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      const previousPeriodEnd = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('order_date', previousPeriodStart.toISOString())
        .lt('order_date', previousPeriodEnd.toISOString())

      const previousRevenue = previousOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const changePercent = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

      setData([{
        metric_name: 'revenue',
        metric_value: totalRevenue,
        change_percent: changePercent
      }])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchRevenueData()
  }, [fetchRevenueData])

  if (loading) return <div className="animate-pulse h-32 bg-gray-200 rounded" />

  const revenueMetric = data.find(d => safeGet(d, ['metric_name']) === 'revenue')
  const changePercent = Number(safeGet(revenueMetric, ['change_percent']) || 0)
  const isPositive = changePercent >= 0

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900">Revenue (30 days)</h3>
      <div className="mt-2">
        <p className="text-3xl font-bold text-gray-900">
          ${Number(safeGet(revenueMetric, ['metric_value']) || 0).toLocaleString()}
        </p>
        <p className={`text-sm mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}% from last period
        </p>
      </div>
    </div>
  )
}

// Order Trend Chart
export const OrderTrendChart: React.FC = () => {
  const [data, setData] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchOrderTrends = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('order_date, total_amount')
      .gte('order_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('order_date')

    if (!error && data) {
      // Group by date
      const grouped = data.reduce((acc: Record<string, { date: string; revenue: number; orders: number }>, order) => {
        const date = new Date(order.order_date).toLocaleDateString()
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, orders: 0 }
        }
        acc[date].revenue += order.total_amount || 0
        acc[date].orders += 1
        return acc
      }, {})

      setData(Object.values(grouped))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchOrderTrends()
  }, [fetchOrderTrends])

  if (loading) return <div className="animate-pulse h-64 bg-gray-200 rounded" />

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Trends (30 days)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
          <Line type="monotone" dataKey="orders" stroke="#82ca9d" name="Orders" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Production Status Widget
export const ProductionStatusWidget: React.FC = () => {
  const [data, setData] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchProductionStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from('production_items')
      .select('production_stage')
      .eq('is_active', true)

    if (!error && data) {
      // Count by stage
      const stageCounts = data.reduce((acc: Record<string, number>, item) => {
        const stage = item.production_stage || 'unknown'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {})

      const chartData = Object.entries(stageCounts).map(([stage, count]) => ({
        name: safeFormatString(stage, 'unknown').toUpperCase(),
        value: count as number
      }))

      setData(chartData)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchProductionStatus()
  }, [fetchProductionStatus])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (loading) return <div className="animate-pulse h-64 bg-gray-200 rounded" />

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Status</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Payment Status Widget
export const PaymentStatusWidget: React.FC = () => {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchPaymentStatus = useCallback(async () => {
    // Get overdue invoices
    const { data: overdueInvoices, error: overdueError } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('status', 'overdue')

    // Get pending payments from payment queue if table exists
    const { data: pendingPayments } = await supabase
      .from('quickbooks_payment_queue')
      .select('amount')
      .eq('status', 'pending')
      .limit(1)

    if (!overdueError) {
      const overdueAmount = overdueInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
      const pendingAmount = pendingPayments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0

      setData({
        overdue: overdueAmount,
        pending: pendingAmount,
        overdueCount: overdueInvoices?.length || 0,
        pendingCount: pendingPayments?.length || 0
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPaymentStatus()
  }, [fetchPaymentStatus])

  if (loading) return <div className="animate-pulse h-32 bg-gray-200 rounded" />

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Overdue</p>
          <p className="text-xl font-bold text-red-600">
            ${Number(safeGet(data, ['overdue']) || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">{Number(safeGet(data, ['overdueCount']) || 0)} invoices</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-xl font-bold text-yellow-600">
            ${Number(safeGet(data, ['pending']) || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">{Number(safeGet(data, ['pendingCount']) || 0)} payments</p>
        </div>
      </div>
    </div>
  )
}

// SMS Performance Widget
export const SMSPerformanceWidget: React.FC = () => {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchSMSPerformance = useCallback(async () => {
    // Get today's SMS analytics
    const today = new Date().toISOString().split('T')[0]
    
    const { data: analytics, error } = await supabase
      .from('sms_analytics')
      .select('*')
      .eq('date', today)
      .single()

    if (!error && analytics) {
      setData(analytics)
    } else {
      // Get from sms_logs if no analytics table
      const { data: logs } = await supabase
        .from('sms_logs')
        .select('status')
        .gte('created_at', new Date(today).toISOString())

      if (logs) {
        const sent = logs.filter(l => l.status === 'sent').length
        const failed = logs.filter(l => l.status === 'failed').length
        
        setData({
          total_sent: sent,
          total_failed: failed,
          success_rate: sent > 0 ? (sent / (sent + failed)) * 100 : 0
        })
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSMSPerformance()
  }, [fetchSMSPerformance])

  if (loading) return <div className="animate-pulse h-32 bg-gray-200 rounded" />

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">SMS Performance Today</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-600">Sent</p>
          <p className="text-xl font-bold text-green-600">{Number(safeGet(data, ['total_sent']) || 0)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Failed</p>
          <p className="text-xl font-bold text-red-600">{Number(safeGet(data, ['total_failed']) || 0)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Success Rate</p>
          <p className="text-xl font-bold text-blue-600">
            {Number(safeGet(data, ['success_rate']) || 0).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  )
}