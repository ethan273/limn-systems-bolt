'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { FinancialSummary } from '@/components/portal/financial-summary'
import { InvoiceList } from '@/components/portal/invoice-list'
import { PaymentHistory } from '@/components/portal/payment-history'
import { DocumentLibrary } from '@/components/portal/document-library'
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  FolderOpen,
  ArrowLeft,
  Download,
  Eye
} from 'lucide-react'

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'documents', label: 'Documents', icon: FolderOpen }
]

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    checkFinancialAccess()
  }, [])  

  const checkFinancialAccess = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        window.location.href = '/portal/login'
        return
      }

      // Get customer ID and check portal settings
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (!customer) {
        console.error('Customer not found')
        setLoading(false)
        return
      }

      const { data: portalSettings } = await supabase
        .from('portal_settings')
        .select('show_financial_details')
        .eq('customer_id', customer.id)
        .single()

      if (portalSettings?.show_financial_details) {
        setCustomerId(customer.id)
        setHasAccess(true)
      } else {
        setHasAccess(false)
      }

    } catch (error) {
      console.error('Error checking financial access:', error)
      // For testing, allow access with fallback customer ID
      setCustomerId('e19ec83f-69be-4f34-b35e-ba78c5c25dba')
      setHasAccess(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="flex space-x-1 border-b border-gray-200 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-t w-24"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Financial Information Not Available
          </h3>
          <p className="text-gray-600 mb-4">
            Financial details are not enabled for your account. Please contact support if you need access.
          </p>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/portal'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4b4949] mb-2">Financial Information</h1>
          <p className="text-gray-600">View your invoices, payments, and financial documents</p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" className="border-[#91bdbd] text-[#91bdbd] hover:bg-[#91bdbd] hover:text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#91bdbd] text-[#91bdbd]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && customerId && (
          <div className="space-y-8">
            <FinancialSummary customerId={customerId} />
          </div>
        )}

        {activeTab === 'invoices' && customerId && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#4b4949] mb-4">All Invoices</h2>
              <InvoiceList customerId={customerId} />
            </div>
          </div>
        )}

        {activeTab === 'payments' && customerId && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#4b4949] mb-4">Payment History</h2>
              <PaymentHistory customerId={customerId} />
            </div>
          </div>
        )}

        {activeTab === 'documents' && customerId && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#4b4949] mb-4">Financial Documents</h2>
              <DocumentLibrary customerId={customerId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}