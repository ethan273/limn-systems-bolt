'use client'

import React, { memo, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface Order {
  id: string
  order_number: string
  customer_name: string
  status: 'draft' | 'confirmed' | 'in_production' | 'shipped' | 'delivered'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  total_amount: number
  due_date: string
  created_at: string
}

interface OrdersTableProps {
  orders: Order[]
  onViewOrder: (order: Order) => void
  onEditOrder: (order: Order) => void
  actionLoading?: string | null
}

const OrdersTable = memo<OrdersTableProps>(({ orders, onViewOrder, onEditOrder, actionLoading }) => {
  // Memoize color functions to prevent recreating on every render
  const getStatusColor = useCallback((status: Order['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_production: 'bg-yellow-100 text-yellow-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }, [])

  const getPriorityColor = useCallback((priority: Order['priority']) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }, [])

  // Memoize processed orders data to prevent recalculation
  const processedOrders = useMemo(() => {
    return orders.map(order => ({
      ...order,
      formattedAmount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(order.total_amount),
      formattedDueDate: new Date(order.due_date).toLocaleDateString(),
      formattedCreatedAt: new Date(order.created_at).toLocaleDateString()
    }))
  }, [orders])

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No orders found matching your filters.</p>
        <p className="text-sm mt-1">Try adjusting your filter criteria or create a new order.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.order_number}
              </TableCell>
              <TableCell>{order.customer_name}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.status)} variant="secondary">
                  {safeFormatString(order.status, 'unknown').toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getPriorityColor(order.priority)} variant="secondary">
                  {(order.priority || "").toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>{order.formattedAmount}</TableCell>
              <TableCell>
                {order.due_date ? order.formattedDueDate : 'Not set'}
              </TableCell>
              <TableCell>
                {order.formattedCreatedAt}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewOrder(order)}
                    disabled={actionLoading === order.id}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditOrder(order)}
                    disabled={actionLoading === order.id}
                  >
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
})

OrdersTable.displayName = 'OrdersTable'

export default OrdersTable