'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { PageHeader } from '@/components/ui/page-header'
// Removed unused imports
import { 
  ShoppingCart, 
  Package, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Eye,
  MoreHorizontal,
  Truck,
  MapPin,
  Edit,
  MessageSquare,
  Mail,
  X
} from 'lucide-react'
import { PageLoading } from '@/components/ui/enhanced-loading-states'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  tracking_number?: string
  total_amount: number
  created_at: string
  estimated_delivery?: string
  shipping_address: {
    city: string
    state: string
    country: string
  }
  production_stage?: string
  production_progress?: number
  computed_status?: string
  carrier_name?: string
  shipping_status?: string
  item_count?: number
  customer?: unknown
  order_items?: unknown[]
  production?: unknown[]
  shipment?: unknown[]
}

interface AdvancedFiltersForm {
  dateRange: {
    start: string
    end: string
  }
  customerName: string
  minAmount: string
  maxAmount: string
  productCategory: string
  carrier: string
}

interface UpdateStatusForm {
  status: string
  trackingNumber: string
  carrier: string
  estimatedDelivery: string
  notes: string
}

interface AddNoteForm {
  note: string
  noteType: string
  isInternal: boolean
}

interface CustomerNotificationForm {
  template: string
  type: string
  subject: string
  message: string
  includeTracking: boolean
  includeDeliveryEstimate: boolean
}

export default function OrderTrackingPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal states
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false)
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [customerNotifyOpen, setCustomerNotifyOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [, setSelectedOrderNumber] = useState<string>('')
  
  // Form states
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersForm>({
    dateRange: { start: '', end: '' },
    customerName: '',
    minAmount: '',
    maxAmount: '',
    productCategory: '',
    carrier: ''
  })
  
  const [updateStatusForm, setUpdateStatusForm] = useState<UpdateStatusForm>({
    status: '',
    trackingNumber: '',
    carrier: '',
    estimatedDelivery: '',
    notes: ''
  })
  
  const [addNoteForm, setAddNoteForm] = useState<AddNoteForm>({
    note: '',
    noteType: 'general',
    isInternal: false
  })
  
  const [notificationForm, setNotificationForm] = useState<CustomerNotificationForm>({
    template: 'order_update',
    type: 'email',
    subject: '',
    message: '',
    includeTracking: true,
    includeDeliveryEstimate: true
  })
  
  const [submitting, setSubmitting] = useState(false)

  const applyFilters = useCallback(() => {
    let filtered = [...orders]

    // Basic filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.computed_status === statusFilter || order.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.tracking_number && (order.tracking_number || "").toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.production_stage?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply advanced filters
    if (advancedFilters.dateRange.start) {
      filtered = filtered.filter(order => 
        new Date(order.created_at) >= new Date(advancedFilters.dateRange.start)
      )
    }
    
    if (advancedFilters.dateRange.end) {
      filtered = filtered.filter(order => 
        new Date(order.created_at) <= new Date(advancedFilters.dateRange.end)
      )
    }
    
    if (advancedFilters.customerName) {
      filtered = filtered.filter(order =>
        (order.customer_name || "").toLowerCase().includes((advancedFilters.customerName || "").toLowerCase())
      )
    }
    
    if (advancedFilters.minAmount) {
      filtered = filtered.filter(order => order.total_amount >= parseFloat(advancedFilters.minAmount))
    }
    
    if (advancedFilters.maxAmount) {
      filtered = filtered.filter(order => order.total_amount <= parseFloat(advancedFilters.maxAmount))
    }

    setFilteredOrders(filtered)
  }, [orders, statusFilter, searchTerm, advancedFilters])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        limit: '50'
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      // Fetch real order tracking data from API
      const response = await fetch(`/api/order-tracking?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setOrders(result.data)
          setError('')
          console.log(`Loaded ${result.data.length} orders from order tracking API`)
          return
        }
      }

      // If API fails or returns no data, set empty array with helpful error message
      console.log('Order Tracking API returned no data or failed - check if orders table exists')
      setOrders([])
      setError('No order tracking data available. Check if orders table exists and contains data.')
    } catch (error) {
      console.error('Error fetching order tracking data:', error)
      setError(`Failed to load order tracking data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchTerm])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const handleAdvancedFiltersSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAdvancedFiltersOpen(false)
    applyFilters()
  }

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/orders/${selectedOrderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateStatusForm)
      })
      
      if (response.ok) {
        setUpdateStatusOpen(false)
        setUpdateStatusForm({
          status: '',
          trackingNumber: '',
          carrier: '',
          estimatedDelivery: '',
          notes: ''
        })
        loadOrders()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/orders/${selectedOrderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addNoteForm)
      })
      
      if (response.ok) {
        setAddNoteOpen(false)
        setAddNoteForm({
          note: '',
          noteType: 'general',
          isInternal: false
        })
      }
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCustomerNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/orders/${selectedOrderId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationForm)
      })
      
      if (response.ok) {
        setCustomerNotifyOpen(false)
        setNotificationForm({
          template: 'order_update',
          type: 'email',
          subject: '',
          message: '',
          includeTracking: true,
          includeDeliveryEstimate: true
        })
      }
    } catch (error) {
      console.error('Error sending notification:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const openUpdateStatusModal = (orderId: string, orderNumber: string) => {
    setSelectedOrderId(orderId)
    setSelectedOrderNumber(orderNumber)
    setUpdateStatusOpen(true)
  }

  const openAddNoteModal = (orderId: string, orderNumber: string) => {
    setSelectedOrderId(orderId)
    setSelectedOrderNumber(orderNumber)
    setAddNoteOpen(true)
  }

  const openCustomerNotifyModal = (orderId: string, orderNumber: string) => {
    setSelectedOrderId(orderId)
    setSelectedOrderNumber(orderNumber)
    setCustomerNotifyOpen(true)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-slate-900',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-4 h-4" />
      case 'cancelled': return <AlertCircle className="w-4 h-4" />
      case 'shipped': return <Truck className="w-4 h-4" />
      case 'processing': return <Package className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      dateRange: { start: '', end: '' },
      customerName: '',
      minAmount: '',
      maxAmount: '',
      productCategory: '',
      carrier: ''
    })
  }

  const getOrderActionItems = (orderId: string, orderNumber: string) => [
    {
      label: 'Edit Order',
      icon: Edit,
      onClick: () => router.push(`/dashboard/orders/${orderId}`)
    },
    {
      label: 'Update Status',
      icon: CheckCircle,
      onClick: () => openUpdateStatusModal(orderId, orderNumber)
    },
    {
      label: 'Add Note',
      icon: MessageSquare,
      onClick: () => openAddNoteModal(orderId, orderNumber)
    },
    {
      label: 'Send Update to Customer',
      icon: Mail,
      onClick: () => openCustomerNotifyModal(orderId, orderNumber)
    },
    {
      label: 'Cancel Order',
      icon: X,
      destructive: true,
      onClick: () => {
        if (confirm(`Are you sure you want to cancel order ${orderNumber}?`)) {
          console.log('Cancel order:', orderNumber)
        }
      }
    }
  ]

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeader 
        title="Order Tracking"
        description="Track and manage customer orders"
        actions={
          <div className="flex items-center space-x-2">
            <Button
              onClick={loadOrders}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button className="flex items-center" onClick={() => router.push('/dashboard/orders')}>
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </div>
        }
      />

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="text-amber-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{Array.isArray(orders) ? orders.length : 0}</div>
            <div className="text-sm text-primary">+12% from last month</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {Array.isArray(orders) ? orders.filter(o => o.computed_status === 'processing' || o.status === 'processing').length : 0}
            </div>
            <div className="text-sm text-amber">Needs attention</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <Truck className="w-4 h-4 mr-2" />
              Shipped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {Array.isArray(orders) ? orders.filter(o => o.computed_status === 'shipped' || o.status === 'shipped').length : 0}
            </div>
            <div className="text-sm text-primary">In transit</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {Array.isArray(orders) ? orders.filter(o => o.computed_status === 'delivered' || o.status === 'delivered').length : 0}
            </div>
            <div className="text-sm text-primary">+8% this week</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Search Orders</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-900 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by order #, customer name, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => setAdvancedFiltersOpen(true)}>
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters
                {(advancedFilters.dateRange.start || advancedFilters.customerName || 
                  advancedFilters.minAmount || advancedFilters.maxAmount) && (
                  <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">Active</span>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto overflow-y-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order, index) => (
                  <TableRow key={`${order.id}-${index}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{order.order_number}</div>
                        <div className="text-sm text-slate-900">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{order.customer_name}</div>
                        <div className="text-sm text-slate-900">{order.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.computed_status || order.status)}`}>
                        {getStatusIcon(order.computed_status || order.status)}
                        <span className="ml-1 capitalize">{order.computed_status || order.status}</span>
                      </span>
                      {order.production_stage && order.production_stage !== 'Not Started' && (
                        <div className="text-xs text-slate-900 mt-1">
                          Production: {order.production_stage}
                          {order.production_progress && order.production_progress > 0 && ` (${order.production_progress}%)`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.tracking_number ? (
                        <div>
                          <div className="text-sm font-mono text-primary">{order.tracking_number}</div>
                          {order.carrier_name && (
                            <div className="text-xs text-slate-900">{order.carrier_name}</div>
                          )}
                          {order.shipping_status && (
                            <div className="text-xs text-primary capitalize">{order.shipping_status}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-900">Not assigned</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      ${order.total_amount ? order.total_amount.toFixed(2) : '0.00'}
                    </TableCell>
                    <TableCell>
                      {order.estimated_delivery ? (
                        <div className="flex items-center text-sm text-slate-900">
                          <MapPin className="w-3 h-3 mr-1" />
                          {new Date(order.estimated_delivery).toLocaleDateString()}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-900">TBD</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <DropdownMenu
                          trigger={
                            <Button 
                              variant="outline" 
                              size="sm"
                              title="Order Actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          }
                          items={getOrderActionItems(order.id, order.order_number)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredOrders.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <ShoppingCart className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No orders found</h3>
            <p className="text-slate-900">
              {searchTerm || statusFilter !== 'all' || advancedFilters.dateRange.start
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first order to get started'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Advanced Filters Modal */}
      <Dialog open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Advanced Filters</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdvancedFiltersSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={advancedFilters.dateRange.start}
                    onChange={(e) => setAdvancedFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={advancedFilters.dateRange.end}
                    onChange={(e) => setAdvancedFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input 
                    value={advancedFilters.customerName}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Search customer..."
                  />
                </div>
                <div>
                  <Label>Min Amount</Label>
                  <Input 
                    type="number"
                    value={advancedFilters.minAmount}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Max Amount</Label>
                  <Input 
                    type="number"
                    value={advancedFilters.maxAmount}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                    placeholder="10000.00"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={clearAdvancedFilters}>
                Clear Filters
              </Button>
              <Button type="button" variant="outline" onClick={() => setAdvancedFiltersOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Apply Filters
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={updateStatusOpen} onOpenChange={setUpdateStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div>
              <Label>Order Status</Label>
              <Select 
                value={updateStatusForm.status}
                onValueChange={(value) => setUpdateStatusForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Tracking Number</Label>
              <Input
                value={updateStatusForm.trackingNumber}
                onChange={(e) => setUpdateStatusForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                placeholder="Enter tracking number"
              />
            </div>
            
            <div>
              <Label>Carrier</Label>
              <Input
                value={updateStatusForm.carrier}
                onChange={(e) => setUpdateStatusForm(prev => ({ ...prev, carrier: e.target.value }))}
                placeholder="FedEx, UPS, DHL, etc."
              />
            </div>
            
            <div>
              <Label>Estimated Delivery</Label>
              <Input
                type="datetime-local"
                value={updateStatusForm.estimatedDelivery}
                onChange={(e) => setUpdateStatusForm(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>Notes</Label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                value={updateStatusForm.notes}
                onChange={(e) => setUpdateStatusForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this status update..."
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUpdateStatusOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Order Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddNote} className="space-y-4">
            <div>
              <Label>Note Type</Label>
              <Select 
                value={addNoteForm.noteType}
                onValueChange={(value) => setAddNoteForm(prev => ({ ...prev, noteType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Note</Label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
                value={addNoteForm.note}
                onChange={(e) => setAddNoteForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Enter your note here..."
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="internal-note"
                checked={addNoteForm.isInternal}
                onCheckedChange={(checked) => setAddNoteForm(prev => ({ ...prev, isInternal: checked as boolean }))}
              />
              <Label htmlFor="internal-note">Internal note (not visible to customer)</Label>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddNoteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Notification Modal */}
      <Dialog open={customerNotifyOpen} onOpenChange={setCustomerNotifyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Customer Notification</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCustomerNotification} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Template</Label>
                  <Select 
                    value={notificationForm.template}
                    onValueChange={(value) => setNotificationForm(prev => ({ ...prev, template: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order_update">Order Status Update</SelectItem>
                      <SelectItem value="shipping_update">Shipping Update</SelectItem>
                      <SelectItem value="delivery_confirmation">Delivery Confirmation</SelectItem>
                      <SelectItem value="custom">Custom Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Notification Type</Label>
                  <Select 
                    value={notificationForm.type}
                    onValueChange={(value) => setNotificationForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="both">Both Email & SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {notificationForm.template === 'custom' && (
                <div className="space-y-4">
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={notificationForm.subject}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Subject line for the notification"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Message</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={6}
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter your custom message..."
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-tracking"
                    checked={notificationForm.includeTracking}
                    onCheckedChange={(checked) => setNotificationForm(prev => ({ ...prev, includeTracking: checked as boolean }))}
                  />
                  <Label htmlFor="include-tracking">Include tracking information</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-delivery"
                    checked={notificationForm.includeDeliveryEstimate}
                    onCheckedChange={(checked) => setNotificationForm(prev => ({ ...prev, includeDeliveryEstimate: checked as boolean }))}
                  />
                  <Label htmlFor="include-delivery">Include delivery estimate</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCustomerNotifyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Notification'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}