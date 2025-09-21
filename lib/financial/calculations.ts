export interface Invoice {
  id: string
  invoice_number: string
  amount: number
  amount_paid: number
  status: string
  issue_date: string
  due_date: string
  created_at: string
}

export interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  status: string
}

export interface CustomerBalance {
  total_outstanding: number
  total_paid: number
  credit_balance: number
  last_payment_date?: string
}

/**
 * Calculate outstanding balance from invoices
 */
export function calculateOutstandingBalance(invoices: Invoice[]): number {
  return invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.amount - inv.amount_paid, 0)
}

/**
 * Calculate year-to-date totals
 */
export function calculateYTD(items: unknown[], dateField: string, amountField: string): number {
  const yearStart = new Date(new Date().getFullYear(), 0, 1)
  return items
    .filter(item => {
      const record = item as Record<string, unknown>
      return new Date(String(record[dateField])) >= yearStart
    })
    .reduce((sum: number, item) => {
      const record = item as Record<string, unknown>
      return sum + Number(record[amountField] || 0)
    }, 0)
}

/**
 * Format currency values consistently
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Determine invoice status based on amount and due date
 */
export function getInvoiceStatus(invoice: Invoice): 'paid' | 'pending' | 'overdue' | 'draft' {
  if (invoice.status === 'paid' || invoice.amount_paid >= invoice.amount) return 'paid'
  if (invoice.status === 'draft') return 'draft'
  if (new Date(invoice.due_date) < new Date()) return 'overdue'
  return 'pending'
}

/**
 * Generate statement period (last month)
 */
export function generateStatementPeriod(): { start: Date, end: Date } {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 1)
  return { start, end }
}

/**
 * Calculate aging buckets for AR analysis
 */
export function calculateAging(invoices: Invoice[]) {
  const today = new Date()
  const aging = {
    current: 0,     // 0-30 days
    days31_60: 0,   // 31-60 days
    days61_90: 0,   // 61-90 days
    over90: 0       // 90+ days
  }

  invoices
    .filter(inv => inv.status !== 'paid')
    .forEach(invoice => {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      const outstanding = invoice.amount - invoice.amount_paid

      if (daysOverdue <= 30) {
        aging.current += outstanding
      } else if (daysOverdue <= 60) {
        aging.days31_60 += outstanding
      } else if (daysOverdue <= 90) {
        aging.days61_90 += outstanding
      } else {
        aging.over90 += outstanding
      }
    })

  return aging
}

/**
 * Get payment method display name
 */
export function getPaymentMethodDisplay(method: string): { name: string, icon: string } {
  const methods: Record<string, { name: string, icon: string }> = {
    credit_card: { name: 'Credit Card', icon: 'CreditCard' },
    debit_card: { name: 'Debit Card', icon: 'CreditCard' },
    ach: { name: 'ACH Transfer', icon: 'Building2' },
    wire: { name: 'Wire Transfer', icon: 'Zap' },
    check: { name: 'Check', icon: 'Receipt' },
    cash: { name: 'Cash', icon: 'DollarSign' },
    other: { name: 'Other', icon: 'HelpCircle' }
  }
  return methods[method] || methods.other
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format relative date (e.g., "3 days ago", "in 5 days")
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 0) return `in ${diffDays} days`
  return `${Math.abs(diffDays)} days ago`
}

/**
 * Calculate payment percentage
 */
export function calculatePaymentPercentage(amountPaid: number, totalAmount: number): number {
  if (totalAmount === 0) return 0
  return Math.round((amountPaid / totalAmount) * 100)
}

/**
 * Get next due invoice
 */
export function getNextDueInvoice(invoices: Invoice[]): Invoice | null {
  const unpaidInvoices = invoices.filter(inv => getInvoiceStatus(inv) !== 'paid')
  if (unpaidInvoices.length === 0) return null

  return unpaidInvoices.reduce((earliest, current) => 
    new Date(current.due_date) < new Date(earliest.due_date) ? current : earliest
  )
}

/**
 * Calculate total amount from payments
 */
export function calculateTotalPayments(payments: Payment[]): number {
  return payments
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0)
}

/**
 * Status badge colors for consistent theming
 */
export const statusStyles = {
  paid: {
    badge: 'bg-green-100 text-green-800 border-green-200',
    icon: 'CheckCircle',
    text: 'Paid'
  },
  pending: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: 'Clock',
    text: 'Pending'
  },
  overdue: {
    badge: 'bg-red-100 text-red-800 border-red-200',
    icon: 'AlertCircle',
    text: 'Overdue'
  },
  draft: {
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: 'FileText',
    text: 'Draft'
  }
}

/**
 * Document type categories
 */
export const documentCategories = {
  statement: { 
    icon: 'FileText', 
    color: 'blue',
    label: 'Statements',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800'
  },
  tax: { 
    icon: 'Receipt', 
    color: 'green',
    label: 'Tax Documents',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800'
  },
  contract: { 
    icon: 'FileSignature', 
    color: 'purple',
    label: 'Contracts',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800'
  },
  report: { 
    icon: 'BarChart3', 
    color: 'orange',
    label: 'Reports',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800'
  }
}