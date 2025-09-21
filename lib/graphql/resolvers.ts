/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/service'
import { aiPredictionService } from '@/lib/services/ai-predictions'
import { realTimeService } from '@/lib/services/real-time'

const supabase = createClient()

// GraphQL context type
interface GraphQLContext {
  user: {
    id: string
    email?: string
  }
}

// Filter types
interface OrderFilters {
  status?: string[]
  customer_id?: string
  search?: string
  date_range?: {
    start: string
    end: string
  }
  limit?: number
  offset?: number
}

interface CustomerFilters {
  search?: string
  company?: string
  limit?: number
  offset?: number
}

interface ProductFilters {
  category?: string
  is_active?: boolean
  search?: string
  price_range?: {
    min?: number
    max?: number
  }
  limit?: number
  offset?: number
}

interface MaterialFilters {
  category?: string
  supplier?: string
  is_active?: boolean
  search?: string
  limit?: number
  offset?: number
}

interface PredictionFilters {
  type?: string
  status?: string
  limit?: number
  offset?: number
}

interface AnalyticsFilters {
  date_range: {
    start: string
    end: string
  }
  granularity?: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'
}

interface NotificationFilters {
  type?: string
  category?: string
  priority?: string
  is_read?: boolean
  limit?: number
  offset?: number
}

interface CreateOrderInput {
  customer_id: string
  due_date?: string
  notes?: string
  metadata?: Record<string, unknown>
  items: OrderItemInput[]
}

interface OrderItemInput {
  product_id: string
  quantity: number
  unit_price: number
  specifications?: Record<string, unknown>
}

interface CreateCustomerInput {
  name: string
  email?: string
  phone?: string
  company?: string
  address?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

interface CreatePredictionInput {
  type: string
  input_data: Record<string, unknown>
  confidence_threshold?: number
  metadata?: Record<string, unknown>
}

interface DataPoint {
  period: string
  value: number
  metadata: Record<string, unknown>
}

interface AnalyticsSummary {
  total: number
  average: number
  growth_rate: number
  period_over_period_change: number
  metadata: Record<string, unknown>
}

// Helper function to validate tenant access
async function validateTenantAccess(tenantId: string, userId: string) {
  const { data, error } = await supabase
    .from('tenant_users')
    .select('role, permissions')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('Access denied to tenant')
  }

  return data
}

export const resolvers = {
  Query: {
    // Orders
    orders: async (_: unknown, { tenantId, filters }: { tenantId: string; filters?: OrderFilters }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            specifications,
            product:products(*)
          )
        `)
        .eq('tenant_id', tenantId)

      if (filters) {
        if (filters.status) query = query.in('status', filters.status)
        if (filters.customer_id) query = query.eq('customer_id', filters.customer_id)
        if (filters.search) {
          query = query.or(`order_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`)
        }
        if (filters.date_range) {
          query = query
            .gte('created_at', filters.date_range.start)
            .lte('created_at', filters.date_range.end)
        }
        if (filters.limit) query = query.limit(filters.limit)
        if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw new Error('Failed to fetch orders')
      return data || []
    },

    order: async (_: unknown, { tenantId, id }: { tenantId: string; id: string }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            specifications,
            product:products(*)
          )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw new Error('Order not found')
      return data
    },

    // Customers
    customers: async (_: unknown, { tenantId, filters }: { tenantId: string; filters?: CustomerFilters }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      let query = supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)

      if (filters) {
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`)
        }
        if (filters.company) query = query.eq('company', filters.company)
        if (filters.limit) query = query.limit(filters.limit)
        if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query.order('name')
      
      if (error) throw new Error('Failed to fetch customers')
      return data || []
    },

    customer: async (_: unknown, { tenantId, id }: { tenantId: string; id: string }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw new Error('Customer not found')
      return data
    },

    // Products
    products: async (_: unknown, { tenantId, filters }: { tenantId: string; filters?: ProductFilters }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      let query = supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)

      if (filters) {
        if (filters.category) query = query.eq('category', filters.category)
        if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active)
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
        }
        if (filters.price_range) {
          if (filters.price_range.min) query = query.gte('price', filters.price_range.min)
          if (filters.price_range.max) query = query.lte('price', filters.price_range.max)
        }
        if (filters.limit) query = query.limit(filters.limit)
        if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query.order('name')
      
      if (error) throw new Error('Failed to fetch products')
      return data || []
    },

    product: async (_: unknown, { tenantId, id }: { tenantId: string; id: string }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw new Error('Product not found')
      return data
    },

    // Materials
    materials: async (_: unknown, { tenantId, filters }: { tenantId: string; filters?: MaterialFilters }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      let query = supabase
        .from('materials')
        .select('*')
        .eq('tenant_id', tenantId)

      if (filters) {
        if (filters.category) query = query.eq('category', filters.category)
        if (filters.supplier) query = query.eq('supplier', filters.supplier)
        if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active)
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }
        if (filters.limit) query = query.limit(filters.limit)
        if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query.order('name')
      
      if (error) throw new Error('Failed to fetch materials')
      return data || []
    },

    material: async (_: unknown, { tenantId, id }: { tenantId: string; id: string }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw new Error('Material not found')
      return data
    },

    // AI Predictions
    predictions: async (_: unknown, { tenantId, filters }: { tenantId: string; filters?: PredictionFilters }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      const predictions = await aiPredictionService.getPredictions(tenantId, filters)
      return predictions
    },

    prediction: async (_: unknown, { tenantId, id }: { tenantId: string; id: string }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      const { data, error } = await supabase
        .from('ai_predictions')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw new Error('Prediction not found')
      return data
    },

    // Analytics
    analytics: async (_: unknown, { tenantId, type, filters }: { tenantId: string; type: string; filters: AnalyticsFilters }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      // Simple analytics implementation
      const { date_range, granularity = 'DAY' } = filters
      
      let tableName = 'orders'
      let valueColumn = 'total_amount'
      
      switch (type) {
        case 'REVENUE':
          tableName = 'orders'
          valueColumn = 'total_amount'
          break
        case 'ORDERS':
          tableName = 'orders'
          valueColumn = 'id'
          break
        case 'CUSTOMERS':
          tableName = 'customers'
          valueColumn = 'id'
          break
        case 'PRODUCTS':
          tableName = 'products'
          valueColumn = 'id'
          break
      }

      // This is a simplified implementation
      // In production, you'd want more sophisticated analytics queries
      const { data, error } = await supabase
        .from(tableName)
        .select(`created_at, ${valueColumn}`)
        .eq('tenant_id', tenantId)
        .gte('created_at', date_range.start)
        .lte('created_at', date_range.end)

      if (error) throw new Error('Failed to fetch analytics data')

      // Process data into analytics format
      const dataPoints = processAnalyticsData((data || []) as unknown as Record<string, unknown>[], valueColumn, granularity)
      const summary = calculateAnalyticsSummary(dataPoints)

      return {
        type,
        data: dataPoints,
        summary,
        generated_at: new Date().toISOString()
      }
    },

    // Notifications
    notifications: async (_: unknown, { tenantId, filters }: { tenantId: string; filters?: NotificationFilters }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('recipient_id', context.user.id)

      if (filters) {
        if (filters.type) query = query.eq('type', filters.type)
        if (filters.category) query = query.eq('category', filters.category)
        if (filters.priority) query = query.eq('priority', filters.priority)
        if (filters.is_read !== undefined) {
          if (filters.is_read) {
            query = query.not('read_at', 'is', null)
          } else {
            query = query.is('read_at', null)
          }
        }
        if (filters.limit) query = query.limit(filters.limit)
        if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw new Error('Failed to fetch notifications')
      return data || []
    }
  },

  Mutation: {
    // Order mutations
    createOrder: async (_: unknown, { tenantId, input }: { tenantId: string; input: CreateOrderInput }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      try {
        // Start transaction
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([{
            tenant_id: tenantId,
            customer_id: input.customer_id,
            order_number: `ORD-${Date.now()}`,
            status: 'PENDING',
            due_date: input.due_date,
            notes: input.notes,
            metadata: input.metadata,
            total_amount: input.items.reduce((sum: number, item: OrderItemInput) => sum + (item.quantity * item.unit_price), 0)
          }])
          .select()
          .single()

        if (orderError) throw new Error('Failed to create order')

        // Create order items
        const orderItems = input.items.map((item: OrderItemInput) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          specifications: item.specifications
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)

        if (itemsError) throw new Error('Failed to create order items')

        // Broadcast real-time update
        await realTimeService.broadcastToTenant(tenantId, 'order_created', order)

        return {
          success: true,
          data: order,
          error: null
        }
      } catch (error) {
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Failed to create order'
        }
      }
    },

    // Customer mutations
    createCustomer: async (_: unknown, { tenantId, input }: { tenantId: string; input: CreateCustomerInput }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      try {
        const { data, error } = await supabase
          .from('customers')
          .insert([{
            tenant_id: tenantId,
            ...input
          }])
          .select()
          .single()

        if (error) throw new Error('Failed to create customer')

        return {
          success: true,
          data,
          error: null
        }
      } catch (error) {
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Failed to create customer'
        }
      }
    },

    // AI Prediction mutations
    createPrediction: async (_: unknown, { tenantId, input }: { tenantId: string; input: CreatePredictionInput }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      try {
        const prediction = await aiPredictionService.createPrediction({
          ...input,
          tenant_id: tenantId,
          model_type: (input as any).model_type || 'default',
          prediction_type: (input as any).prediction_type || 'classification'
        })

        // Broadcast real-time update
        await realTimeService.broadcastToTenant(tenantId, 'prediction_created', prediction)

        return {
          success: true,
          data: prediction,
          error: null
        }
      } catch (error) {
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Failed to create prediction'
        }
      }
    },

    // Notification mutations
    markNotificationAsRead: async (_: unknown, { tenantId, id }: { tenantId: string; id: string }, context: GraphQLContext) => {
      await validateTenantAccess(tenantId, context.user.id)
      
      try {
        const { data, error } = await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .eq('recipient_id', context.user.id)
          .select()
          .single()

        if (error) throw new Error('Failed to mark notification as read')

        return {
          success: true,
          data,
          error: null
        }
      } catch (error) {
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Failed to mark notification as read'
        }
      }
    }
  },

  // Subscription resolvers would use real-time service
  Subscription: {
    orderUpdated: {
      subscribe: () => {
        // Implementation would use real-time service pub/sub
        // For now, return empty async iterator
        return {
          [Symbol.asyncIterator]: async function* () {
            // Real implementation would yield order updates
          }
        }
      }
    }
  }
}

// Helper functions
function processAnalyticsData(data: Record<string, unknown>[], valueColumn: string, granularity: string): DataPoint[] {
  // Group data by time period
  const grouped = new Map()
  
  data.forEach(item => {
    const date = new Date(String(item.created_at))
    let periodKey = ''
    
    switch (granularity) {
      case 'DAY':
        periodKey = date.toISOString().split('T')[0]
        break
      case 'WEEK':
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
        periodKey = weekStart.toISOString().split('T')[0]
        break
      case 'MONTH':
        periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        break
      case 'QUARTER':
        const quarter = Math.floor(date.getMonth() / 3) + 1
        periodKey = `${date.getFullYear()}-Q${quarter}`
        break
      case 'YEAR':
        periodKey = date.getFullYear().toString()
        break
    }
    
    if (!grouped.has(periodKey)) {
      grouped.set(periodKey, [])
    }
    grouped.get(periodKey).push(item)
  })
  
  // Convert to data points
  return Array.from(grouped.entries()).map(([period, items]) => ({
    period,
    value: valueColumn === 'id' ? items.length : items.reduce((sum: number, item: Record<string, unknown>) => sum + (Number(item[valueColumn]) || 0), 0),
    metadata: {}
  }))
}

function calculateAnalyticsSummary(dataPoints: DataPoint[]): AnalyticsSummary {
  const values = dataPoints.map(dp => dp.value)
  const total = values.reduce((sum, val) => sum + val, 0)
  const average = values.length > 0 ? total / values.length : 0
  
  // Simple growth rate calculation (last vs first)
  const growthRate = values.length > 1 ? ((values[values.length - 1] - values[0]) / values[0]) * 100 : 0
  
  return {
    total,
    average,
    growth_rate: growthRate,
    period_over_period_change: 0, // Would need more sophisticated calculation
    metadata: {}
  }
}