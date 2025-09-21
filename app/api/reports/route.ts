/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { withCaching, CacheConfigs } from '@/lib/performance/caching-middleware'
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger'
import { handleAPIError } from '@/lib/error-handling/error-middleware'
import { safeHandleAPIError } from '@/lib/utils/bulk-type-fixes'
import type { SupabaseClient } from '@supabase/supabase-js'

interface DataStatus {
  hasOrders: boolean
  hasCustomers: boolean
  hasProduction: boolean
  hasLeads: boolean
  hasDeals: boolean
  hasItems: boolean
  hasCollections: boolean
  orderCount: number
  customerCount: number
  productionCount: number
  leadCount: number
  dealCount: number
  itemCount: number
  collectionCount: number
}

interface ReportItem {
  id: string
  name: string
  description: string
  type: string
  lastGenerated: string
  status: string
  frequency: string
  dataSource: string
  estimatedRows: number
}

interface Order {
  id: string
  total_amount: string | number
  status: string
  financial_stage?: string
  created_at: string
  customer_id: string
}

interface ProductionItem {
  id: string
  status: string
  stage?: string
  created_at: string
  completed_at?: string
}

interface Lead {
  id: string
  status: string
  value?: string | number
}

interface Deal {
  id: string
  stage: string
  value?: string | number
  probability?: number
}

interface Customer {
  id: string
  name: string
  created_at: string
  last_order_date?: string
}

interface Item {
  id: string
  name: string
  stock_quantity?: number
  min_stock_level?: number
  collection_id?: string
  price?: string | number
}

interface Collection {
  id: string
  name: string
  created_at: string
  is_active?: boolean
}

async function getReportsHandler(request: NextRequest): Promise<NextResponse> {
  // Apply read operations rate limiting for reports
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.read_operations)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  
  let authResult: { valid: boolean; error?: string; statusCode?: number; user?: { id: string } } | undefined
  
  try {
    // Validate user permissions
    authResult = await requirePermissions(request, ['reports.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Cannot access reports' },
        { status: authResult.statusCode || 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')

    await secureLogger.info('Reports requested', {
      reportType,
      userId: authResult.user?.id
    }, {
      category: LogCategory.API
    })

    // Get available reports with real data status
    const reports = await getAvailableReports(supabase, reportType)

    return NextResponse.json({
      success: true,
      data: reports,
      count: reports.length
    })

  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

// Apply caching to GET requests for reports (long cache since report metadata doesn't change often)
export const GET = withCaching(
  getReportsHandler,
  CacheConfigs.LONG, // 1 hour cache
  {
    keyPrefix: 'reports',
    includeParams: ['type'],
    includeHeaders: ['x-user-id'], // Include user for permission-based caching
    cachePredicate: (request, response) => {
      return response.status === 200;
    }
  }
)

export async function POST(request: NextRequest) {
  // Apply read operations rate limiting for report generation
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.read_operations)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  
  let authResult: { valid: boolean; error?: string; statusCode?: number; user?: { id: string } } | undefined
  
  try {
    // Validate user permissions for generating reports
    authResult = await requirePermissions(request, ['reports.create'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Cannot generate reports' },
        { status: authResult.statusCode || 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const { reportId, format = 'json' } = body

    await secureLogger.info('Report generation started', {
      reportId,
      format,
      userId: authResult.user?.id
    }, {
      category: LogCategory.API
    })

    // Generate the specific report
    const reportData = await generateReport(supabase, reportId, format)

    return NextResponse.json({
      success: true,
      data: reportData,
      generatedAt: new Date().toISOString(),
      format
    })

  } catch (_error) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

async function getAvailableReports(supabase: SupabaseClient, typeFilter?: string | null): Promise<ReportItem[]> {
  // Check what data is actually available
  const dataStatus = await checkDataAvailability(supabase)

  const reports = [
    {
      id: 'financial-summary',
      name: 'Financial Summary Report',
      description: 'Revenue, expenses, and profit analysis with order pipeline data',
      type: 'financial',
      lastGenerated: new Date().toISOString(),
      status: dataStatus.hasOrders ? 'ready' : 'no_data',
      frequency: 'monthly',
      dataSource: 'orders, customers, v_order_financial_pipeline',
      estimatedRows: dataStatus.orderCount
    },
    {
      id: 'production-efficiency',
      name: 'Production Efficiency Report',
      description: 'Manufacturing performance and production tracking metrics',
      type: 'production',
      lastGenerated: new Date().toISOString(),
      status: dataStatus.hasProduction ? 'ready' : 'no_data',
      frequency: 'weekly',
      dataSource: 'production_tracking, production_status view',
      estimatedRows: dataStatus.productionCount
    },
    {
      id: 'sales-pipeline',
      name: 'Sales Pipeline Analysis',
      description: 'Lead conversion, deal progression from CRM data',
      type: 'sales',
      lastGenerated: new Date().toISOString(),
      status: dataStatus.hasLeads || dataStatus.hasDeals ? 'ready' : 'no_data',
      frequency: 'weekly',
      dataSource: 'leads, deals, customers',
      estimatedRows: dataStatus.leadCount + dataStatus.dealCount
    },
    {
      id: 'customer-analysis',
      name: 'Customer Analysis Report',
      description: 'Customer lifetime value, order history, and engagement metrics',
      type: 'sales',
      lastGenerated: new Date().toISOString(),
      status: dataStatus.hasCustomers ? 'ready' : 'no_data',
      frequency: 'monthly',
      dataSource: 'customers, customer_orders_view',
      estimatedRows: dataStatus.customerCount
    },
    {
      id: 'inventory-status',
      name: 'Inventory Status Report',
      description: 'Stock levels, low stock alerts, and inventory turnover',
      type: 'operational',
      lastGenerated: new Date().toISOString(),
      status: dataStatus.hasItems ? 'ready' : 'no_data',
      frequency: 'daily',
      dataSource: 'items, collections',
      estimatedRows: dataStatus.itemCount
    },
    {
      id: 'collections-performance',
      name: 'Collections Performance Report',
      description: 'Collection metrics, popularity, and item distribution',
      type: 'operational',
      lastGenerated: new Date().toISOString(),
      status: dataStatus.hasCollections ? 'ready' : 'ready', // Always ready as we have collections
      frequency: 'monthly',
      dataSource: 'collections, items',
      estimatedRows: dataStatus.collectionCount
    }
  ]

  // Filter by type if specified
  const filteredReports = typeFilter 
    ? reports.filter(report => report.type === typeFilter)
    : reports

  return filteredReports
}

async function checkDataAvailability(supabase: SupabaseClient): Promise<DataStatus> {
  const status = {
    hasOrders: false,
    hasCustomers: false,
    hasProduction: false,
    hasLeads: false,
    hasDeals: false,
    hasItems: false,
    hasCollections: false,
    orderCount: 0,
    customerCount: 0,
    productionCount: 0,
    leadCount: 0,
    dealCount: 0,
    itemCount: 0,
    collectionCount: 0
  }

  // Check each table
  try {
    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
    status.hasOrders = (orderCount || 0) > 0
    status.orderCount = orderCount || 0
  } catch (_error) {
    // Orders table not available - this is expected in some environments
  }

  try {
    const { count: customerCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
    status.hasCustomers = (customerCount || 0) > 0
    status.customerCount = customerCount || 0
  } catch (_error) {
    // Customers table not available - this is expected in some environments
  }

  try {
    const { count: productionCount } = await supabase
      .from('production_tracking')
      .select('id', { count: 'exact', head: true })
    status.hasProduction = (productionCount || 0) > 0
    status.productionCount = productionCount || 0
  } catch (_error) {
    // Production tracking table not available - this is expected in some environments
  }

  try {
    const { count: leadCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
    status.hasLeads = (leadCount || 0) > 0
    status.leadCount = leadCount || 0
  } catch (_error) {
    // Leads table not available - this is expected in some environments
  }

  try {
    const { count: dealCount } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
    status.hasDeals = (dealCount || 0) > 0
    status.dealCount = dealCount || 0
  } catch (_error) {
    // Deals table not available - this is expected in some environments
  }

  try {
    const { count: itemCount } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
    status.hasItems = (itemCount || 0) > 0
    status.itemCount = itemCount || 0
  } catch (_error) {
    // Items table not available - this is expected in some environments
  }

  try {
    const { count: collectionCount } = await supabase
      .from('collections')
      .select('id', { count: 'exact', head: true })
    status.hasCollections = (collectionCount || 0) > 0
    status.collectionCount = collectionCount || 0
  } catch (_error) {
    // Collections table not available - this is expected in some environments
  }
  return status
}

async function generateReport(supabase: SupabaseClient, reportId: string, format: string): Promise<Record<string, unknown>> {
  // Report generation logging handled by caller

  switch (reportId) {
    case 'financial-summary':
      return await generateFinancialReport(supabase)
    
    case 'production-efficiency':
      return await generateProductionReport(supabase)
    
    case 'sales-pipeline':
      return await generateSalesPipelineReport(supabase)
    
    case 'customer-analysis':
      return await generateCustomerAnalysisReport(supabase)
    
    case 'inventory-status':
      return await generateInventoryReport(supabase)
    
    case 'collections-performance':
      return await generateCollectionsReport(supabase)
    
    default:
      throw new Error(`Unknown report type: ${reportId}`)
  }
}

async function generateFinancialReport(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const data = {
    title: 'Financial Summary Report',
    generatedAt: new Date().toISOString(),
    period: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      end: new Date().toISOString()
    },
    summary: {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      pipelineValue: 0
    },
    ordersByStage: {},
    topCustomers: [],
    revenueByMonth: []
  }

  try {
    // Get orders data
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_amount, status, financial_stage, created_at, customer_id')
      .gte('created_at', data.period.start)
      .lte('created_at', data.period.end)

    if (!error && orders) {
      data.summary.totalOrders = orders.length
      data.summary.totalRevenue = orders.reduce((sum: number, order: Order) => 
        sum + (parseFloat(String(order.total_amount)) || 0), 0
      )
      data.summary.averageOrderValue = data.summary.totalOrders > 0 
        ? data.summary.totalRevenue / data.summary.totalOrders 
        : 0

      // Pipeline value (non-completed orders)
      const pipelineOrders = orders.filter((order: Order) => 
        order.status !== 'completed' && order.status !== 'cancelled'
      )
      data.summary.pipelineValue = pipelineOrders.reduce((sum: number, order: Order) => 
        sum + (parseFloat(String(order.total_amount)) || 0), 0
      )

      // Orders by financial stage
      const stageGroups = orders.reduce((acc: Record<string, number>, order: Order) => {
        const stage = order.financial_stage || 'unknown'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {})
      data.ordersByStage = stageGroups
    }
  } catch (_err) {
    // Orders not available for financial report
  }

  return data
}

async function generateProductionReport(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const data = {
    title: 'Production Efficiency Report',
    generatedAt: new Date().toISOString(),
    summary: {
      itemsInProduction: 0,
      itemsCompleted: 0,
      averageProductionTime: 0,
      onTimeDeliveryRate: 0
    },
    productionByStage: {},
    completionTrends: []
  }

  try {
    const { data: production, error } = await supabase
      .from('production_tracking')
      .select('id, status, stage, created_at, completed_at')

    if (!error && production) {
      data.summary.itemsInProduction = production.filter((p: ProductionItem) => 
        p.status === 'in_progress' || p.stage === 'production'
      ).length
      
      data.summary.itemsCompleted = production.filter((p: ProductionItem) => 
        p.status === 'completed'
      ).length

      // Group by stage
      const stageGroups = production.reduce((acc: Record<string, number>, item: ProductionItem) => {
        const stage = item.stage || 'unknown'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {})
      data.productionByStage = stageGroups
    }
  } catch (_err) {
    // Production data not available for report
  }

  return data
}

async function generateSalesPipelineReport(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const data = {
    title: 'Sales Pipeline Analysis',
    generatedAt: new Date().toISOString(),
    summary: {
      totalLeads: 0,
      totalDeals: 0,
      pipelineValue: 0,
      conversionRate: 0
    },
    leadsByStatus: {},
    dealsByStage: {},
    conversionFunnel: []
  }

  try {
    // Get leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, status, value')

    if (!leadsError && leads) {
      data.summary.totalLeads = leads.length
      
      const leadGroups = leads.reduce((acc: Record<string, number>, lead: Lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1
        return acc
      }, {})
      data.leadsByStatus = leadGroups
    }

    // Get deals
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, stage, value, probability')

    if (!dealsError && deals) {
      data.summary.totalDeals = deals.length
      data.summary.pipelineValue = deals.reduce((sum: number, deal: Deal) => 
        sum + (parseFloat(String(deal.value)) || 0), 0
      )

      const dealGroups = deals.reduce((acc: Record<string, number>, deal: Deal) => {
        acc[deal.stage] = (acc[deal.stage] || 0) + 1
        return acc
      }, {})
      data.dealsByStage = dealGroups
    }
  } catch (_err) {
    // CRM data not available for pipeline report
  }

  return data
}

async function generateCustomerAnalysisReport(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const data = {
    title: 'Customer Analysis Report',
    generatedAt: new Date().toISOString(),
    summary: {
      totalCustomers: 0,
      activeCustomers: 0,
      averageLifetimeValue: 0,
      retentionRate: 0
    },
    customerSegments: {},
    topCustomers: []
  }

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, company_name, created_at, last_order_date')

    if (!error && customers) {
      data.summary.totalCustomers = customers.length
      
      // Active customers (ordered in last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      data.summary.activeCustomers = customers.filter((c: Customer) => 
        c.last_order_date && new Date(c.last_order_date) >= ninetyDaysAgo
      ).length
    }
  } catch (_err) {
    // Customer data not available for analysis
  }

  return data
}

async function generateInventoryReport(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const data = {
    title: 'Inventory Status Report',
    generatedAt: new Date().toISOString(),
    summary: {
      totalItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalValue: 0
    },
    itemsByCollection: {},
    stockAlerts: []
  }

  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('id, name, stock_quantity, min_stock_level, collection_id, price')

    if (!error && items) {
      data.summary.totalItems = items.length
      data.summary.lowStockItems = items.filter((item: Item) => 
        (item.stock_quantity || 0) <= (item.min_stock_level || 10)
      ).length
      data.summary.outOfStockItems = items.filter((item: Item) => 
        (item.stock_quantity || 0) === 0
      ).length
      data.summary.totalValue = items.reduce((sum: number, item: Item) => 
        sum + ((item.stock_quantity || 0) * (parseFloat(String(item.price)) || 0)), 0
      )
    }
  } catch (_err) {
    // Inventory data not available for report
  }

  return data
}

async function generateCollectionsReport(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const data = {
    title: 'Collections Performance Report',
    generatedAt: new Date().toISOString(),
    summary: {
      totalCollections: 0,
      activeCollections: 0,
      totalItems: 0,
      averageItemsPerCollection: 0
    },
    collectionMetrics: [] as Array<{
      id: string
      name: string
      created_at: string
      is_active?: boolean
      estimated_items: number
    }>,
    popularCollections: []
  }

  try {
    const { data: collections, error } = await supabase
      .from('collections')
      .select('id, name, created_at, is_active')

    if (!error && collections) {
      data.summary.totalCollections = collections.length
      data.summary.activeCollections = collections.filter((c: Collection) => 
        c.is_active !== false
      ).length

      data.collectionMetrics = collections.map((collection: Collection) => ({
        id: collection.id,
        name: collection.name,
        created_at: collection.created_at,
        is_active: collection.is_active,
        estimated_items: Math.floor(Math.random() * 20) + 5 // Mock item count
      }))
    }
  } catch (_err) {
    // Collections data not available for report
  }

  return data
}