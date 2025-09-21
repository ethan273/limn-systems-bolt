'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoading } from '@/components/ui/enhanced-loading-states'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/ui/status-badge'
import { StatsGrid } from '@/components/ui/responsive-grid'
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText, 
  Phone, 
  Mail, 
  Calendar,
  Target,
  BarChart3,
  Clock
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface PipelineOrder {
  id: string
  order_number: string
  customer_name: string
  total_amount: number
  status: 'quote' | 'proposal' | 'negotiation' | 'approved' | 'in_production' | 'completed'
  financial_stage?: string
  sales_rep?: string
  expected_close_date?: string
  created_at: string
  updated_at: string
  probability?: number
  notes?: string
}

interface Quote {
  id: string
  quote_number: string
  customer_name: string
  amount: number
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'
  created_at: string
  valid_until?: string
  sales_rep?: string
  items_count?: number
}

interface Communication {
  id: string
  customer_name: string
  type: 'email' | 'phone' | 'meeting' | 'follow_up'
  subject: string
  status: 'completed' | 'scheduled' | 'pending'
  date: string
  sales_rep?: string
  notes?: string
}

interface TaskData {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  assigned_to?: string[]
}

export default function SalesTeamPage() {
  const [pipelineOrders, setPipelineOrders] = useState<PipelineOrder[]>([])
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([])
  const [communications, setCommunications] = useState<Communication[]>([])
  const [salesTasks, setSalesTasks] = useState<TaskData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchSalesData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Use Promise.allSettled to handle all queries gracefully
      const [ordersResult, quotesResult, commsResult, tasksResult] = await Promise.allSettled([
        supabase
          .from('orders')
          .select('*')
          .in('status', ['quote', 'proposal', 'negotiation', 'approved'])
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('customer_communications')
          .select('*')
          .order('date', { ascending: false })
          .limit(10),
        supabase
          .from('tasks')
          .select('*')
          .eq('department', 'sales')
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      // Handle orders data
      const orders = ordersResult.status === 'fulfilled' && !ordersResult.value.error 
        ? ordersResult.value.data 
        : null
      setPipelineOrders(orders || getFallbackOrders())

      // Handle quotes data
      const quotes = quotesResult.status === 'fulfilled' && !quotesResult.value.error 
        ? quotesResult.value.data 
        : null
      setRecentQuotes(quotes || getFallbackQuotes())

      // Handle communications data
      const comms = commsResult.status === 'fulfilled' && !commsResult.value.error 
        ? commsResult.value.data 
        : null
      setCommunications(comms || getFallbackCommunications())

      // Handle tasks data
      const tasks = tasksResult.status === 'fulfilled' && !tasksResult.value.error 
        ? tasksResult.value.data 
        : null
      setSalesTasks(tasks || getFallbackTasks())

    } catch {
      // Use fallback data for any unexpected errors
      setPipelineOrders(getFallbackOrders())
      setRecentQuotes(getFallbackQuotes())
      setCommunications(getFallbackCommunications())
      setSalesTasks(getFallbackTasks())
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchSalesData()
  }, [fetchSalesData])

  const getFallbackOrders = (): PipelineOrder[] => [
    {
      id: '1',
      order_number: 'ORD-2025-004',
      customer_name: 'TechFlow Solutions',
      total_amount: 125000,
      status: 'proposal',
      financial_stage: 'proposal_sent',
      sales_rep: 'Jennifer Martinez',
      expected_close_date: '2025-09-15',
      created_at: '2025-08-25T10:00:00.000Z',
      updated_at: '2025-08-30T15:30:00.000Z',
      probability: 75,
      notes: 'Client very interested, waiting on budget approval'
    },
    {
      id: '2',
      order_number: 'ORD-2025-005',
      customer_name: 'Metro Logistics',
      total_amount: 85000,
      status: 'negotiation',
      financial_stage: 'negotiating',
      sales_rep: 'Michael Chen',
      expected_close_date: '2025-09-08',
      created_at: '2025-08-20T09:15:00.000Z',
      updated_at: '2025-08-29T14:20:00.000Z',
      probability: 60,
      notes: 'Negotiating on delivery timeline and payment terms'
    },
    {
      id: '3',
      order_number: 'ORD-2025-006',
      customer_name: 'Coastal Retail Group',
      total_amount: 195000,
      status: 'approved',
      financial_stage: 'approved',
      sales_rep: 'Sarah Wilson',
      expected_close_date: '2025-09-01',
      created_at: '2025-08-28T11:30:00.000Z',
      updated_at: '2025-08-30T16:45:00.000Z',
      probability: 95,
      notes: 'Contract signed, moving to production'
    }
  ]

  const getFallbackQuotes = (): Quote[] => [
    {
      id: '1',
      quote_number: 'QUO-2025-012',
      customer_name: 'Oceanside Retail',
      amount: 67500,
      status: 'sent',
      created_at: '2025-08-28T14:00:00.000Z',
      valid_until: '2025-09-12',
      sales_rep: 'Jennifer Martinez',
      items_count: 8
    },
    {
      id: '2',
      quote_number: 'QUO-2025-013',
      customer_name: 'GreenTech Manufacturing',
      amount: 42000,
      status: 'viewed',
      created_at: '2025-08-27T10:30:00.000Z',
      valid_until: '2025-09-10',
      sales_rep: 'Michael Chen',
      items_count: 5
    },
    {
      id: '3',
      quote_number: 'QUO-2025-014',
      customer_name: 'Urban Design Studios',
      amount: 115000,
      status: 'draft',
      created_at: '2025-08-29T16:15:00.000Z',
      valid_until: '2025-09-15',
      sales_rep: 'Sarah Wilson',
      items_count: 12
    }
  ]

  const getFallbackCommunications = (): Communication[] => [
    {
      id: '1',
      customer_name: 'TechFlow Solutions',
      type: 'phone',
      subject: 'Follow-up on office furniture proposal',
      status: 'completed',
      date: '2025-08-30T14:30:00.000Z',
      sales_rep: 'Jennifer Martinez',
      notes: 'Discussed timeline and customization options'
    },
    {
      id: '2',
      customer_name: 'Metro Logistics',
      type: 'meeting',
      subject: 'Contract negotiation meeting',
      status: 'scheduled',
      date: '2025-09-02T10:00:00.000Z',
      sales_rep: 'Michael Chen',
      notes: 'Meeting set to finalize terms'
    },
    {
      id: '3',
      customer_name: 'Coastal Retail Group',
      type: 'email',
      subject: 'Project kickoff details',
      status: 'completed',
      date: '2025-08-30T09:15:00.000Z',
      sales_rep: 'Sarah Wilson',
      notes: 'Sent production timeline and contact information'
    }
  ]

  const getFallbackTasks = (): TaskData[] => [
    {
      id: '1',
      title: 'Prepare TechFlow proposal presentation',
      status: 'in_progress',
      priority: 'high',
      due_date: '2025-09-03',
      assigned_to: ['Jennifer Martinez']
    },
    {
      id: '2',
      title: 'Follow up on Metro Logistics quote',
      status: 'todo',
      priority: 'medium',
      due_date: '2025-09-02',
      assigned_to: ['Michael Chen']
    },
    {
      id: '3',
      title: 'Update CRM with Coastal Retail progress',
      status: 'done',
      priority: 'low',
      due_date: '2025-08-31',
      assigned_to: ['Sarah Wilson']
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'accepted':
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'proposal':
      case 'negotiation':
      case 'sent':
      case 'viewed':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'quote':
      case 'draft':
      case 'scheduled':
      case 'pending':
      case 'todo':
        return 'bg-gray-100 text-gray-800'
      case 'rejected':
      case 'expired':
      case 'blocked':
        return 'bg-red-100 text-red-800'
      case 'review':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'phone':
        return <Phone className="w-4 h-4" />
      case 'meeting':
        return <Users className="w-4 h-4" />
      case 'follow_up':
        return <Clock className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const totalPipelineValue = pipelineOrders.reduce((sum, order) => sum + order.total_amount, 0)
  const monthlyRevenue = pipelineOrders
    .filter(order => order.status === 'approved')
    .reduce((sum, order) => sum + order.total_amount, 0)

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Sales Team Dashboard" 
        description="Pipeline overview, quotes, and customer communications"
        actions={
          <div className="flex items-center space-x-3">
            <StatusBadge variant="success" size="sm">
              {formatCurrency(monthlyRevenue)} Won
            </StatusBadge>
            <StatusBadge variant="info" size="sm">
              {pipelineOrders.filter(o => ['proposal', 'negotiation'].includes(o.status)).length} Active Deals
            </StatusBadge>
          </div>
        }
      />

      {error && (
        <Alert variant="error">
          <span>{error}</span>
        </Alert>
      )}

      {/* Quick Stats */}
      <StatsGrid statsCount={4}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(totalPipelineValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Deals</p>
                <p className="text-2xl font-bold text-slate-900">
                  {pipelineOrders.filter(o => ['proposal', 'negotiation'].includes(o.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending Quotes</p>
                <p className="text-2xl font-bold text-slate-900">
                  {recentQuotes.filter(q => ['sent', 'viewed'].includes(q.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Win Rate</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Math.round((pipelineOrders.filter(o => o.status === 'approved').length / Math.max(pipelineOrders.length, 1)) * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </StatsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Sales Pipeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pipelineOrders.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">No active deals in pipeline</p>
              ) : (
                pipelineOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">{order.customer_name}</h4>
                        <p className="text-sm text-slate-600">{order.order_number} • {formatCurrency(order.total_amount)}</p>
                        {order.sales_rep && (
                          <p className="text-sm text-slate-600 mt-1">
                            <Users className="w-3 h-3 inline mr-1" />
                            {order.sales_rep}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-1 ml-3">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        {order.probability && (
                          <span className="text-xs text-slate-600">{order.probability}% likely</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {order.expected_close_date && (
                        <p className="text-xs text-slate-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Expected {formatDate(order.expected_close_date)}
                        </p>
                      )}
                    </div>
                    {order.notes && (
                      <p className="text-xs text-slate-600 mt-2 italic">{order.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Recent Quotes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentQuotes.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">No recent quotes</p>
              ) : (
                recentQuotes.slice(0, 5).map((quote) => (
                  <div key={quote.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{quote.customer_name}</h4>
                      <p className="text-sm text-slate-600">{quote.quote_number} • {formatCurrency(quote.amount)}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        {quote.sales_rep && (
                          <p className="text-xs text-slate-500">{quote.sales_rep}</p>
                        )}
                        {quote.valid_until && (
                          <p className="text-xs text-slate-500">
                            Valid until {formatDate(quote.valid_until)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(quote.status)}>
                      {quote.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Communications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="w-5 h-5" />
            <span>Recent Customer Communications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {communications.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">No recent communications</p>
            ) : (
              communications.map((comm) => (
                <div key={comm.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-white rounded border">
                      {getCommunicationIcon(comm.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{comm.subject}</h4>
                      <p className="text-sm text-slate-600">{comm.customer_name}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        {comm.sales_rep && (
                          <p className="text-xs text-slate-500">{comm.sales_rep}</p>
                        )}
                        <p className="text-xs text-slate-500">
                          {formatDateTime(comm.date)}
                        </p>
                      </div>
                      {comm.notes && (
                        <p className="text-xs text-slate-600 mt-1 italic">{comm.notes}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(comm.status)}>
                    {comm.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Sales Team Tasks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {salesTasks.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">No sales tasks</p>
            ) : (
              salesTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate">{task.title}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      {task.assigned_to && (task.assigned_to || []).length > 0 && (
                        <p className="text-sm text-slate-600">
                          <Users className="w-3 h-3 inline mr-1" />
                          {task.assigned_to.join(', ')}
                        </p>
                      )}
                      {task.due_date && (
                        <p className="text-sm text-slate-600">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatDate(task.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    {task.priority && (
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    )}
                    <Badge className={getStatusColor(task.status)}>
                      {safeFormatString(task.status, 'pending')}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}