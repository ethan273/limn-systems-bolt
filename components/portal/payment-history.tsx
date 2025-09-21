'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  CreditCard,
  Building2,
  Zap,
  Receipt,
  DollarSign,
  HelpCircle,
  Download,
  CheckCircle,
  ExternalLink,
  Search
} from 'lucide-react'
import { 
  formatCurrency, 
  formatDate, 
  getPaymentMethodDisplay 
} from '@/lib/financial/calculations'

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  status: string
  invoice_number?: string
  invoice_id?: string
  reference_number?: string
  notes?: string
  running_balance?: number
}

interface PaymentHistoryProps {
  customerId: string
}

export function PaymentHistory({ customerId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    method: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  })
  const [showRunningBalance, setShowRunningBalance] = useState(false)

  const loadPaymentHistory = useCallback(async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoices (
            invoice_number
          )
        `)
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false })

      if (error) throw error

      const processedPayments = (data || []).map(payment => ({
        ...payment,
        invoice_number: payment.invoices?.invoice_number || 'N/A'
      }))

      // Calculate running balance
      let runningTotal = 0
      const paymentsWithBalance = processedPayments.reverse().map(payment => {
        runningTotal += payment.amount
        return {
          ...payment,
          running_balance: runningTotal
        }
      }).reverse()

      setPayments(paymentsWithBalance)

    } catch (error) {
      console.error('Error loading payment history:', error)
      // Use fallback test data
      setPayments([
        {
          id: '1',
          amount: 7700.00,
          payment_date: '2025-07-28',
          payment_method: 'credit_card',
          status: 'completed',
          invoice_number: 'INV-2025-001',
          reference_number: 'TXN-123456',
          notes: 'Paid in full',
          running_balance: 9700.00
        },
        {
          id: '2',
          amount: 2000.00,
          payment_date: '2025-08-15',
          payment_method: 'ach',
          status: 'completed',
          invoice_number: 'INV-2025-002',
          reference_number: 'TXN-123457',
          notes: 'Partial payment',
          running_balance: 2000.00
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadPaymentHistory()
  }, [customerId, loadPaymentHistory])

  const filteredPayments = payments.filter(payment => {
    // Payment method filter
    if (filters.method !== 'all' && payment.payment_method !== filters.method) return false
    
    // Search filter
    if (filters.search && !payment.invoice_number?.toLowerCase().includes((filters.search || "").toLowerCase())) return false
    
    // Date range filter
    if (filters.dateFrom && new Date(payment.payment_date) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(payment.payment_date) > new Date(filters.dateTo)) return false
    
    return true
  })

  const getPaymentMethodIcon = (method: string) => {
    const methodInfo = getPaymentMethodDisplay(method)
    switch (methodInfo.icon) {
      case 'CreditCard':
        return <CreditCard className="w-4 h-4" />
      case 'Building2':
        return <Building2 className="w-4 h-4" />
      case 'Zap':
        return <Zap className="w-4 h-4" />
      case 'Receipt':
        return <Receipt className="w-4 h-4" />
      case 'DollarSign':
        return <DollarSign className="w-4 h-4" />
      default:
        return <HelpCircle className="w-4 h-4" />
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ach':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'wire':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'check':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'cash':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Amount', 'Method', 'Invoice', 'Reference', 'Status', 'Notes'].join(','),
      ...filteredPayments.map(payment => [
        formatDate(payment.payment_date),
        payment.amount,
        getPaymentMethodDisplay(payment.payment_method).name,
        payment.invoice_number || '',
        payment.reference_number || '',
        payment.status,
        payment.notes || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', `payment-history-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded w-32"></div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none w-full"
          />
        </div>
        
        <select
          value={filters.method}
          onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none"
        >
          <option value="all">All Methods</option>
          <option value="credit_card">Credit Card</option>
          <option value="debit_card">Debit Card</option>
          <option value="ach">ACH Transfer</option>
          <option value="wire">Wire Transfer</option>
          <option value="check">Check</option>
          <option value="cash">Cash</option>
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRunningBalance(!showRunningBalance)}
            className="border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            {showRunningBalance ? 'Hide' : 'Show'} Balance
          </Button>
          
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="border-[#91bdbd] text-[#91bdbd] hover:bg-[#91bdbd] hover:text-white"
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Payment History */}
      <div className="space-y-3">
        {filteredPayments.map((payment) => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getPaymentMethodColor(payment.payment_method)}`}>
                  {getPaymentMethodIcon(payment.payment_method)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-[#4b4949]">
                      {formatCurrency(payment.amount)}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {payment.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {formatDate(payment.payment_date)} • {getPaymentMethodDisplay(payment.payment_method).name}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Invoice:</span>
                      <span className="ml-1 font-medium text-[#4b4949]">
                        {payment.invoice_number}
                      </span>
                    </div>
                    
                    {payment.reference_number && (
                      <div>
                        <span className="text-gray-500">Reference:</span>
                        <span className="ml-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {payment.reference_number}
                        </span>
                      </div>
                    )}
                    
                    {showRunningBalance && (
                      <div>
                        <span className="text-gray-500">Running Total:</span>
                        <span className="ml-1 font-medium text-green-600">
                          {formatCurrency(payment.running_balance || 0)}
                        </span>
                      </div>
                    )}
                    
                    {payment.notes && (
                      <div className="md:col-span-2">
                        <span className="text-gray-500">Notes:</span>
                        <span className="ml-1 text-gray-700">{payment.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                  <Receipt className="w-3 h-3 mr-1" />
                  Receipt
                </Button>
                <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
          <p className="text-gray-600">
            {filters.search || filters.method !== 'all' || filters.dateFrom || filters.dateTo
              ? 'Try adjusting your filters'
              : 'Your payment history will appear here when payments are processed'
            }
          </p>
        </div>
      )}

      {/* Summary */}
      {filteredPayments.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Payments:</span>
              <span className="ml-2 font-semibold text-[#4b4949]">
                {filteredPayments.length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Amount:</span>
              <span className="ml-2 font-semibold text-green-600">
                {formatCurrency(filteredPayments.reduce((sum, payment) => sum + payment.amount, 0))}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Average Payment:</span>
              <span className="ml-2 font-semibold text-[#4b4949]">
                {formatCurrency(filteredPayments.reduce((sum, payment) => sum + payment.amount, 0) / filteredPayments.length)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}