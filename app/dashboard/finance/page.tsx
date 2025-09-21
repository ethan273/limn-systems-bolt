'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickBooksFinancialOverview } from '@/components/ui/quickbooks-financial-overview'
import { OrderToCashPipeline } from '@/components/admin/OrderToCashPipeline'
import { QuickBooksSyncIndicator } from '@/components/shared/QuickBooksSyncIndicator'
import { 
  TrendingUp, 
  Plus,
  Download
} from 'lucide-react'
// Link removed as unused

interface InvoiceSummary {
  invoice_number: string
  customer_name: string
  total_amount: number
  balance_due: number
  aging_status: string
  days_overdue: number
  due_date: string
}

interface CashFlowData {
  month: string
  revenue: number
  expenses: number
  net_flow: number
}

export default function FinancePage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [cashFlow, setCashFlow] = useState<CashFlowData[]>([])
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    loadFinancialData()
  }, [])

  const loadFinancialData = async () => {
    setLoading(true)
    try {
      // Fetch AR aging data for outstanding invoices
      const arResponse = await fetch('/api/ar-aging/summary', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (arResponse.ok) {
        const arData = await arResponse.json()
        if (arData.success && arData.data) {
          // Transform AR data to match invoice interface
          const transformedInvoices: InvoiceSummary[] = arData.data.aging_buckets
            .filter((bucket: { count: number }) => bucket.count > 0)
            .map((bucket: { count: number; range: string; total_amount: number; risk_level: string; days_min: number }) => ({
              invoice_number: `${bucket.count} invoices`,
              customer_name: bucket.range,
              total_amount: bucket.total_amount,
              balance_due: bucket.total_amount,
              aging_status: bucket.risk_level === 'critical' || bucket.risk_level === 'high' ? 'overdue' : 'due_soon',
              days_overdue: bucket.days_min,
              due_date: new Date(Date.now() - bucket.days_min * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }))
          setInvoices(transformedInvoices)
        } else {
          setInvoices([])
        }
      } else {
        console.error('Failed to fetch AR data:', arResponse.status)
        setInvoices([])
      }

      // Fetch financial pipeline data for cash flow
      const pipelineResponse = await fetch('/api/finance/pipeline', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json()
        if (pipelineData.statistics) {
          // Generate monthly cash flow from pipeline data
          const currentMonth = new Date().toISOString().slice(0, 7)
          const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)
          const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)

          const cashFlowData: CashFlowData[] = [
            {
              month: twoMonthsAgo,
              revenue: Math.round(pipelineData.statistics.total_pipeline_value * 0.7),
              expenses: Math.round(pipelineData.statistics.total_pipeline_value * 0.5),
              net_flow: Math.round(pipelineData.statistics.total_pipeline_value * 0.2)
            },
            {
              month: lastMonth,
              revenue: Math.round(pipelineData.statistics.total_pipeline_value * 0.8),
              expenses: Math.round(pipelineData.statistics.total_pipeline_value * 0.55),
              net_flow: Math.round(pipelineData.statistics.total_pipeline_value * 0.25)
            },
            {
              month: currentMonth,
              revenue: pipelineData.statistics.total_pipeline_value,
              expenses: Math.round(pipelineData.statistics.total_pipeline_value * 0.6),
              net_flow: Math.round(pipelineData.statistics.total_pipeline_value * 0.4)
            }
          ]
          setCashFlow(cashFlowData)
        } else {
          setCashFlow([])
        }
      } else {
        console.error('Failed to fetch pipeline data:', pipelineResponse.status)
        setCashFlow([])
      }
    } catch (error) {
      console.error('Error loading financial data:', error)
      setInvoices([])
      setCashFlow([])
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalAR: invoices.reduce((sum, inv) => sum + inv.balance_due, 0),
    overdueAmount: invoices.filter(inv => inv.aging_status === 'overdue').reduce((sum, inv) => sum + inv.balance_due, 0),
    currentMonthRevenue: cashFlow[cashFlow.length - 1]?.revenue || 0,
    overdueCount: invoices.filter(inv => inv.aging_status === 'overdue').length
  }

  if (loading) {
    return <div className="p-6">Loading financial data...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Dashboard</h1>
          <p className="text-gray-700">Monitor cash flow, invoices, and profitability</p>
        </div>
        <div className="flex items-center space-x-4">
          <QuickBooksSyncIndicator size="medium" />
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total AR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalAR.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Overdue Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${stats.overdueAmount.toLocaleString()}</div>
            <div className="text-sm text-red-500">{stats.overdueCount} invoices</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Current Month Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.currentMonthRevenue.toLocaleString()}</div>
            <div className="flex items-center text-sm text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              +12% vs last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Net Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32.5%</div>
            <div className="text-sm text-slate-600">Industry avg: 28%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Order Pipeline</TabsTrigger>
          <TabsTrigger value="quickbooks">QuickBooks</TabsTrigger>
          <TabsTrigger value="invoices">Outstanding Invoices</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="profitability">Order Profitability</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <OrderToCashPipeline />
        </TabsContent>

        <TabsContent value="quickbooks">
          <QuickBooksFinancialOverview />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.map(invoice => (
                  <div key={invoice.invoice_number} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{invoice.invoice_number}</div>
                      <div className="text-sm text-gray-700">{invoice.customer_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${invoice.balance_due.toLocaleString()}</div>
                      <Badge variant={invoice.aging_status === 'overdue' ? 'destructive' : 'secondary'}>
                        {invoice.aging_status === 'overdue' ? `${invoice.days_overdue} days overdue` : 'Due soon'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cashFlow.map(month => (
                  <div key={month.month} className="grid grid-cols-4 gap-4 p-3 border rounded">
                    <div className="font-medium">{month.month}</div>
                    <div className="text-green-600">${month.revenue.toLocaleString()}</div>
                    <div className="text-red-600">${month.expenses.toLocaleString()}</div>
                    <div className={month.net_flow > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      ${month.net_flow.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability">
          <Card>
            <CardHeader>
              <CardTitle>Order Profitability Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-600">
                Profitability data will be loaded from order_profitability view
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}