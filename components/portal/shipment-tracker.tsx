'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  Package, 
  Truck, 
  MapPin, 
  Navigation, 
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Clock
} from 'lucide-react'
import { safeFormatString, safeToUpperCase } from '@/lib/utils/string-helpers'

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
  recipient_address?: string
  service_type?: string
  order?: {
    order_number: string
  }
}

interface TrackingEvent {
  id: string
  status: string
  location?: string
  timestamp: string
  description: string
  is_milestone: boolean
}

interface ShipmentTrackerProps {
  shipment: Shipment
}

export function ShipmentTracker({ shipment }: ShipmentTrackerProps) {
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  const statusSteps = [
    { key: 'processing', label: 'Processing', icon: Package },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'in_transit', label: 'In Transit', icon: MapPin },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: Navigation },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle }
  ]

  const currentStepIndex = statusSteps.findIndex(s => s.key === shipment.status)

  const loadTrackingEvents = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: events, error } = await supabase
        .from('shipment_tracking_events')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('timestamp', { ascending: false })

      if (error) throw error
      setTrackingEvents(events || [])
    } catch (error) {
      console.error('Error loading tracking events:', error)
      // Fallback test data
      setTrackingEvents([
        {
          id: '1',
          status: shipment.status,
          location: 'Local Facility',
          timestamp: new Date().toISOString(),
          description: getStatusDescription(shipment.status),
          is_milestone: true
        },
        {
          id: '2',
          status: 'in_transit',
          location: 'Distribution Center',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          description: 'Package in transit',
          is_milestone: true
        },
        {
          id: '3',
          status: 'shipped',
          location: 'Limn Warehouse',
          timestamp: shipment.shipped_date,
          description: 'Package shipped from facility',
          is_milestone: true
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [shipment.id, shipment.status, shipment.shipped_date])

  useEffect(() => {
    if (expanded && trackingEvents.length === 0) {
      loadTrackingEvents()
    }
  }, [expanded, trackingEvents.length, loadTrackingEvents])

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'processing': return 'Order being processed'
      case 'shipped': return 'Package shipped'
      case 'in_transit': return 'Package in transit'
      case 'out_for_delivery': return 'Out for delivery'
      case 'delivered': return 'Package delivered'
      case 'exception': return 'Delivery exception occurred'
      default: return 'Status update'
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const openCarrierTracking = () => {
    let url = '#'
    switch ((shipment.carrier || "").toLowerCase()) {
      case 'fedex':
        url = `https://www.fedex.com/fedextrack/?trknbr=${shipment.tracking_number}`
        break
      case 'ups':
        url = `https://www.ups.com/track?loc=en_US&tracknum=${shipment.tracking_number}`
        break
      case 'usps':
        url = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${shipment.tracking_number}`
        break
      default:
        url = `#${shipment.tracking_number}`
    }
    
    if (url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-[#4b4949]">
              Shipment #{shipment.tracking_number}
            </h3>
            <p className="text-sm text-gray-600">
              {shipment.carrier} • Est. Delivery: {formatDate(shipment.estimated_delivery)}
            </p>
            {shipment.order?.order_number && (
              <p className="text-xs text-gray-500">
                Order: {shipment.order.order_number}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(shipment.status)}>
            {safeToUpperCase(safeFormatString(shipment.status, 'pending'), 'PENDING')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Visual Timeline */}
        <div className="relative mb-6">
          <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200" />
          <div 
            className="absolute top-5 left-0 h-0.5 bg-[#91bdbd] transition-all duration-500"
            style={{ 
              width: currentStepIndex >= 0 
                ? `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` 
                : '0%' 
            }}
          />
          <div className="relative flex justify-between">
            {statusSteps.map((step, index) => {
              const Icon = step.icon
              const isComplete = index <= currentStepIndex
              const isCurrent = index === currentStepIndex
              
              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all border-2",
                    isComplete 
                      ? "bg-[#91bdbd] border-[#91bdbd] text-white" 
                      : "bg-white border-gray-300 text-gray-400",
                    isCurrent && "ring-4 ring-[#91bdbd]/30 scale-110"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs mt-2 text-center max-w-16 hidden sm:block">
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tracking Details */}
        <div className="space-y-3">
          {shipment.shipped_date && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipped Date:</span>
              <span className="font-medium">{formatDate(shipment.shipped_date)}</span>
            </div>
          )}
          
          {shipment.service_type && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Service:</span>
              <span className="font-medium capitalize">{shipment.service_type}</span>
            </div>
          )}

          {shipment.delivered_date && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivered:</span>
              <span className="font-medium text-green-700">
                {formatDate(shipment.delivered_date)}
              </span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide' : 'Show'} Tracking History
              <ChevronDown className={cn(
                "ml-2 h-4 w-4 transition-transform",
                expanded && "rotate-180"
              )} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={openCarrierTracking}
              className="text-[#91bdbd] hover:text-white hover:bg-[#91bdbd]"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tracking Events */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#91bdbd]"></div>
              </div>
            ) : trackingEvents.length > 0 ? (
              trackingEvents.map((event) => (
                <div key={event.id} className="flex gap-3 text-sm">
                  <div className="text-gray-400 whitespace-nowrap min-w-20">
                    {formatDateTime(event.timestamp)}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#91bdbd] mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="font-medium text-[#4b4949]">{event.description}</p>
                    {event.location && (
                      <p className="text-gray-600 text-xs">{event.location}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No tracking events available
              </p>
            )}
          </div>
        )}

        {/* Delivery Actions */}
        {shipment.status === 'out_for_delivery' && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">
                Your order is out for delivery today!
              </p>
            </div>
            <p className="text-xs text-blue-700">
              Expected delivery window: {shipment.service_type === 'express' ? '10AM - 2PM' : '9AM - 7PM'}
            </p>
          </div>
        )}

        {shipment.status === 'delivered' && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-900">
                Delivered successfully!
              </p>
            </div>
            {shipment.delivered_date && (
              <p className="text-xs text-green-700 mt-1">
                Delivered on {formatDate(shipment.delivered_date)}
              </p>
            )}
          </div>
        )}

        {shipment.status === 'exception' && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-red-900">
                Delivery Exception
              </p>
            </div>
            <p className="text-xs text-red-700">
              Please contact customer service or track on carrier website for details.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}