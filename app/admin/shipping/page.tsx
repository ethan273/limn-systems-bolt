'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Download,
  Search,
  Plus,
  Eye,
  MoreHorizontal
} from 'lucide-react'

interface Shipment {
  id: string
  customer_order_number: string
  tracking_number: string
  carrier: string
  service_level: string
  status: 'pending' | 'booked' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception'
  ship_from: {
    city: string
    state: string
    country: string
  }
  ship_to: {
    name: string
    city: string
    state: string
    country: string
  }
  estimated_delivery: string
  actual_delivery?: string
  total_cost: number
  created_at: string
}

export default function AdminShippingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [, setShowQuoteModal] = useState(false)

  useEffect(() => {
    loadShipments()
  }, [])

  const loadShipments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/shipping/list')
      if (response.ok) {
        const data = await response.json()
        setShipments(data)
      }
    } catch (error) {
      console.error('Failed to load shipments:', error)
      // Mock data fallback
      setShipments([
        {
          id: '1',
          customer_order_number: 'ORD-2025-001',
          tracking_number: 'LIMN1674567890',
          carrier: 'FedEx',
          service_level: '2 Day',
          status: 'in_transit',
          ship_from: { city: 'San Francisco', state: 'CA', country: 'US' },
          ship_to: { name: 'Acme Corp', city: 'New York', state: 'NY', country: 'US' },
          estimated_delivery: '2025-01-30T17:00:00Z',
          total_cost: 45.99,
          created_at: '2025-01-25T10:00:00Z'
        },
        {
          id: '2',
          customer_order_number: 'ORD-2025-002',
          tracking_number: 'LIMN1674567891',
          carrier: 'UPS',
          service_level: 'Ground',
          status: 'delivered',
          ship_from: { city: 'San Francisco', state: 'CA', country: 'US' },
          ship_to: { name: 'Design Studio', city: 'Los Angeles', state: 'CA', country: 'US' },
          estimated_delivery: '2025-01-28T17:00:00Z',
          actual_delivery: '2025-01-27T14:30:00Z',
          total_cost: 32.50,
          created_at: '2025-01-22T09:15:00Z'
        },
        {
          id: '3',
          customer_order_number: 'ORD-2025-003',
          tracking_number: 'LIMN1674567892',
          carrier: 'FedEx',
          service_level: 'Overnight',
          status: 'exception',
          ship_from: { city: 'San Francisco', state: 'CA', country: 'US' },
          ship_to: { name: 'Luxury Hotels Inc', city: 'Miami', state: 'FL', country: 'US' },
          estimated_delivery: '2025-01-29T12:00:00Z',
          total_cost: 89.75,
          created_at: '2025-01-24T15:30:00Z'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = useCallback(() => {
    let filtered = [...shipments]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(shipment => shipment.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(shipment =>
        (shipment.customer_order_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shipment.tracking_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shipment.ship_to?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredShipments(filtered)
  }, [shipments, statusFilter, searchTerm])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      booked: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-blue-100 text-blue-800',
      out_for_delivery: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      exception: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-4 h-4" />
      case 'exception': return <AlertCircle className="w-4 h-4" />
      case 'in_transit':
      case 'out_for_delivery': return <Truck className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  const handleTrackingSearch = async (trackingNumber: string) => {
    try {
      const response = await fetch(`/api/shipping/track?orderNumber=${trackingNumber}`)
      if (response.ok) {
        const trackingData = await response.json()
        console.log('Tracking data:', trackingData)
        // Handle tracking data display
      }
    } catch (error) {
      console.error('Tracking search failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Management</h1>
          <p className="text-gray-700 mt-1">Manage shipments and track deliveries</p>
        </div>
        <button
          onClick={() => setShowQuoteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Shipment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">In Transit</p>
              <p className="text-2xl font-bold text-gray-900">
                {shipments.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status)).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Delivered Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {shipments.filter(s => {
                  const today = new Date().toDateString()
                  return s.status === 'delivered' && s.actual_delivery && 
                         new Date(s.actual_delivery).toDateString() === today
                }).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Exceptions</p>
              <p className="text-2xl font-bold text-gray-900">
                {shipments.filter(s => s.status === 'exception').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Awaiting Pickup</p>
              <p className="text-2xl font-bold text-gray-900">
                {shipments.filter(s => s.status === 'booked').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Quick Tracking</label>
            <div className="flex">
              <input
                type="text"
                placeholder="Enter tracking number..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleTrackingSearch((e.target as HTMLInputElement).value)
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement
                  handleTrackingSearch(input.value)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="booked">Booked</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="exception">Exception</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders, tracking..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order / Tracking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carrier / Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredShipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {shipment.customer_order_number}
                      </div>
                      <div className="text-sm text-blue-600 font-mono">
                        {shipment.tracking_number}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(shipment.status)}`}>
                        {getStatusIcon(shipment.status)}
                        <span className="ml-1">{(shipment.status || 'unknown').replace('_', ' ')}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{shipment.carrier}</div>
                    <div className="text-sm text-gray-700">{shipment.service_level}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{shipment.ship_to.name}</div>
                    <div className="text-sm text-gray-700">
                      {shipment.ship_to.city}, {shipment.ship_to.state}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {shipment.actual_delivery ? (
                      <div>
                        <div className="text-green-600 font-medium">Delivered</div>
                        <div className="text-xs">{new Date(shipment.actual_delivery).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <div>
                        <div>Est. {new Date(shipment.estimated_delivery).toLocaleDateString()}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ${shipment.total_cost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleTrackingSearch(shipment.customer_order_number)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredShipments.length === 0 && !loading && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments found</h3>
          <p className="text-gray-700">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first shipment to get started'
            }
          </p>
        </div>
      )}
    </div>
  )
}