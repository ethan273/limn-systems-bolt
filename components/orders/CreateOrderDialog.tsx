'use client'

import React, { memo, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateOrder: (orderData: unknown) => Promise<void>
  customers?: Array<{ id: string; name: string }>
}

const CreateOrderDialog = memo<CreateOrderDialogProps>(({
  open,
  onOpenChange,
  onCreateOrder,
  customers = []
}) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    order_type: 'standard',
    rush_order: false,
    notes: '',
    delivery_date: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!formData.customer_id) return

    setIsSubmitting(true)
    try {
      await onCreateOrder({
        ...formData,
        order_date: new Date().toISOString(),
        status: 'draft',
        total_amount: 0 // Will be calculated based on line items
      })

      // Reset form
      setFormData({
        customer_id: '',
        order_type: 'standard',
        rush_order: false,
        notes: '',
        delivery_date: ''
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create order:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onCreateOrder, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer" className="text-right">
              Customer
            </Label>
            <div className="col-span-3">
              <Select
                value={formData.customer_id}
                onValueChange={(value) => handleInputChange('customer_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="order_type" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <Select
                value={formData.order_type}
                onValueChange={(value) => handleInputChange('order_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="prototype">Prototype</SelectItem>
                  <SelectItem value="rush">Rush</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="delivery_date" className="text-right">
              Delivery Date
            </Label>
            <Input
              id="delivery_date"
              type="date"
              className="col-span-3"
              value={formData.delivery_date}
              onChange={(e) => handleInputChange('delivery_date', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              className="col-span-3"
              placeholder="Order notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!formData.customer_id || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

CreateOrderDialog.displayName = 'CreateOrderDialog'

export default CreateOrderDialog