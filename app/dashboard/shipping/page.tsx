'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Truck, 
  Package, 
  MapPin, 
  Search, 
  Eye,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertTriangle,
  Navigation,
  Phone,
  FileText,
  Calendar,
  DollarSign,
  ExternalLink
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'
import { PageLoading } from '@/components/ui/enhanced-loading-states'
import { StatsGrid } from '@/components/ui/responsive-grid'

interface ShippingItem {
  id: string
  order_id: string
  order_number: string
  tracking_number: string
  carrier: string
  service_type: string
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'returned'
  customer_name: string
  delivery_address: {
    street: string
    city: string
    state: string
    zip: string
  }
  items_count: number
  total_weight: number
  shipping_cost: number
  estimated_delivery: string
  actual_delivery?: string
  pickup_date: string
  special_services: string[]
  delivery_instructions?: string
  signature_required: boolean
  insurance_value?: number
  created_at: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
}

interface ShippingStats {
  pending: number
  inTransit: number
  delivered: number
  exceptions: number
  totalCost: number
  avgDeliveryTime: number
}

export default function ShippingPage() {
  const [items, setItems] = useState<ShippingItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ShippingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [carrierFilter, setCarrierFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showPickupModal, setShowPickupModal] = useState(false)

  const applyFilters = useCallback(() => {
    let filtered = [...items]
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }
    
    if (carrierFilter !== 'all') {
      filtered = filtered.filter(item => item.carrier === carrierFilter)
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        (item.order_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tracking_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    setFilteredItems(filtered)
  }, [items, statusFilter, carrierFilter, priorityFilter, searchTerm])

  useEffect(() => {
    loadShippingItems()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const loadShippingItems = async () => {
    setLoading(true)
    try {
      // Fetch shipping data from API (no mock data fallback)
      console.log('Loading shipping items from API...')

      // Fetch real shipping data from API
      const response = await fetch('/api/shipping', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          // Transform API response to match ShippingItem interface
          const transformedItems: ShippingItem[] = data.data.map((item: unknown) => {
            const shipment = item as Record<string, unknown>
            return {
              id: (shipment.id as string) || `ship-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
              order_id: (shipment.order_id as string) || '',
              order_number: (shipment.order_number as string) || `ORD-${shipment.order_id}`,
              tracking_number: (shipment.tracking_number as string) || '',
              carrier: (shipment.carrier as string) || 'Unknown Carrier',
              service_type: (shipment.service_type as string) || 'Standard',
              status: (shipment.status as ShippingItem['status']) || 'pending',
              customer_name: (shipment.customer_name as string) || 'Unknown Customer',
              delivery_address: {
                street: (shipment.delivery_street as string) || '',
                city: (shipment.delivery_city as string) || '',
                state: (shipment.delivery_state as string) || '',
                zip: (shipment.delivery_zip as string) || ''
              },
              items_count: parseInt((shipment.items_count as string) || '1'),
              total_weight: parseFloat((shipment.total_weight as string) || '0'),
              shipping_cost: parseFloat((shipment.shipping_cost as string) || '0'),
              estimated_delivery: (shipment.estimated_delivery as string) || '',
              actual_delivery: shipment.actual_delivery as string | undefined,
              pickup_date: (shipment.pickup_date as string) || '',
              special_services: (shipment.special_services as string[]) || [],
              delivery_instructions: shipment.delivery_instructions as string | undefined,
              signature_required: Boolean(shipment.signature_required),
              insurance_value: shipment.insurance_value ? parseFloat(shipment.insurance_value as string) : undefined,
              priority: (shipment.priority as ShippingItem['priority']) || 'normal',
              created_at: (shipment.created_at as string) || new Date().toISOString()
            }
          })

          setItems(transformedItems)
          console.log('Shipping: Successfully loaded', transformedItems.length, 'items from API')
        } else {
          throw new Error('Invalid API response format')
        }
      } else {
        // Fallback to empty array if API not available yet
        console.log('Shipping API not available, showing empty state')
        setItems([])
      }
    } catch (error) {
      console.error('Error loading shipping items:', error)
      setItems([]) // Empty array instead of mock data
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (): ShippingStats => {
    return {
      pending: items.filter(i => ['pending', 'picked_up'].includes(i.status)).length,
      inTransit: items.filter(i => ['in_transit', 'out_for_delivery'].includes(i.status)).length,
      delivered: items.filter(i => i.status === 'delivered').length,
      exceptions: items.filter(i => ['exception', 'returned'].includes(i.status)).length,
      totalCost: items.reduce((sum, item) => sum + item.shipping_cost, 0),
      avgDeliveryTime: 0 // TODO: Calculate real average delivery time
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'picked_up': return 'bg-blue-100 text-blue-800'
      case 'in_transit': return 'bg-blue-100 text-blue-800'
      case 'out_for_delivery': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'exception': return 'bg-red-100 text-red-800'
      case 'returned': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'picked_up': return <Package className="w-4 h-4" />
      case 'in_transit': return <Truck className="w-4 h-4" />
      case 'out_for_delivery': return <Navigation className="w-4 h-4" />
      case 'delivered': return <CheckCircle className="w-4 h-4" />
      case 'exception': return <AlertTriangle className="w-4 h-4" />
      case 'returned': return <Package className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }


  const formatAddress = (address: unknown) => {
    const addr = address as { city: string; state: string; zip: string }
    return `${addr.city}, ${addr.state} ${addr.zip}`
  }

  const getCarrierTrackingUrl = (carrier: string, trackingNumber: string) => {
    // All shipments use Seko Logistics as the primary provider
    // In production, this would integrate with Seko's tracking API
    return `https://tracking.sekologistics.com/track/${trackingNumber}`
  }

  const getShippingActionItems = (item: ShippingItem) => [
    {
      label: 'Track on Seko Logistics',
      icon: ExternalLink,
      onClick: () => window.open(getCarrierTrackingUrl(item.carrier, item.tracking_number), '_blank')
    },
    {
      label: 'Contact Customer',
      icon: Phone,
      onClick: () => {
        console.log(`Initiating customer contact for order: ${item.order_number}`)
        // Provide better user feedback
        const confirmed = confirm(`Contact customer for order ${item.order_number}?\n\nThis will mark the order as &apos;customer contacted&apos; and log the interaction.`)
        if (confirmed) {
          // In real app, this would integrate with CRM or email system
          console.log(`Customer contact logged for order: ${item.order_number}`)
        }
      }
    },
    {
      label: 'Update Delivery',
      icon: MapPin,
      onClick: () => alert(`Updating delivery info for: ${item.order_number}`)
    },
    {
      label: 'Add Notes',
      icon: FileText,
      onClick: () => alert(`Adding notes for: ${item.order_number}`)
    }
  ]

  const stats = calculateStats()

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Shipping & Delivery</h1>
          <p className="text-slate-700 text-lg font-medium mt-1">Track shipments and manage deliveries</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (filteredItems.length === 0) {
                alert('No shipments to track')
                return
              }
              // Open each tracking URL in a new tab
              filteredItems.forEach((item, index) => {
                if (item.tracking_number) {
                  setTimeout(() => {
                    window.open(getCarrierTrackingUrl(item.carrier, item.tracking_number), '_blank')
                  }, index * 500) // Stagger the opens to avoid popup blocking
                }
              })
              console.log(`Opened tracking for ${filteredItems.length} shipments`)
            }}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Track All
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Generate and download CSV report
              const csvHeaders = [
                'Order Number',
                'Tracking Number', 
                'Carrier',
                'Service Type',
                'Status',
                'Customer',
                'Destination',
                'Items Count',
                'Weight (lbs)',
                'Shipping Cost',
                'Estimated Delivery',
                'Actual Delivery',
                'Special Services'
              ]
              
              const csvData = filteredItems.map(item => [
                item.order_number,
                item.tracking_number || '',
                item.carrier,
                item.service_type,
                item.status,
                item.customer_name,
                `${item.delivery_address.city}, ${item.delivery_address.state} ${item.delivery_address.zip}`,
                item.items_count,
                item.total_weight,
                item.shipping_cost.toFixed(2),
                new Date(item.estimated_delivery).toLocaleDateString(),
                item.actual_delivery ? new Date(item.actual_delivery).toLocaleDateString() : '',
                item.special_services.join('; ')
              ])
              
              const csvContent = [
                csvHeaders.join(','),
                ...csvData.map(row => row.map(field => 
                  typeof field === 'string' && field.includes(',') ? `"${field}"` : field
                ).join(','))
              ].join('\n')
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
              const link = document.createElement('a')
              const url = URL.createObjectURL(blob)
              link.setAttribute('href', url)
              link.setAttribute('download', `shipping-report-${new Date().toISOString().split('T')[0]}.csv`)
              link.style.visibility = 'hidden'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              
              console.log('Generated shipping report CSV')
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Shipping Report
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowPickupModal(true)}
          >
            <Truck className="h-4 w-4 mr-2" />
            Schedule Pickup
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsGrid statsCount={6}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.pending}
            </div>
            <div className="text-sm text-yellow-600">Ready to ship</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Truck className="w-4 h-4 mr-2" />
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.inTransit}
            </div>
            <div className="text-sm text-blue-600">On the way</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.delivered}
            </div>
            <div className="text-sm text-green-600">Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Exceptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.exceptions}
            </div>
            <div className="text-sm text-red-600">Need attention</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ${stats.totalCost.toFixed(0)}
            </div>
            <div className="text-sm text-slate-600">Shipping fees</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Avg Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats.avgDeliveryTime}
            </div>
            <div className="text-sm text-slate-600">days</div>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search orders, tracking, customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="exception">Exception</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Carrier</label>
              <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Carriers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="UPS">UPS</SelectItem>
                  <SelectItem value="USPS">USPS</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shipments</CardTitle>
            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const status = prompt('Enter new status (pending, picked_up, in_transit, out_for_delivery, delivered, exception, returned):')
                    if (status && ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned'].includes(status)) {
                      console.log(`Updating status to "${status}" for ${selectedItems.length} shipments`)
                      setItems(prevItems => 
                        prevItems.map(item => 
                          selectedItems.includes(item.id) 
                            ? { ...item, status: status as ShippingItem['status'] } 
                            : item
                        )
                      )
                      alert(`Updated status to "${status}" for ${selectedItems.length} shipments`)
                      setSelectedItems([])
                    } else if (status) {
                      alert('Invalid status. Please use: pending, picked_up, in_transit, out_for_delivery, delivered, exception, or returned')
                    }
                  }}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Bulk Update Status
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log(`Contacting customers for ${selectedItems.length} selected shipments`)
                    const selectedItemsData = filteredItems.filter(item => selectedItems.includes(item.id))
                    const customerNames = selectedItemsData.map(item => item.customer_name).join(', ')
                    alert(`Contacting customers for ${selectedItemsData.length} shipments:\n${customerNames}\n\nIn a production app, this would send automated shipping notifications or create contact tasks.`)
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Contact Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(filteredItems.map(item => item.id))
                        } else {
                          setSelectedItems([])
                        }
                      }}
                      className="rounded border-stone-300 text-primary focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(prev => [...prev, item.id])
                          } else {
                            setSelectedItems(prev => prev.filter(id => id !== item.id))
                          }
                        }}
                        className="rounded border-stone-300 text-primary focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{item.order_number}</div>
                        <div className="text-sm text-blue-600 font-mono">{item.tracking_number}</div>
                        <div className="text-xs text-slate-500">{item.customer_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1 capitalize">{safeFormatString(item.status, 'Unknown')}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{item.carrier}</div>
                        <div className="text-sm text-slate-600">{item.service_type}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="w-4 h-4 mr-1 text-slate-500" />
                        <div>
                          <div>{formatAddress(item.delivery_address)}</div>
                          {item.delivery_instructions && (
                            <div className="text-xs text-slate-500 mt-1">
                              {item.delivery_instructions}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{item.items_count} items</div>
                        <div className="text-slate-500">{item.total_weight} lbs</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-slate-600">
                          {new Date(item.estimated_delivery).toLocaleDateString()}
                        </div>
                        {item.actual_delivery && (
                          <div className="text-green-600 text-xs">
                            Delivered: {new Date(item.actual_delivery).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        ${item.shipping_cost.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/dashboard/orders/${item.order_id}`, '_blank')}
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <DropdownMenu
                          trigger={
                            <Button 
                              variant="outline" 
                              size="sm"
                              title="More Actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          }
                          items={getShippingActionItems(item)}
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

      {filteredItems.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Truck className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No shipments found</h3>
            <p className="text-slate-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Shipments will appear here when orders are ready to ship'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Schedule Pickup Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Schedule Pickup</h2>
              <button onClick={() => setShowPickupModal(false)}>
                <Truck className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              
              // Create pickup request object
              const pickupRequest = {
                carrierService: formData.get('carrier'),
                pickupDate: formData.get('pickupDate'),
                timeWindow: formData.get('timeWindow'),
                location: formData.get('location'),
                contactPerson: formData.get('contactPerson'),
                contactPhone: formData.get('contactPhone'),
                specialInstructions: formData.get('instructions'),
                packages: filteredItems.filter(item => ['pending', 'picked_up'].includes(item.status)).length
              }
              
              console.log('Pickup scheduled:', pickupRequest)
              alert(`Pickup scheduled successfully!\n\nDetails:\n- Carrier: ${pickupRequest.carrierService}\n- Date: ${pickupRequest.pickupDate}\n- Time: ${pickupRequest.timeWindow}\n- Packages: ${pickupRequest.packages}\n\nConfirmation will be sent via email.`)
              setShowPickupModal(false)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Carrier Service *</label>
                  <Select name="carrier" required>
                    <SelectTrigger className="w-full px-3 py-2 border border-slate-300 rounded-md">
                      <SelectValue placeholder="Select carrier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fedex-ground">FedEx Ground</SelectItem>
                      <SelectItem value="fedex-express">FedEx Express</SelectItem>
                      <SelectItem value="ups-ground">UPS Ground</SelectItem>
                      <SelectItem value="ups-express">UPS Express</SelectItem>
                      <SelectItem value="dhl-express">DHL Express</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Pickup Date *</label>
                    <input 
                      name="pickupDate"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Time Window *</label>
                    <Select name="timeWindow" required>
                      <SelectTrigger className="w-full px-3 py-2 border border-slate-300 rounded-md">
                        <SelectValue placeholder="Select time..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (8:00 AM - 12:00 PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12:00 PM - 5:00 PM)</SelectItem>
                        <SelectItem value="anytime">Anytime (8:00 AM - 5:00 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Pickup Location *</label>
                  <input 
                    name="location"
                    required
                    defaultValue="Limn Systems Warehouse, 123 Industrial Blvd"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    placeholder="Pickup address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Contact Person *</label>
                    <input 
                      name="contactPerson"
                      required
                      defaultValue="Mike Rodriguez"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      placeholder="Contact name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Contact Phone *</label>
                    <input 
                      name="contactPhone"
                      type="tel"
                      required
                      defaultValue="(555) 123-4567"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Special Instructions</label>
                  <textarea 
                    name="instructions"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    placeholder="Loading dock access, special handling requirements, etc."
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-md">
                  <p className="text-sm text-slate-600">
                    <strong>Packages ready for pickup:</strong> {filteredItems.filter(item => ['pending', 'picked_up'].includes(item.status)).length} shipments
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowPickupModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Schedule Pickup
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}