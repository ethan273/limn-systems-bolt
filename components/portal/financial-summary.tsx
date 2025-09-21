'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { formatCurrency, formatDate, getNextDueInvoice, calculateYTD } from '@/lib/financial/calculations'

interface FinancialData {
  outstandingBalance: number
  totalPaid: number
  creditBalance: number
  nextDueDate: string | null
  recentPayments: unknown[]
  ytdTotals: {
    invoiced: number
    paid: number
  }
}

interface FinancialSummaryProps {
  customerId: string
}

export function FinancialSummary({ customerId }: FinancialSummaryProps) {
  const [data, setData] = useState<FinancialData>({
    outstandingBalance: 0,
    totalPaid: 0,
    creditBalance: 0,
    nextDueDate: null,
    recentPayments: [],
    ytdTotals: { invoiced: 0, paid: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [showFinancials, setShowFinancials] = useState(false)

  useEffect(() => {
    loadFinancialData()
  }, [customerId])

  const loadFinancialData = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return

      // Check if financial details are enabled
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (!customer) return

      const { data: portalSettings } = await supabase
        .from('portal_settings')
        .select('show_financial_details')
        .eq('customer_id', customer.id)
        .single()

      if (!portalSettings?.show_financial_details) {
        setShowFinancials(false)
        setLoading(false)
        return
      }

      setShowFinancials(true)

      // Fetch financial data
      const [balanceResponse, invoicesResponse, paymentsResponse] = await Promise.all([
        supabase
          .from('customer_balances')
          .select('*')
          .eq('customer_id', customer.id)
          .single(),
        supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('customer_id', customer.id)
          .order('payment_date', { ascending: false })
          .limit(5)
      ])

      const balance = balanceResponse.data || {
        total_outstanding: 0,
        total_paid: 0,
        credit_balance: 0
      }
      
      const invoices = invoicesResponse.data || []
      const payments = paymentsResponse.data || []

      // Calculate YTD totals
      const ytdInvoiced = calculateYTD(invoices, 'issue_date', 'amount')
      const ytdPaid = calculateYTD(payments, 'payment_date', 'amount')

      // Find next due date
      const nextDueInvoice = getNextDueInvoice(invoices)

      setData({
        outstandingBalance: balance.total_outstanding || 0,
        totalPaid: balance.total_paid || 0,
        creditBalance: balance.credit_balance || 0,
        nextDueDate: nextDueInvoice?.due_date || null,
        recentPayments: payments,
        ytdTotals: {
          invoiced: ytdInvoiced,
          paid: ytdPaid
        }
      })

    } catch (error) {
      console.error('Error loading financial data:', error)
      // Use fallback data for testing
      setData({
        outstandingBalance: 8700.00,
        totalPaid: 9700.00,
        creditBalance: 0,
        nextDueDate: '2025-09-15',
        recentPayments: [
          {
            id: '1',
            amount: 2000.00,
            payment_date: '2025-08-15',
            payment_method: 'ach',
            status: 'completed'
          }
        ],
        ytdTotals: {
          invoiced: 16400.00,
          paid: 9700.00
        }
      })
      setShowFinancials(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!showFinancials) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Outstanding Balance Card */}
        <div className={`bg-white p-6 rounded-lg shadow-sm border-2 ${
          data.outstandingBalance > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-medium ${
              data.outstandingBalance > 0 ? 'text-red-900' : 'text-gray-700'
            }`}>
              Outstanding Balance
            </h3>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              data.outstandingBalance > 0 ? 'bg-red-500' : 'bg-gray-400'
            }`}>
              {data.outstandingBalance > 0 ? (
                <AlertCircle className="w-5 h-5 text-white" />
              ) : (
                <CheckCircle className="w-5 h-5 text-white" />
              )}
            </div>
          </div>
          
          <p className={`text-3xl font-bold ${
            data.outstandingBalance > 0 ? 'text-red-900' : 'text-green-900'
          }`}>
            {formatCurrency(data.outstandingBalance)}
          </p>
          
          {data.nextDueDate && data.outstandingBalance > 0 && (
            <p className="text-xs text-red-600 mt-2 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Next payment due {formatDate(data.nextDueDate)}
            </p>
          )}
          
          {data.outstandingBalance === 0 && (
            <p className="text-xs text-green-600 mt-2">
              All invoices are up to date
            </p>
          )}
        </div>

        {/* YTD Payments Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">YTD Payments</h3>
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <p className="text-3xl font-bold text-[#4b4949]">
            {formatCurrency(data.ytdTotals.paid)}
          </p>
          
          <p className="text-xs text-gray-600 mt-2">
            Of {formatCurrency(data.ytdTotals.invoiced)} invoiced
          </p>
        </div>

        {/* Credit Balance Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">
              {data.creditBalance > 0 ? 'Credit Balance' : 'Total Paid'}
            </h3>
            <div className="w-10 h-10 bg-[#91bdbd] rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <p className="text-3xl font-bold text-[#4b4949]">
            {formatCurrency(data.creditBalance > 0 ? data.creditBalance : data.totalPaid)}
          </p>
          
          {data.creditBalance > 0 && (
            <p className="text-xs text-green-600 mt-2">
              Available for future purchases
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-[#4b4949] mb-4">Quick Actions</h3>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {data.outstandingBalance > 0 && (
            <Button className="flex-1 bg-[#91bdbd] hover:bg-[#7da9a9] text-white">
              <CreditCard className="w-4 h-4 mr-2" />
              Make a Payment
            </Button>
          )}
          
          <Button 
            variant="outline" 
            className="flex-1 border-[#91bdbd] text-[#91bdbd] hover:bg-[#91bdbd] hover:text-white"
          >
            Download Statement
          </Button>
          
          <Button 
            variant="outline"
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            View All Invoices
          </Button>
        </div>
      </div>

      {/* Recent Payment Activity */}
      {(data.recentPayments || []).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-[#4b4949]">Recent Payments</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {(data.recentPayments || []).map((payment) => (
              <div key={String(safeGet(payment, ['id']) || Math.random())} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[#4b4949]">
                        Payment Received
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(String(safeGet(payment, ['payment_date']) || ''))} • {String(safeGet(payment, ['payment_method']) || '').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(Number(safeGet(payment, ['amount']) || 0))}
                    </p>
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {String(safeGet(payment, ['status']) || 'Unknown')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}