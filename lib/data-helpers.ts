import { createClient } from '@/lib/supabase/client'
import { safeQuery } from '@/lib/database-error-handler'
import { safeFormatString } from '@/lib/utils/string-helpers'

// Format currency consistently
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0)
}

// Format percentage
export const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`
}

// Validate metric value
export const validateMetric = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }
  console.warn('Invalid metric value:', value)
  return fallback
}

// Calculate months between dates
export const monthsBetween = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) // Approximate months
}

// Get date range filters
export const getDateRange = (period: string) => {
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
    default:
      startDate.setDate(endDate.getDate() - 30)
  }
  
  return { startDate, endDate }
}

// Main dashboard metrics
export async function getDashboardMetrics() {
  
  try {
    const [revenue, orders, production, customers] = await Promise.all([
      getTotalRevenue(),
      getActiveOrders(),
      getProductionQueue(),
      getTotalCustomers()
    ])
    
    return { revenue, orders, production, customers }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return {
      revenue: 0,
      orders: 0,
      production: 0,
      customers: 0
    }
  }
}

export async function getTotalRevenue(startDate?: Date, endDate?: Date) {
  const supabase = createClient()
  
  try {
    // Use orders table instead of invoices table since that's what exists
    let query = supabase.from('orders').select('total_amount')
    
    if (startDate) query = query.gte('created_at', startDate.toISOString())
    if (endDate) query = query.lte('created_at', endDate.toISOString())
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching total revenue:', error)
      return 0
    }
    
    const revenue = data?.reduce((sum, order) => sum + (parseFloat(String(order.total_amount || 0)) || 0), 0) || 0
    console.log('getTotalRevenue: Found', data?.length || 0, 'orders, total revenue:', revenue)
    return revenue
  } catch (error) {
    console.error('Error fetching total revenue:', error)
    return 0
  }
}

export async function getActiveOrders() {
  const supabase = createClient()
  
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'completed')
      .neq('status', 'cancelled')
    
    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching active orders:', error)
    return 0
  }
}

export async function getProductionQueue() {
  const supabase = createClient()
  
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['in_production', 'production_started', 'quality_control'])
    
    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching production queue:', error)
    return 0
  }
}

export async function getTotalCustomers() {
  const supabase = createClient()
  
  try {
    const { count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
    
    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching total customers:', error)
    return 0
  }
}

// CRM specific metrics
export async function getCRMMetrics() {
  
  try {
    const [contacts, leads, customers, orders] = await Promise.all([
      getTotalCustomers(),
      getLeadCount(),
      getCustomerCount(),
      getOrderValues()
    ])
    
    const conversionRate = leads > 0 ? ((customers / (leads + customers)) * 100) : 0
    const avgDealSize = orders.length > 0 
      ? orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length 
      : 0
    
    return {
      totalContacts: contacts,
      activeLeads: leads,
      conversionRate: formatPercentage(conversionRate),
      avgDealSize: formatCurrency(avgDealSize)
    }
  } catch (error) {
    console.error('Error fetching CRM metrics:', error)
    return {
      totalContacts: 0,
      activeLeads: 0,
      conversionRate: '0%',
      avgDealSize: '$0'
    }
  }
}

export async function getLeadCount() {
  const supabase = createClient()
  
  try {
    const { count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('customer_type', 'prospect')
    
    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching lead count:', error)
    return 0
  }
}

export async function getCustomerCount() {
  const supabase = createClient()
  
  try {
    const { count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('customer_type', 'customer')
    
    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching customer count:', error)
    return 0
  }
}

export async function getOrderValues() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('total')
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching order values:', error)
    return []
  }
}

// Analytics data
export async function getRevenueOverTime(period: string = '30d') {
  const supabase = createClient()
  const { startDate, endDate } = getDateRange(period)
  
  try {
    // Use orders table instead of invoices
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at')
    
    if (error) throw error
    
    // Group by day/month depending on period
    const groupedData = (data || []).reduce((acc, order) => {
      const date = new Date(order.created_at)
      const key = period === '1y' 
        ? date.toLocaleDateString('en', { month: 'short', year: 'numeric' })
        : date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      
      acc[key] = (acc[key] || 0) + (parseFloat(String(order.total_amount || 0)) || 0)
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(groupedData).map(([date, revenue]) => ({
      date,
      revenue: validateMetric(revenue, 0)
    }))
  } catch (error) {
    console.error('Error fetching revenue over time:', error)
    return []
  }
}

export async function getOrderStatusDistribution() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status')
    
    if (error) throw error
    
    const statusCounts = (data || []).reduce((acc, order) => {
      const status = order.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      status: safeFormatString(status, 'unknown').toLowerCase(),
      count: validateMetric(count, 0)
    }))
  } catch (error) {
    console.error('Error fetching order status distribution:', error)
    return []
  }
}

// Production analytics
export async function getProductionMetrics(period: string = '30d') {
  const { startDate, endDate } = getDateRange(period)
  
  try {
    const [completed, total, stages] = await Promise.all([
      getCompletedProduction(startDate, endDate),
      getTotalProduction(startDate, endDate),
      getProductionStages()
    ])
    
    const efficiencyRate = total > 0 ? (completed / total) * 100 : 0
    const avgLeadTime = await getAverageLeadTime(startDate, endDate)
    
    return {
      efficiencyRate: validateMetric(efficiencyRate, 0),
      avgLeadTime: validateMetric(avgLeadTime, 0),
      completedOrders: validateMetric(completed, 0),
      totalOrders: validateMetric(total, 0),
      stageDistribution: stages
    }
  } catch (error) {
    console.error('Error fetching production metrics:', error)
    return {
      efficiencyRate: 0,
      avgLeadTime: 0,
      completedOrders: 0,
      totalOrders: 0,
      stageDistribution: []
    }
  }
}

export async function getCompletedProduction(startDate: Date, endDate: Date) {
  const supabase = createClient()
  
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
    
    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching completed production:', error)
    return 0
  }
}

export async function getTotalProduction(startDate: Date, endDate: Date) {
  const supabase = createClient()
  
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
    
    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching total production:', error)
    return 0
  }
}

export async function getProductionStages() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status')
    
    if (error) throw error
    
    const stageCounts = (data || []).reduce((acc, order) => {
      const stage = order.status || 'unknown'
      acc[stage] = (acc[stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(stageCounts).map(([stage, count]) => ({
      stage: safeFormatString(stage, 'unknown').toLowerCase(),
      count: validateMetric(count, 0)
    }))
  } catch (error) {
    console.error('Error fetching production stages:', error)
    return []
  }
}

export async function getAverageLeadTime(startDate: Date, endDate: Date) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, completed_at')
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
    
    if (error) throw error
    
    if (!data || data.length === 0) return 0
    
    const leadTimes = data.map(order => {
      const start = new Date(order.created_at)
      const end = new Date(order.completed_at!)
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) // days
    })
    
    return leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length
  } catch (error) {
    console.error('Error fetching average lead time:', error)
    return 0
  }
}

// Activity feed data
export async function getRecentActivity(limit: number = 10) {
  try {
    // Try to get from audit log first, fallback to order/customer creation
    const [orders, customers, collections] = await Promise.all([
      getRecentOrders(Math.ceil(limit / 3)),
      getRecentCustomers(Math.ceil(limit / 3)),
      getRecentCollections(Math.ceil(limit / 3))
    ])
    
    const activities = [
      ...orders.map(order => ({
        id: `order-${order.id}`,
        action: 'Created',
        item: `Order ${order.order_number || order.id}`,
        timestamp: formatRelativeTime(order.created_at),
        user: 'System'
      })),
      ...customers.map(customer => ({
        id: `customer-${customer.id}`,
        action: 'Added',
        item: `Customer ${customer.name || customer.id}`,
        timestamp: formatRelativeTime(customer.created_at),
        user: 'System'
      })),
      ...collections.map(collection => ({
        id: `collection-${collection.id}`,
        action: 'Created',
        item: `Collection ${collection.name}`,
        timestamp: formatRelativeTime(collection.created_at),
        user: 'Admin'
      }))
    ]
    
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

export async function getRecentOrders(limit: number) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching recent orders:', error)
    return []
  }
}

export async function getRecentCustomers(limit: number) {
  const supabase = createClient()
  
  const result = await safeQuery(
    async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, created_at, company_name')
        .order('created_at', { ascending: false })
        .limit(limit)
      return { data, error }
    },
    { 
      fallbackData: [],
      operation: 'getRecentCustomers',
      logError: true
    }
  )
  
  // Data already has the correct structure with single name field
  if (result && Array.isArray(result)) {
    return result.map(customer => ({
      ...customer,
      // Use existing name field, fallback to company_name or email if name is empty
      name: customer.name || customer.company_name || customer.email || 'Unknown Customer'
    }))
  }
  
  return []
}

export async function getRecentCollections(limit: number) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching recent collections:', error)
    return []
  }
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return 'Recently'
}

// Export to CSV
export function exportToCSV(data: unknown[], filename: string) {
  const csvContent = convertToCSV(data)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

function convertToCSV(data: unknown[]): string {
  if (!data || data.length === 0) return ''
  
  const headers = Object.keys(data[0] as Record<string, unknown>)
  const csvRows = [headers.join(',')]
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = (row as Record<string, unknown>)[header]
      return typeof value === 'string' ? `"${value}"` : value
    })
    csvRows.push(values.join(','))
  }
  
  return csvRows.join('\n')
}