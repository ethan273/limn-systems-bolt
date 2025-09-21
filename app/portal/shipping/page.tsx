'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PortalGuard from '@/components/portal/portal-guard'
import { ShipmentTracker } from '@/components/portal/shipment-tracker'
import { DeliveryScheduler } from '@/components/portal/delivery-scheduler'
import { 
  Truck, 
  Package, 
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Shipment {
  id: string
  order_id: string
  tracking_number: string
  carrier: string
  status: string
  shipped_date: string
  estimated_delivery: string
  delivered_date?: string
  recipient_name?: string
  service_type?: string
  order?: {
    id: string
    order_number: string
  }
  delivery_schedule?: {
    id: string
    scheduled_date: string
    time_window: string
    special_instructions?: string
    confirmed: boolean
  }
}

interface PortalSettings {
  show_shipping_info: boolean
}

export default function ShippingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([])
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [carrierFilter, setCarrierFilter] = useState('all')

  useEffect(() => {
    loadShippingData()
  }, [])

  const filterShipments = useCallback(() => {
    let filtered = [...shipments]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(shipment => 
        (shipment.tracking_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.order?.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shipment.carrier || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(shipment => shipment.status === statusFilter)
    }

    // Carrier filter
    if (carrierFilter !== 'all') {
      filtered = filtered.filter(shipment => 
        (shipment.carrier || "").toLowerCase() === carrierFilter.toLowerCase()
      )
    }

    setFilteredShipments(filtered)
  }, [shipments, searchTerm, statusFilter, carrierFilter])

  useEffect(() => {
    filterShipments()
  }, [filterShipments])

  const loadShippingData = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return
      
      // Get customer info
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (!customer) return

      // Load portal settings and shipments in parallel
      const [settingsResponse, shipmentsResponse] = await Promise.all([
        supabase
          .from('portal_settings')
          .select('show_shipping_info')
          .eq('customer_id', customer.id)
          .single(),
        supabase
          .from('shipments')
          .select(`
            *,
            order:orders!inner(id, order_number),
            delivery_schedule:delivery_schedules(
              id,
              scheduled_date,
              time_window,
              special_instructions,
              confirmed
            )
          `)
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
      ])

      const settings = settingsResponse.data
      const shipmentsData = shipmentsResponse.data || []

      setPortalSettings(settings)
      setShipments(shipmentsData)

      // Auto-select first active shipment for delivery scheduling
      const activeShipment = shipmentsData.find(s => 
        ['shipped', 'in_transit', 'out_for_delivery'].includes(s.status)
      )
      if (activeShipment) {
        setSelectedShipment(activeShipment)
      }
    } catch (error) {
      console.error('Error loading shipping data:', error)
      
      // Fallback test data
      const testShipments: Shipment[] = [
        {
          id: '1',
          order_id: '17dbfbd5-c94a-4da4-9cce-dfd49b9f6099',
          tracking_number: 'FDX123456789',
          carrier: 'FedEx',
          status: 'in_transit',
          shipped_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          recipient_name: 'John Doe',
          service_type: 'standard',
          order: {
            id: '17dbfbd5-c94a-4da4-9cce-dfd49b9f6099',
            order_number: 'ORD-2024-001'
          }
        },
        {
          id: '2',
          order_id: '2',
          tracking_number: 'UPS987654321',
          carrier: 'UPS',
          status: 'out_for_delivery',
          shipped_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date().toISOString(),
          recipient_name: 'Jane Smith',
          service_type: 'express',
          order: {
            id: '2',
            order_number: 'ORD-2024-002'
          },
          delivery_schedule: {
            id: '1',
            scheduled_date: new Date().toISOString().split('T')[0],
            time_window: 'morning',
            special_instructions: 'Leave at front door if not home',
            confirmed: true
          }
        },
        {
          id: '3',
          order_id: '3',
          tracking_number: 'USPS456789123',
          carrier: 'USPS',
          status: 'delivered',
          shipped_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          delivered_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          recipient_name: 'Bob Johnson',
          service_type: 'standard',
          order: {
            id: '3',
            order_number: 'ORD-2024-003'
          }
        }
      ]
      
      setShipments(testShipments)
      setSelectedShipment(testShipments[0])
      setPortalSettings({ show_shipping_info: true })
    } finally {
      setLoading(false)
    }
  }


  const handleScheduleDelivery = async (schedule: {
    date: Date | null
    timeWindow: string
    instructions: string
  }) => {
    console.log('Delivery scheduled:', schedule)
    // Reload data to get updated schedules
    await loadShippingData()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
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

  const activeShipments = filteredShipments.filter(s => s.status !== 'delivered')
  const recentDeliveries = filteredShipments.filter(s => s.status === 'delivered').slice(0, 5)
  const uniqueCarriers = [...new Set(shipments.map(s => s.carrier))]

  if (loading) {
    return (
      <PortalGuard>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-lg border">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-lg border">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PortalGuard>
    )
  }

  return (
    <PortalGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#4b4949] mb-2">Shipping & Delivery</h1>
          <p className="text-gray-600">Track your shipments and manage deliveries</p>
        </div>

        {!portalSettings?.show_shipping_info ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Shipping Information Unavailable
              </h2>
              <p className="text-gray-500 mb-6">
                Shipping tracking is not enabled for your account. Contact support to enable this feature.
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'mailto:support@limnsystems.com'}
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by tracking number, order number, or carrier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="exception">Exception</SelectItem>
                </SelectContent>
              </Select>
              {uniqueCarriers.length > 1 && (
                <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Carriers</SelectItem>
                    {uniqueCarriers.map(carrier => (
                      <SelectItem key={carrier} value={carrier.toLowerCase()}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Active Shipments */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[#4b4949]">Active Shipments</h2>
                  {activeShipments.length > 0 && (
                    <Badge variant="secondary">{activeShipments.length}</Badge>
                  )}
                </div>
                
                {activeShipments.length > 0 ? (
                  <div className="space-y-4">
                    {activeShipments.map(shipment => (
                      <div
                        key={shipment.id}
                        className={`cursor-pointer transition-all ${
                          selectedShipment?.id === shipment.id 
                            ? 'ring-2 ring-[#91bdbd]' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedShipment(shipment)}
                      >
                        <ShipmentTracker shipment={shipment} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">No Active Shipments</h3>
                      <p className="text-gray-500">
                        {filteredShipments.length === 0 
                          ? 'You have no shipments matching your search criteria.'
                          : 'All your shipments have been delivered.'}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Deliveries */}
                {recentDeliveries.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-xl font-semibold text-[#4b4949] mb-4">Recent Deliveries</h2>
                    <Card>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {recentDeliveries.map(shipment => (
                            <div key={shipment.id} className="p-4 hover:bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <Package className="w-5 h-5 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {shipment.tracking_number}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {shipment.order?.order_number} • {shipment.carrier}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge className={getStatusColor(shipment.status)}>
                                    Delivered
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {shipment.delivered_date && formatDate(shipment.delivered_date)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Delivery Schedule Sidebar */}
              <div>
                <DeliveryScheduler
                  shipment={selectedShipment}
                  onSchedule={handleScheduleDelivery}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </PortalGuard>
  )
}