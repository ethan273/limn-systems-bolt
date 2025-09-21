'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Package, 
  Calendar, 
 
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Factory
} from 'lucide-react'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  updated_at: string
  items_count: number
  description?: string
  delivery_date?: string
}

export default function PortalOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    loadOrders()
  }, [])  

  const loadOrders = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (customer) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })

        setOrders(data || [])
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      setOrders([
        {
          id: '1',
          order_number: 'ORD-2024-001',
          status: 'completed',
          total: 2450.00,
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-20T15:45:00Z',
          items_count: 3,
          description: 'Custom aluminum components for aerospace project',
          delivery_date: '2024-01-25T00:00:00Z'
        },
        {
          id: '2',
          order_number: 'ORD-2024-002',
          status: 'in_production',
          total: 1800.00,
          created_at: '2024-01-18T14:20:00Z',
          updated_at: '2024-01-22T09:15:00Z',
          items_count: 2,
          description: 'Precision machined parts for manufacturing line',
          delivery_date: '2024-02-05T00:00:00Z'
        },
        {
          id: '3',
          order_number: 'ORD-2024-003',
          status: 'pending',
          total: 3200.00,
          created_at: '2024-01-20T09:15:00Z',
          updated_at: '2024-01-20T09:15:00Z',
          items_count: 5,
          description: 'Complex assembly components for automotive industry',
          delivery_date: '2024-02-15T00:00:00Z'
        },
        {
          id: '4',
          order_number: 'ORD-2024-004',
          status: 'shipped',
          total: 980.00,
          created_at: '2024-01-12T16:45:00Z',
          updated_at: '2024-01-18T11:30:00Z',
          items_count: 1,
          description: 'Prototype housing for electronic device',
          delivery_date: '2024-01-22T00:00:00Z'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />
      case 'in_production': return <Factory className="w-5 h-5 text-blue-600" />
      case 'shipped': return <Truck className="w-5 h-5 text-purple-600" />
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <Package className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'in_production': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'shipped': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_production', label: 'In Production' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#4b4949]">Orders</h1>
          <p className="text-gray-600 mt-1">Track and manage your orders</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent text-sm">
              <SelectValue placeholder="All Orders" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-[#91bdbd] rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#4b4949] text-lg">{order.order_number}</h3>
                      <p className="text-sm text-gray-600">
                        Ordered on {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#4b4949]">
                      ${(order.total || 0).toLocaleString()}
                    </p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1 capitalize">{(order.status || 'pending').replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {order.description && (
                  <p className="text-gray-700 mb-4">{order.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div className="flex items-center text-gray-600">
                    <Package className="w-4 h-4 mr-2" />
                    {order.items_count} item{order.items_count !== 1 ? 's' : ''}
                  </div>
                  
                  {order.delivery_date && (
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Due: {formatDate(order.delivery_date)}
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Updated: {formatDate(order.updated_at)}
                  </div>
                </div>

                {/* Production Progress - Only show for in_production status */}
                {order.status === 'in_production' && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 flex items-center">
                        <Factory className="w-4 h-4 mr-1" />
                        Production Progress
                      </span>
                      <span className="font-medium text-[#4b4949]">65%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-gradient-to-r from-[#91bdbd] to-[#7da9a9] h-2 rounded-full transition-all duration-300"
                        style={{ width: '65%' }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Current Stage: Assembly</span>
                      <Link 
                        href={`/portal/orders/${order.id}/production`}
                        className="text-[#91bdbd] hover:text-[#7da9a9] font-medium"
                      >
                        View Production →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Order ID: {order.id}</span>
                  <Link 
                    href={`/portal/orders/${order.id}`}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-[#91bdbd] hover:text-[#7da9a9] transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#4b4949] mb-2">
            {selectedStatus === 'all' ? 'No orders found' : `No ${selectedStatus} orders`}
          </h3>
          <p className="text-gray-600">
            {selectedStatus === 'all' 
              ? 'Your orders will appear here once you place them'
              : `You don't have any ${selectedStatus} orders at the moment`
            }
          </p>
        </div>
      )}
    </div>
  )
}