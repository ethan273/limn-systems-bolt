'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Send
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface Order {
  id: string
  order_number: string
  customer_id?: string
  status: string
  payment_status: string
  category: string
  po_number?: string
  total_amount: number
  order_date: string
  estimated_delivery_date?: string
  actual_delivery_date?: string
  created_at: string
  updated_at: string
  project?: {
    id: string
    name: string
    client_name: string
  }
  customer?: {
    id: string
    name: string
    email: string
    company?: string
  }
  order_items?: Array<{
    id: string
    item_id: string
    quantity: number
    unit_price: number
    total_price: number
    specifications?: Record<string, unknown>
    lead_time_days?: number
    item?: {
      id: string
      name: string
      sku: string
      base_price: number
      category?: string
    }
  }>
}

interface Item {
  id: string
  name: string
  sku_base: string
  base_price: number
  category?: string
  lead_time_days?: number
}

interface LineItemFormData {
  item_id: string
  quantity: string
  unit_price: string
  specifications: string
  fabric?: string
  finish?: string
  lead_time_days: string
}

interface OrderDetailsViewProps {
  selectedOrder: Order
  backToList: () => void
  setShowLineItemForm: (show: boolean) => void
  showLineItemForm: boolean
  lineItemFormData: LineItemFormData
  setLineItemFormData: (data: Partial<LineItemFormData>) => void
  items: Item[]
  editLineItemFormData?: LineItemFormData
  setEditLineItemFormData?: (data: Partial<LineItemFormData>) => void
  editingLineItem?: { id: string; quantity: number; unit_price: number }
  setEditingLineItem?: (item: { id: string; quantity: number; unit_price: number }) => void
  actionLoading: string | null
  addLineItem: () => void
  updateLineItem: () => void
  removeLineItem: (itemId: string) => void
  updateOrderStatus: (orderId: string, newStatus: string) => void
  duplicateOrder: (orderId: string) => void
  showNotificationDialog: boolean
  setShowNotificationDialog: (show: boolean) => void
  notificationOrder?: Order
  notificationMessage: string
  setNotificationMessage: (message: string) => void
  sendNotification: () => void
}

// Helper functions
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

const getStatusColor = (status: string) => {
  const colors = {
    draft: 'bg-slate-100 text-slate-800',
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_production: 'bg-purple-100 text-purple-800',
    shipped: 'bg-green-100 text-green-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

const getPaymentStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

const getCategoryColor = (category: string) => {
  const colors = {
    furniture: 'bg-blue-100 text-blue-800',
    lighting: 'bg-yellow-100 text-yellow-800',
    textiles: 'bg-green-100 text-green-800',
    accessories: 'bg-purple-100 text-purple-800',
    custom: 'bg-red-100 text-red-800'
  }
  return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({
  selectedOrder,
  backToList,
  setShowLineItemForm,
  showLineItemForm,
  lineItemFormData,
  setLineItemFormData,
  items,
  setEditLineItemFormData,
  editingLineItem,
  setEditingLineItem,
  actionLoading,
  addLineItem,
  updateLineItem,
  removeLineItem,
  updateOrderStatus,
  duplicateOrder,
  showNotificationDialog,
  setShowNotificationDialog,
  notificationOrder,
  notificationMessage,
  setNotificationMessage,
  sendNotification
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={backToList} variant="outline">
            ← Back to Orders
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-heading">{selectedOrder.order_number}</h1>
            <p className="text-slate-600 mt-1">
              {selectedOrder.project?.name} - {selectedOrder.project?.client_name}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={() => setShowLineItemForm(true)}
            disabled={selectedOrder.status === 'delivered'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button 
            variant="outline" 
            onClick={() => duplicateOrder(selectedOrder.id)}
            disabled={actionLoading === 'duplicate'}
          >
            <Download className="h-4 w-4 mr-2" />
            {actionLoading === 'duplicate' ? 'Duplicating...' : 'Duplicate'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowNotificationDialog(true)}
          >
            <Send className="h-4 w-4 mr-2" />
            Notify Customer
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
              {safeFormatString(selectedOrder.status, 'unknown')}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-heading">
              {formatCurrency(selectedOrder.total_amount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
              {safeFormatString(selectedOrder.payment_status, 'unknown')}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Delivery Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {selectedOrder.actual_delivery_date 
                ? formatDate(selectedOrder.actual_delivery_date)
                : selectedOrder.estimated_delivery_date 
                  ? `Est: ${formatDate(selectedOrder.estimated_delivery_date)}`
                  : 'TBD'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Category</label>
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ml-2 ${getCategoryColor(selectedOrder.category)}`}>
                  {safeFormatString(selectedOrder.category, 'unknown')}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">PO Number</label>
                <p className="text-heading">{selectedOrder.po_number || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Created Date</label>
                <p className="text-heading">{formatDate(selectedOrder.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Last Updated</label>
                <p className="text-heading">{formatDate(selectedOrder.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Customer</label>
              <p className="text-heading">{selectedOrder.customer?.name || '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Email</label>
              <p className="text-heading">{selectedOrder.customer?.email || '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Company</label>
              <p className="text-heading">{selectedOrder.customer?.company || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Item</th>
                  <th className="text-left py-2">SKU</th>
                  <th className="text-left py-2">Quantity</th>
                  <th className="text-left py-2">Unit Price</th>
                  <th className="text-left py-2">Total</th>
                  <th className="text-left py-2">Lead Time</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.order_items?.map((lineItem) => (
                  <tr key={lineItem.id} className="border-b">
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{lineItem.item?.name || 'Unknown Item'}</p>
                        {lineItem.specifications && (
                          <p className="text-sm text-slate-600">{JSON.stringify(lineItem.specifications)}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {lineItem.item?.sku || '—'}
                      </code>
                    </td>
                    <td className="py-3">{lineItem.quantity}</td>
                    <td className="py-3">{formatCurrency(lineItem.unit_price)}</td>
                    <td className="py-3 font-medium">{formatCurrency(lineItem.total_price)}</td>
                    <td className="py-3">{lineItem.lead_time_days || '—'} days</td>
                    <td className="py-3">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingLineItem?.(lineItem)
                            setEditLineItemFormData?.({
                              item_id: lineItem.item_id,
                              quantity: lineItem.quantity.toString(),
                              unit_price: lineItem.unit_price.toString(),
                              specifications: typeof lineItem.specifications === 'string' ? lineItem.specifications : JSON.stringify(lineItem.specifications || {}),
                              lead_time_days: lineItem.lead_time_days?.toString() || '30'
                            })
                            setShowLineItemForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLineItem(lineItem.id)}
                          disabled={actionLoading === 'removeLineItem'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!selectedOrder.order_items?.length && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      No items in this order yet. Click &quot;Add Item&quot; to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Status Update Section */}
      <Card>
        <CardHeader>
          <CardTitle>Update Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 items-center">
            <Select 
              defaultValue={selectedOrder.status}
              onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-slate-600">
              Current status: <span className="font-medium">{safeFormatString(selectedOrder.status, 'unknown')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Item Form Dialog */}
      <Dialog open={showLineItemForm} onOpenChange={setShowLineItemForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLineItem ? 'Edit Line Item' : 'Add Line Item'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item">Item</Label>
                <Select 
                  value={lineItemFormData.item_id} 
                  onValueChange={(value) => setLineItemFormData({ item_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.sku_base})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={lineItemFormData.quantity}
                  onChange={(e) => setLineItemFormData({ quantity: e.target.value })}
                  min="1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={lineItemFormData.unit_price}
                  onChange={(e) => setLineItemFormData({ unit_price: e.target.value })}
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lead_time">Lead Time (days)</Label>
                <Input
                  id="lead_time"
                  type="number"
                  value={lineItemFormData.lead_time_days}
                  onChange={(e) => setLineItemFormData({ lead_time_days: e.target.value })}
                  min="1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea
                id="specifications"
                value={lineItemFormData.specifications}
                onChange={(e) => setLineItemFormData({ specifications: e.target.value })}
                placeholder="Enter item specifications, fabric, finish, etc."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLineItemForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={editingLineItem ? updateLineItem : addLineItem}
              disabled={!lineItemFormData.item_id || !lineItemFormData.quantity || actionLoading === 'addLineItem'}
            >
              {actionLoading === 'addLineItem' ? 'Adding...' : editingLineItem ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Notification Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Notify Customer - Order #{notificationOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right">
                Message
              </Label>
              <Textarea
                id="message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter notification message for customer..."
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={sendNotification}
              disabled={!notificationMessage.trim() || actionLoading === 'notification'}
            >
              {actionLoading === 'notification' ? 'Sending...' : 'Send Notification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default React.memo(OrderDetailsView)