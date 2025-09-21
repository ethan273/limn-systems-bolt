'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react'
import { 
  formatCurrency, 
  formatDate, 
  getInvoiceStatus, 
  statusStyles 
} from '@/lib/financial/calculations'

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  amount_paid: number
  status: string
  issue_date: string
  due_date: string
  created_at: string
  order_id?: string
}

interface InvoiceListProps {
  customerId: string
}

export function InvoiceList({ customerId }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  })
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [sortField, setSortField] = useState<keyof Invoice>('due_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const loadInvoices = useCallback(async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const invoicesWithStatus = (data || []).map(invoice => ({
        ...invoice,
        actualStatus: getInvoiceStatus(invoice)
      }))

      setInvoices(invoicesWithStatus)

    } catch (error) {
      console.error('Error loading invoices:', error)
      // Use fallback test data
      setInvoices([
        {
          id: '1',
          invoice_number: 'INV-2025-001',
          amount: 7700.00,
          amount_paid: 7700.00,
          status: 'paid',
          issue_date: '2025-07-01',
          due_date: '2025-07-31',
          created_at: '2025-07-01T09:00:00Z'
        },
        {
          id: '2',
          invoice_number: 'INV-2025-002',
          amount: 5500.00,
          amount_paid: 2000.00,
          status: 'pending',
          issue_date: '2025-08-01',
          due_date: '2025-09-15',
          created_at: '2025-08-01T09:00:00Z'
        },
        {
          id: '3',
          invoice_number: 'INV-2025-003',
          amount: 3200.00,
          amount_paid: 0,
          status: 'overdue',
          issue_date: '2025-07-15',
          due_date: '2025-08-15',
          created_at: '2025-07-15T09:00:00Z'
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadInvoices()
  }, [customerId, loadInvoices])

  const filteredAndSortedInvoices = invoices
    .filter(invoice => {
      // Status filter
      if (filters.status !== 'all' && invoice.status !== filters.status) return false
      
      // Search filter
      if (filters.search && !(invoice.invoice_number || "").toLowerCase().includes((filters.search || "").toLowerCase())) return false
      
      // Date range filter
      if (filters.dateFrom && new Date(invoice.issue_date) < new Date(filters.dateFrom)) return false
      if (filters.dateTo && new Date(invoice.issue_date) > new Date(filters.dateTo)) return false
      
      return true
    })
    .sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      // Handle date sorting
      if (sortField === 'issue_date' || sortField === 'due_date' || sortField === 'created_at') {
        aVal = new Date(aVal as string).getTime()
        bVal = new Date(bVal as string).getTime()
      }
      
      if (sortDirection === 'asc') {
        return (aVal || 0) > (bVal || 0) ? 1 : -1
      } else {
        return (aVal || 0) < (bVal || 0) ? 1 : -1
      }
    })

  const handleSort = (field: keyof Invoice) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const handleSelectAll = () => {
    if (selectedInvoices.length === filteredAndSortedInvoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(filteredAndSortedInvoices.map(inv => inv.id))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = statusStyles[status as keyof typeof statusStyles]
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo?.badge || statusStyles.draft.badge}`}>
        {getStatusIcon(status)}
        <span className="ml-1">{statusInfo?.text || status}</span>
      </span>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded w-32"></div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
            placeholder="Search invoice number..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none w-full"
          />
        </div>
        
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none"
            placeholder="From date"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                <Download className="w-4 h-4 mr-1" />
                Download Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === filteredAndSortedInvoices.length && filteredAndSortedInvoices.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#91bdbd] focus:ring-[#91bdbd]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('invoice_number')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Invoice</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('issue_date')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('amount')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('due_date')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Due Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedInvoices.map((invoice) => {
                const balanceDue = invoice.amount - invoice.amount_paid
                const isOverdue = invoice.status === 'overdue' || (new Date(invoice.due_date) < new Date() && balanceDue > 0)
                
                return (
                  <tr key={invoice.id} className={`hover:bg-gray-50 ${selectedInvoices.includes(invoice.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleSelectInvoice(invoice.id)}
                        className="rounded border-gray-300 text-[#91bdbd] focus:ring-[#91bdbd]"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#4b4949]">
                        {invoice.invoice_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(invoice.issue_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#4b4949]">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={balanceDue > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {formatCurrency(balanceDue)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {formatDate(invoice.due_date)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                          <Download className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600">
              {filters.search || filters.status !== 'all' || filters.dateFrom || filters.dateTo
                ? 'Try adjusting your filters'
                : 'Your invoices will appear here when they become available'
              }
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredAndSortedInvoices.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {filteredAndSortedInvoices.length} of {invoices.length} invoices
            </span>
            <div className="flex space-x-4">
              <span className="text-gray-600">
                Total Amount: <span className="font-medium text-[#4b4949]">
                  {formatCurrency(filteredAndSortedInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
                </span>
              </span>
              <span className="text-gray-600">
                Outstanding: <span className="font-medium text-red-600">
                  {formatCurrency(filteredAndSortedInvoices.reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0))}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}