'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  Calendar
} from 'lucide-react'

interface QBFinancialData {
  connectionStatus: 'connected' | 'disconnected' | 'error'
  companyName: string | null
  lastSyncAt: string | null
  totalInvoices: number
  overdueInvoices: number
  totalReceivables: number
  overdueAmount: number
  totalPayments: number
  paymentsThisMonth: number
  recentInvoices: Array<{
    id: string
    docNumber: string
    totalAmount: number
    balance: number
    dueDate: string
    status: string
  }>
  recentPayments: Array<{
    id: string
    amount: number
    paymentDate: string
    paymentMethod: string
  }>
}

export function QuickBooksFinancialOverview() {
  const [data, setData] = useState<QBFinancialData>({
    connectionStatus: 'disconnected',
    companyName: null,
    lastSyncAt: null,
    totalInvoices: 0,
    overdueInvoices: 0,
    totalReceivables: 0,
    overdueAmount: 0,
    totalPayments: 0,
    paymentsThisMonth: 0,
    recentInvoices: [],
    recentPayments: []
  })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchQuickBooksData()
  }, [])

  const fetchQuickBooksData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabase = createClient()
      
      // Check connection status
      const { data: connection, error: connectionError } = await supabase
        .from('quickbooks_connections')
        .select('*')
        .single()

      if (connectionError && connectionError.code !== 'PGRST116') {
        // Check if the error is due to missing table
        if (connectionError.code === '42P01' || 
            connectionError.message?.includes('does not exist') ||
            connectionError.message?.includes('relation') ||
            connectionError.hint?.includes('does not exist')) {
          console.info('QuickBooks connections table not found - please run the database migration')
          setData(prev => ({ ...prev, connectionStatus: 'disconnected' }))
        } else {
          console.info('QuickBooks connection not available:', connectionError.message || 'Unknown error')
          setData(prev => ({ ...prev, connectionStatus: 'error' }))
        }
        return
      }

      if (!connection || !connection.is_active) {
        setData(prev => ({ ...prev, connectionStatus: 'disconnected' }))
        return
      }

      // Fetch invoice mappings
      const { data: invoiceMappings, error: invoiceError } = await supabase
        .from('quickbooks_invoice_mappings')
        .select('*')
        .order('created_at', { ascending: false })

      if (invoiceError) {
        // Check if the error is due to missing table
        if (invoiceError.code === '42P01' || 
            invoiceError.message?.includes('does not exist') ||
            invoiceError.message?.includes('relation')) {
          console.info('QuickBooks invoice mappings table not found - please run the database migration')
        } else {
          console.info('Invoice mappings not available:', invoiceError.message || 'Unknown error')
        }
      }

      // Fetch payment mappings  
      const { data: paymentMappings, error: paymentError } = await supabase
        .from('quickbooks_payment_mappings')
        .select('*')
        .order('created_at', { ascending: false })

      if (paymentError) {
        // Check if the error is due to missing table
        if (paymentError.code === '42P01' || 
            paymentError.message?.includes('does not exist') ||
            paymentError.message?.includes('relation')) {
          console.info('QuickBooks payment mappings table not found - please run the database migration')
        } else {
          console.info('Payment mappings not available:', paymentError.message || 'Unknown error')
        }
      }

      // Calculate statistics
      const invoices = invoiceMappings || []
      const payments = paymentMappings || []
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const totalReceivables = invoices.reduce((sum, inv) => sum + inv.balance, 0)
      const overdueInvoices = invoices.filter(inv => {
        const dueDate = new Date(inv.due_date)
        return dueDate < now && inv.balance > 0
      })
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0)

      const paymentsThisMonth = payments.filter(payment => {
        const paymentDate = new Date(payment.payment_date)
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear
      }).length

      setData({
        connectionStatus: 'connected',
        companyName: connection.company_name,
        lastSyncAt: connection.last_sync_at,
        totalInvoices: invoices.length,
        overdueInvoices: overdueInvoices.length,
        totalReceivables,
        overdueAmount,
        totalPayments: payments.length,
        paymentsThisMonth,
        recentInvoices: invoices.slice(0, 5).map(inv => ({
          id: inv.quickbooks_invoice_id,
          docNumber: inv.quickbooks_doc_number || 'N/A',
          totalAmount: inv.total_amount,
          balance: inv.balance,
          dueDate: inv.due_date,
          status: inv.invoice_status
        })),
        recentPayments: payments.slice(0, 5).map(payment => ({
          id: payment.quickbooks_payment_id,
          amount: payment.amount,
          paymentDate: payment.payment_date,
          paymentMethod: payment.payment_method
        }))
      })

    } catch (err) {
      console.info('QuickBooks data not available:', err instanceof Error ? err.message : 'Unknown error')
      setError('QuickBooks integration not yet configured')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError('')
      
      const response = await fetch('/api/quickbooks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          syncType: 'selective',
          entities: ['invoices', 'payments']
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Sync failed')
      }
      
      // Refresh data after sync
      await fetchQuickBooksData()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync with QuickBooks')
    } finally {
      setSyncing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'sent':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'draft':
        return 'bg-stone-50 text-stone-700 border-stone-200'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            QuickBooks Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
            <div className="text-graphite text-sm">Loading QuickBooks data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.connectionStatus === 'disconnected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            QuickBooks Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-stone-300 mx-auto mb-4" />
            <div className="text-heading font-medium mb-2">QuickBooks Not Connected</div>
            <div className="text-sm text-graphite mb-4">
              Connect your QuickBooks account to view financial data
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect QuickBooks
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                QuickBooks Financial Overview
              </CardTitle>
              {data.companyName && (
                <div className="text-sm text-graphite mt-1">
                  Connected to {data.companyName}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {data.lastSyncAt && (
                <div className="text-xs text-graphite flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Last sync: {formatDate(data.lastSyncAt)}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-graphite">Total Receivables</div>
                <div className="text-2xl font-bold text-heading">{formatCurrency(data.totalReceivables)}</div>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-graphite">Overdue Amount</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(data.overdueAmount)}</div>
                <div className="text-xs text-red-500">{data.overdueInvoices} invoices</div>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-graphite">Total Invoices</div>
                <div className="text-2xl font-bold text-heading">{data.totalInvoices}</div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-graphite">Payments This Month</div>
                <div className="text-2xl font-bold text-heading">{data.paymentsThisMonth}</div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {(data.recentInvoices || []).length > 0 ? (
              <div className="space-y-3">
                {(data.recentInvoices || []).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-md">
                    <div>
                      <div className="font-medium text-sm">{invoice.docNumber}</div>
                      <div className="text-xs text-graphite">Due {formatDate(invoice.dueDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{formatCurrency(invoice.totalAmount)}</div>
                      {invoice.balance > 0 && (
                        <div className="text-xs text-amber-600">
                          Balance: {formatCurrency(invoice.balance)}
                        </div>
                      )}
                      <Badge variant="outline" className={`text-xs mt-1 ${getInvoiceStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-graphite text-sm">
                No invoices found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {(data.recentPayments || []).length > 0 ? (
              <div className="space-y-3">
                {(data.recentPayments || []).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                    <div>
                      <div className="font-medium text-sm">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-graphite">{payment.paymentMethod}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-graphite">{formatDate(payment.paymentDate)}</div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs mt-1">
                        Received
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-graphite text-sm">
                No recent payments
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}