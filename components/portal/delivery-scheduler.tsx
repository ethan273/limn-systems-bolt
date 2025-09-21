'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Truck,
  AlertTriangle
} from 'lucide-react'
import { addDays } from 'date-fns'

interface Shipment {
  id: string
  tracking_number: string
  carrier: string
  status: string
  estimated_delivery: string
  order?: {
    order_number: string
  }
  delivery_schedule?: DeliverySchedule
}

interface DeliverySchedule {
  id?: string
  scheduled_date: string
  time_window: string
  special_instructions?: string
  confirmed: boolean
}

interface DeliverySchedulerProps {
  shipment: Shipment | null
  onSchedule: (schedule: {
    date: Date | null
    timeWindow: string
    instructions: string
  }) => void
}

export function DeliveryScheduler({ shipment, onSchedule }: DeliverySchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [timeWindow, setTimeWindow] = useState('')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)

  const timeWindows = [
    { value: 'morning', label: '8:00 AM - 12:00 PM', description: 'Morning' },
    { value: 'afternoon', label: '12:00 PM - 4:00 PM', description: 'Afternoon' },
    { value: 'evening', label: '4:00 PM - 8:00 PM', description: 'Evening' }
  ]

  const handleScheduleDelivery = async () => {
    if (!shipment || !selectedDate || !timeWindow) return

    setLoading(true)
    try {
      const supabase = createClient()
      
      // Check if schedule already exists
      if (shipment.delivery_schedule?.id) {
        // Update existing schedule
        const { error } = await supabase
          .from('delivery_schedules')
          .update({
            scheduled_date: selectedDate.toISOString().split('T')[0],
            time_window: timeWindow,
            special_instructions: instructions || null,
            confirmed: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', shipment.delivery_schedule.id)

        if (error) throw error
      } else {
        // Create new schedule
        const { error } = await supabase
          .from('delivery_schedules')
          .insert({
            shipment_id: shipment.id,
            scheduled_date: selectedDate.toISOString().split('T')[0],
            time_window: timeWindow,
            special_instructions: instructions || null,
            confirmed: false
          })

        if (error) throw error
      }

      // Call parent callback
      onSchedule({
        date: selectedDate,
        timeWindow,
        instructions
      })

      // Reset form
      setSelectedDate(null)
      setTimeWindow('')
      setInstructions('')
    } catch (error) {
      console.error('Error scheduling delivery:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTimeWindowLabel = (window: string) => {
    const timeWindow = timeWindows.find(tw => tw.value === window)
    return timeWindow?.label || window
  }

  const isDateDisabled = (date: Date) => {
    if (!shipment) return true
    
    const today = new Date()
    const estimatedDelivery = new Date(shipment.estimated_delivery)
    const maxDate = addDays(estimatedDelivery, 7)
    
    // Disable past dates and dates too far in the future
    return date < today || date > maxDate
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-[#91bdbd]" />
          <h3 className="font-semibold text-[#4b4949]">Schedule Delivery</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {shipment ? (
          <>
            {/* Current Schedule Display */}
            {shipment.delivery_schedule && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Current Schedule</span>
                  <Badge variant={shipment.delivery_schedule.confirmed ? 'default' : 'secondary'}>
                    {shipment.delivery_schedule.confirmed ? 'Confirmed' : 'Pending'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>{formatDate(shipment.delivery_schedule.scheduled_date)}</p>
                  <p>{getTimeWindowLabel(shipment.delivery_schedule.time_window)}</p>
                  {shipment.delivery_schedule.special_instructions && (
                    <p className="mt-1 text-xs">Note: {shipment.delivery_schedule.special_instructions}</p>
                  )}
                </div>
              </div>
            )}

            {/* Shipment Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {shipment.tracking_number}
                </span>
              </div>
              <p className="text-xs text-blue-700">
                Est. Delivery: {formatDate(shipment.estimated_delivery)}
              </p>
              {shipment.order?.order_number && (
                <p className="text-xs text-blue-600">
                  Order: {shipment.order.order_number}
                </p>
              )}
            </div>

            {/* Only allow scheduling for eligible statuses */}
            {['shipped', 'in_transit', 'out_for_delivery'].includes(shipment.status) ? (
              <>
                <div>
                  <Label>Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={(date) => setSelectedDate((date instanceof Date ? date : null) || null)}
                    disabled={isDateDisabled}
                    className="rounded-md border w-full"
                  />
                </div>

                <div>
                  <Label>Time Window</Label>
                  <Select value={timeWindow} onValueChange={setTimeWindow}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time window" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeWindows.map(tw => (
                        <SelectItem key={tw.value} value={tw.value}>
                          <div>
                            <div className="font-medium">{tw.description}</div>
                            <div className="text-sm text-gray-500">{tw.label}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Special Instructions</Label>
                  <Textarea
                    placeholder="Gate code, preferred location, contact info, etc."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Button
                  className="w-full bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
                  onClick={handleScheduleDelivery}
                  disabled={!selectedDate || !timeWindow || loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scheduling...
                    </div>
                  ) : (
                    <>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {shipment.delivery_schedule ? 'Update Schedule' : 'Schedule Delivery'}
                    </>
                  )}
                </Button>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Delivery schedules are subject to carrier availability</p>
                  <p>• You will receive confirmation once the schedule is processed</p>
                  <p>• Changes can be made up to 24 hours before scheduled delivery</p>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                {shipment.status === 'delivered' ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="font-medium text-green-900">Package Delivered</p>
                    <p className="text-sm text-green-700">This shipment has been successfully delivered</p>
                  </div>
                ) : shipment.status === 'processing' ? (
                  <div className="space-y-2">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="font-medium text-gray-600">Processing</p>
                    <p className="text-sm text-gray-500">Delivery scheduling will be available once the package ships</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
                    <p className="font-medium text-yellow-800">Not Available</p>
                    <p className="text-sm text-yellow-600">Delivery scheduling is not available for this shipment status</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Select a shipment to schedule delivery</p>
            <p className="text-xs text-gray-500 mt-1">Choose from active shipments above</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}