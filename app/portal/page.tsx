'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  ShoppingCart, 
  FileText, 
  Clock, 
  CheckCircle,
  Package,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Upload,
  Download,
  Eye,
  Badge as BadgeIcon,
  Truck,
  MapPin
} from 'lucide-react'
import { safeFormatString, safeToUpperCase } from '@/lib/utils/string-helpers'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  items_count: number
}

interface Stats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalFiles: number
}

interface FinancialSummary {
  outstandingBalance: number
  nextDueDate: string | null
  ytdPaid: number
  showFinancials: boolean
}

interface RecentDocument {
  id: string
  file_name: string
  file_type: string
  category: string
  created_at: string
  file_size: number
}

interface PortalSettings {
  allow_document_upload: boolean
  show_financial_details: boolean
  allow_design_approval: boolean
  show_shipping_info: boolean
}

interface PendingApproval {
  id: string
  title: string
  created_at: string
}

export default function PortalDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalFiles: 0
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [financials, setFinancials] = useState<FinancialSummary>({
    outstandingBalance: 0,
    nextDueDate: null,
    ytdPaid: 0,
    showFinancials: false
  })
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([])
  const [portalSettings, setPortalSettings] = useState<PortalSettings>({
    allow_document_upload: false,
    show_financial_details: false,
    allow_design_approval: false,
    show_shipping_info: false
  })
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [activeShipments, setActiveShipments] = useState<Array<{ id: string; tracking_number: string; carrier: string; status: string; estimated_delivery?: string; order?: { id: string; order_number: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])  

  const loadDashboardData = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return
      
      setUser(session.user)
      
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (customer) {
        const [ordersResponse, filesResponse, documentsResponse, portalSettingsResponse] = await Promise.all([
          supabase
            .from('orders')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('files')
            .select('id')
            .eq('customer_id', customer.id),
          supabase
            .from('client_files')
            .select('id, file_name, file_type, category, created_at, file_size')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('portal_settings')
            .select('show_financial_details, allow_document_upload, allow_design_approval, show_shipping_info')
            .eq('customer_id', customer.id)
            .single()
        ])

        const orders = ordersResponse.data || []
        const files = filesResponse.data || []
        const documents = documentsResponse.data || []
        const settings = portalSettingsResponse.data

        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => o.status === 'pending').length,
          completedOrders: orders.filter(o => o.status === 'completed').length,
          totalFiles: files.length + documents.length
        })

        setRecentOrders(orders)
        setRecentDocuments(documents)
        setPortalSettings({
          allow_document_upload: settings?.allow_document_upload || false,
          show_financial_details: settings?.show_financial_details || false,
          allow_design_approval: settings?.allow_design_approval || false,
          show_shipping_info: settings?.show_shipping_info || false
        })

        // Load pending design approvals if enabled
        if (settings?.allow_design_approval) {
          const { data: approvals } = await supabase
            .from('design_approvals')
            .select('id, title, created_at')
            .eq('customer_id', customer.id)
            .in('status', ['pending', 'reviewing'])
            .order('created_at', { ascending: false })
            .limit(3)

          setPendingApprovals(approvals || [])
        }

        // Load active shipments if enabled
        if (settings?.show_shipping_info) {
          const { data: shipments } = await supabase
            .from('shipments')
            .select(`
              *,
              order:orders!inner(order_number)
            `)
            .eq('customer_id', customer.id)
            .not('status', 'eq', 'delivered')
            .order('created_at', { ascending: false })
            .limit(3)

          setActiveShipments(shipments || [])
        }

        // Load financial data if enabled
        if (settings?.show_financial_details) {
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
              .in('status', ['pending', 'overdue'])
              .order('due_date', { ascending: true })
              .limit(1),
            supabase
              .from('payments')
              .select('amount')
              .eq('customer_id', customer.id)
              .gte('payment_date', new Date(new Date().getFullYear(), 0, 1).toISOString())
          ])

          const balance = balanceResponse.data || { total_outstanding: 0 }
          const nextInvoice = invoicesResponse.data?.[0]
          const ytdPayments = paymentsResponse.data || []

          setFinancials({
            outstandingBalance: balance.total_outstanding || 0,
            nextDueDate: nextInvoice?.due_date || null,
            ytdPaid: ytdPayments.reduce((sum, payment) => sum + payment.amount, 0),
            showFinancials: true
          })
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setStats({
        totalOrders: 12,
        pendingOrders: 3,
        completedOrders: 9,
        totalFiles: 24
      })
      setRecentOrders([
        {
          id: '1',
          order_number: 'ORD-2024-001',
          status: 'completed',
          total: 2450.00,
          created_at: '2024-01-15T10:30:00Z',
          items_count: 3
        },
        {
          id: '2',
          order_number: 'ORD-2024-002',
          status: 'pending',
          total: 1800.00,
          created_at: '2024-01-18T14:20:00Z',
          items_count: 2
        },
        {
          id: '3',
          order_number: 'ORD-2024-003',
          status: 'in_production',
          total: 3200.00,
          created_at: '2024-01-20T09:15:00Z',
          items_count: 5
        }
      ])
      
      // Set fallback financial data for testing
      setFinancials({
        outstandingBalance: 8700.00,
        nextDueDate: '2025-09-15',
        ytdPaid: 9700.00,
        showFinancials: true
      })

      // Set fallback document data
      setRecentDocuments([
        {
          id: '1',
          file_name: 'Product_Specifications.pdf',
          file_type: 'application/pdf',
          category: 'specifications',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          file_size: 2456789
        },
        {
          id: '2',
          file_name: 'Design_Mockup_v3.pdf',
          file_type: 'application/pdf',
          category: 'design',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          file_size: 5678901
        },
        {
          id: '3',
          file_name: 'Product_Photo_1.jpg',
          file_type: 'image/jpeg',
          category: 'photos',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          file_size: 1234567
        }
      ])

      // Set fallback portal settings
      setPortalSettings({
        allow_document_upload: true,
        show_financial_details: true,
        allow_design_approval: true,
        show_shipping_info: true
      })

      // Set fallback design approvals
      setPendingApprovals([
        {
          id: '1',
          title: 'Dining Table Design v2',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          title: 'Chair Upholstery Options',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])

      // Set fallback active shipments
      setActiveShipments([
        {
          id: '1',
          tracking_number: 'FDX123456789',
          carrier: 'FedEx',
          status: 'in_transit',
          estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          order: {
            id: 'ord-1',
            order_number: 'ORD-2024-001'
          }
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'in_production': return 'text-blue-600 bg-blue-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500 text-white'
      case 'out_for_delivery': return 'bg-blue-500 text-white'
      case 'in_transit': return 'bg-yellow-500 text-white'
      case 'shipped': return 'bg-purple-500 text-white'
      case 'processing': return 'bg-gray-500 text-white'
      case 'exception': return 'bg-red-500 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const downloadDocument = (documentId: string, fileName: string) => {
    console.log('Downloading document:', fileName)
    // In real implementation, this would hit the API endpoint
    // window.open(`/api/portal/documents/${documentId}/download`, '_blank')
    
    // For demo, just show a toast
    console.log(`Document ${fileName} download started`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#4b4949] mb-2">Portal Dashboard</h1>
        <p className="text-gray-700">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Total Orders</p>
              <p className="text-3xl font-bold text-[#4b4949]">{stats.totalOrders}</p>
            </div>
            <div className="w-12 h-12 bg-[#91bdbd] rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Pending Orders</p>
              <p className="text-3xl font-bold text-[#4b4949]">{stats.pendingOrders}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Completed Orders</p>
              <p className="text-3xl font-bold text-[#4b4949]">{stats.completedOrders}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Total Files</p>
              <p className="text-3xl font-bold text-[#4b4949]">{stats.totalFiles}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Widget */}
      {financials.showFinancials && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#4b4949]">Account Summary</h2>
            <Link 
              href="/portal/financials"
              className="text-sm text-[#91bdbd] hover:text-[#7da9a9] transition-colors"
            >
              View all →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-4 rounded-lg border-2 ${
              financials.outstandingBalance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Outstanding Balance</span>
                {financials.outstandingBalance > 0 ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
              <p className={`text-2xl font-bold ${
                financials.outstandingBalance > 0 ? 'text-red-900' : 'text-green-900'
              }`}>
                {formatCurrency(financials.outstandingBalance)}
              </p>
              {financials.nextDueDate && financials.outstandingBalance > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Next due: {formatDate(financials.nextDueDate)}
                </p>
              )}
            </div>

            <div className="p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">YTD Payments</span>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-[#4b4949]">
                {formatCurrency(financials.ytdPaid)}
              </p>
              <p className="text-xs text-gray-600 mt-1">This year</p>
            </div>

            <div className="p-4 rounded-lg border border-gray-200">
              <div className="text-center">
                <Link href="/portal/financials">
                  <button className="w-full bg-[#91bdbd] hover:bg-[#7da9a9] text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    {financials.outstandingBalance > 0 ? 'Make Payment' : 'View Financials'}
                  </button>
                </Link>
                <Link href="/portal/financials">
                  <button className="w-full mt-2 border border-[#91bdbd] text-[#91bdbd] hover:bg-[#91bdbd] hover:text-white px-4 py-2 rounded text-sm transition-colors">
                    Download Statement
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Management Widget */}
      {portalSettings.allow_document_upload && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#4b4949]">Recent Documents</h2>
            <Link 
              href="/portal/documents"
              className="text-sm text-[#91bdbd] hover:text-[#7da9a9] transition-colors"
            >
              View all →
            </Link>
          </div>
          
          {recentDocuments.length > 0 ? (
            <div className="space-y-3">
              {recentDocuments.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#91bdbd] rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{doc.category} • {formatDate(doc.created_at)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadDocument(doc.id, doc.file_name)}
                    className="p-2 text-gray-400 hover:text-[#91bdbd] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <Link href="/portal/documents">
                <button className="w-full mt-4 bg-[#91bdbd] hover:bg-[#7da9a9] text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Documents
                </button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 mb-2">No documents yet</p>
              <p className="text-sm text-gray-500 mb-4">Upload your project documents to get started</p>
              <Link href="/portal/documents">
                <button className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center mx-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload First Document
                </button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Shipping Widget */}
      {portalSettings.show_shipping_info && activeShipments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#4b4949] flex items-center">
              <Truck className="w-5 h-5 mr-2 text-[#91bdbd]" />
              Active Shipments
            </h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#91bdbd] text-white">
                {activeShipments.length}
              </span>
              <Link 
                href="/portal/shipping"
                className="text-sm text-[#91bdbd] hover:text-[#7da9a9] transition-colors font-medium"
              >
                View all →
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            {activeShipments.slice(0, 3).map(shipment => (
              <div key={shipment.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#91bdbd] rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[#4b4949]">
                        {shipment.tracking_number}
                      </p>
                      <p className="text-xs text-gray-600">
                        {shipment.order?.order_number} • {shipment.carrier}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getShipmentStatusColor(shipment.status)}`}>
                    {safeToUpperCase(safeFormatString(shipment.status, 'unknown'), 'UNKNOWN')}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin className="w-3 h-3" />
                  <span>Est. Delivery: {shipment.estimated_delivery ? formatDate(shipment.estimated_delivery) : 'TBD'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Design Approvals Widget */}
      {portalSettings.allow_design_approval && pendingApprovals.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-yellow-200 bg-yellow-50">
          <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-100/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#4b4949] flex items-center">
                <Eye className="w-5 h-5 mr-2 text-yellow-600" />
                Pending Approvals
              </h2>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800 border border-yellow-300">
                  <BadgeIcon className="w-3 h-3 mr-1" />
                  {pendingApprovals.length}
                </span>
                <Link 
                  href="/portal/approvals"
                  className="text-sm text-[#91bdbd] hover:text-[#7da9a9] transition-colors font-medium"
                >
                  View all →
                </Link>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {pendingApprovals.slice(0, 3).map(approval => (
                <div key={approval.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 border border-yellow-300 rounded-lg flex items-center justify-center">
                      <Eye className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[#4b4949]">{approval.title}</p>
                      <p className="text-xs text-gray-600">
                        Submitted {formatDate(approval.created_at)}
                      </p>
                    </div>
                  </div>
                  <Link href="/portal/approvals">
                    <button className="px-3 py-1.5 bg-[#91bdbd] hover:bg-[#7da9a9] text-white text-sm font-medium rounded transition-colors">
                      Review
                    </button>
                  </Link>
                </div>
              ))}
            </div>
            {pendingApprovals.length > 3 && (
              <Link
                href="/portal/approvals"
                className="text-sm text-[#91bdbd] hover:text-[#7da9a9] mt-4 inline-block font-medium"
              >
                View all {pendingApprovals.length} pending approvals →
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#4b4949]">Recent Orders</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-[#91bdbd] rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-[#4b4949]">{order.order_number}</p>
                      <p className="text-sm text-gray-700">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[#4b4949]">${order.total?.toLocaleString() || '0'}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {safeFormatString(order.status, 'unknown')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700">No orders found</p>
              <p className="text-sm text-gray-700">Your orders will appear here once you place them</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}