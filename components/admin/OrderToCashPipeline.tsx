'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Package,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  Filter
} from 'lucide-react'

interface PipelineOrder {
  order_id: string
  order_number: string
  customer_name: string
  quickbooks_customer_id: string | null
  order_value: number
  production_status: string
  production_stage: string
  progress_percentage: number
  production_completed: string | null
  invoice_id: string | null
  invoice_number: string | null
  invoice_status: string | null
  invoice_amount: number | null
  balance_due: number | null
  financial_stage: string
  quickbooks_sync_status: string
}

interface ReadyToInvoice {
  order_id: string
  order_number: string
  customer_name: string
  quickbooks_customer_id: string | null
  total_amount: number
  completed_items: number
  last_item_completed: string
}

interface PipelineStats {
  total_orders: number
  in_production: number
  ready_to_invoice: number
  invoiced: number
  completed: number
  total_pipeline_value: number
}

export function OrderToCashPipeline() {
  const [orders, setOrders] = useState<PipelineOrder[]>([])
  const [readyToInvoice, setReadyToInvoice] = useState<ReadyToInvoice[]>([])
  const [stats, setStats] = useState<PipelineStats>({
    total_orders: 0,
    in_production: 0,
    ready_to_invoice: 0,
    invoiced: 0,
    completed: 0,
    total_pipeline_value: 0
  })
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchPipelineData()
  }, [])

  const fetchPipelineData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabase = createClient()

      // Fetch pipeline orders
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('v_order_financial_pipeline')
        .select('*')
        .order('order_number', { ascending: false })

      if (pipelineError) {
        // Check if the error is due to missing table/view (table doesn't exist)
        if (pipelineError.code === '42P01' || 
            pipelineError.message?.includes('does not exist') ||
            pipelineError.message?.includes('relation') ||
            pipelineError.hint?.includes('does not exist')) {
          console.info('QuickBooks pipeline view not found - please run the database migration')
          setOrders([])
        } else {
          console.info('Pipeline data not available:', pipelineError.message || 'Unknown error')
          setOrders([])
        }
      } else {
        setOrders(pipelineData || [])
        
        // Calculate stats
        const totalOrders = pipelineData?.length || 0
        const inProduction = pipelineData?.filter(o => o.financial_stage === 'in_production').length || 0
        const readyToInvoiceCount = pipelineData?.filter(o => o.financial_stage === 'ready_to_invoice').length || 0
        const invoiced = pipelineData?.filter(o => o.financial_stage === 'invoiced').length || 0
        const completed = pipelineData?.filter(o => o.financial_stage === 'completed').length || 0
        const totalValue = pipelineData?.reduce((sum, o) => sum + (o.order_value || 0), 0) || 0

        setStats({
          total_orders: totalOrders,
          in_production: inProduction,
          ready_to_invoice: readyToInvoiceCount,
          invoiced,
          completed,
          total_pipeline_value: totalValue
        })
      }

      // Fetch ready to invoice orders
      const { data: readyData, error: readyError } = await supabase
        .from('v_ready_to_invoice')
        .select('*')
        .order('last_item_completed', { ascending: true })

      if (readyError) {
        // Check if the error is due to missing table/view
        if (readyError.code === '42P01' || 
            readyError.message?.includes('does not exist') ||
            readyError.message?.includes('relation') ||
            readyError.hint?.includes('does not exist')) {
          console.info('QuickBooks ready-to-invoice view not found - please run the database migration')
          setReadyToInvoice([])
        } else {
          console.info('Ready to invoice data not available:', readyError.message || 'Unknown error')
          setReadyToInvoice([])
        }
      } else {
        setReadyToInvoice(readyData || [])
      }

    } catch (err) {
      console.error('Error fetching pipeline data:', err)
      setError('Failed to load pipeline data')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders)
    if (checked) {
      newSelected.add(orderId)
    } else {
      newSelected.delete(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(readyToInvoice.map(order => order.order_id)))
    } else {
      setSelectedOrders(new Set())
    }
  }

  const handleBulkCreateInvoices = async () => {
    if (selectedOrders.size === 0) return

    try {
      setCreating(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/finance/create-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ids: Array.from(selectedOrders)
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invoices')
      }

      setSuccess(`Successfully created ${result.created_count} invoices`)
      setSelectedOrders(new Set())
      await fetchPipelineData() // Refresh data

    } catch (err) {
      setError((err as Error).message || 'Failed to create invoices')
    } finally {
      setCreating(false)
    }
  }

  const handleSyncWithQuickBooks = async () => {
    try {
      setSyncing(true)
      setError('')

      const response = await fetch('/api/quickbooks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncType: 'selective',
          entities: ['invoices', 'customers']
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed')
      }

      setSuccess('Successfully synced with QuickBooks')
      await fetchPipelineData()

    } catch (err) {
      setError((err as Error).message || 'Failed to sync with QuickBooks')
    } finally {
      setSyncing(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    return order.financial_stage === filter
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }


  const getStageColor = (stage: string | null | undefined) => {
    if (!stage) return 'bg-gray-50 text-gray-700 border-gray-200'
    switch (stage.toLowerCase()) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'invoiced':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'ready_to_invoice':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'in_production':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'approved':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200'
    }
  }

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'needs_update':
        return <RefreshCw className="h-4 w-4 text-amber-500" />
      case 'not_synced':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-stone-400" />
    }
  }

  const getStageIcon = (stage: string | null | undefined) => {
    if (!stage) return <Package className="h-4 w-4 text-gray-400" />
    switch (stage.toLowerCase()) {
      case 'in_production':
        return <Package className="h-4 w-4" />
      case 'ready_to_invoice':
        return <FileText className="h-4 w-4" />
      case 'invoiced':
        return <DollarSign className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
          <div className="text-slate-600 text-sm">Loading pipeline data...</div>
        </div>
      </div>
    )
  }

  // Show setup notice if no data and no errors (likely missing database tables)
  if (orders.length === 0 && readyToInvoice.length === 0 && !error) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-heading">Order-to-Cash Pipeline</h2>
            <p className="text-slate-600">Track orders from production to payment</p>
          </div>
        </div>

        {/* Setup Notice */}
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-heading mb-2">Database Setup Required</h3>
            <p className="text-slate-600 mb-4">
              The QuickBooks integration requires database tables to be set up.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">To set up the integration:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Go to your Supabase project dashboard</li>
                <li>2. Navigate to SQL Editor</li>
                <li>3. Run the QuickBooks integration migration file</li>
                <li>4. Refresh this page</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-heading">Order-to-Cash Pipeline</h2>
          <p className="text-slate-600">Track orders from production to payment</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSyncWithQuickBooks}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync QB'}
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-green-800 text-sm">{success}</div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="cursor-pointer hover:bg-stone-50" onClick={() => setFilter('all')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-heading">{stats.total_orders}</div>
            <div className="text-sm text-slate-600">Total Orders</div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-stone-50" onClick={() => setFilter('in_production')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.in_production}</div>
            <div className="text-sm text-slate-600">In Production</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-stone-50" onClick={() => setFilter('ready_to_invoice')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.ready_to_invoice}</div>
            <div className="text-sm text-slate-600">Ready to Invoice</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-stone-50" onClick={() => setFilter('invoiced')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.invoiced}</div>
            <div className="text-sm text-slate-600">Invoiced</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-stone-50" onClick={() => setFilter('completed')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-heading">{formatCurrency(stats.total_pipeline_value)}</div>
            <div className="text-xs text-slate-600">Pipeline Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Invoice Creation */}
      {readyToInvoice.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ready to Invoice ({readyToInvoice.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleSelectAll(selectedOrders.size !== readyToInvoice.length)}
                  variant="outline"
                  size="sm"
                >
                  {selectedOrders.size === readyToInvoice.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={handleBulkCreateInvoices}
                  disabled={selectedOrders.size === 0 || creating}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {creating ? `Creating ${selectedOrders.size} Invoices...` : `Create ${selectedOrders.size} Invoices`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readyToInvoice.map((order, index) => (
                <div key={`ready-${order.order_id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedOrders.has(order.order_id)}
                      onCheckedChange={(checked) => handleSelectOrder(order.order_id, checked as boolean)}
                    />
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-slate-600">{order.customer_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(order.total_amount)}</div>
                    <div className="text-sm text-slate-600">{order.completed_items} items completed</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pipeline Overview</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="border border-stone-200 rounded-md px-2 py-1 text-sm"
              >
                <option value="all">All Stages</option>
                <option value="in_production">In Production</option>
                <option value="ready_to_invoice">Ready to Invoice</option>
                <option value="invoiced">Invoiced</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredOrders.map((order, index) => (
              <div key={`${order.order_id}-${index}`} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStageIcon(order.financial_stage)}
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-slate-600">{order.customer_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getStageColor(order.financial_stage)}>
                      {order.financial_stage?.replace('_', ' ') || 'Unknown'}
                    </Badge>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(order.order_value)}</div>
                      {(order.balance_due || 0) > 0 && (
                        <div className="text-sm text-red-600">
                          Balance: {formatCurrency(order.balance_due || 0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {order.production_status && (
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-amber-500" />
                        <span className="text-slate-600">Production: {order.production_status}</span>
                        {order.progress_percentage > 0 && (
                          <span className="text-primary">({order.progress_percentage}%)</span>
                        )}
                      </div>
                    )}
                    
                    {order.invoice_status && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-blue-500" />
                        <span className="text-slate-600">Invoice: {order.invoice_status}</span>
                        {order.invoice_number && (
                          <span className="text-primary">({order.invoice_number})</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {getSyncStatusIcon(order.quickbooks_sync_status)}
                    <span className="text-xs text-slate-600">
                      QB: {order.quickbooks_sync_status?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Production Progress Bar */}
                {order.financial_stage === 'in_production' && order.progress_percentage > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${order.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-slate-600">
                <Package className="h-12 w-12 mx-auto mb-3 text-stone-300" />
                <div className="font-medium">No orders found</div>
                <div className="text-sm">No orders match the current filter</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}