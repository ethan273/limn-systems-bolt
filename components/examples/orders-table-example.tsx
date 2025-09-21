'use client'

/**
 * Example implementation of DataTable component for Orders
 * 
 * This demonstrates how to migrate existing table implementations
 * to use the standardized DataTable component.
 */

import React from 'react'
import { DataTable, DataTableColumn, DataTableAction } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2, FileText } from 'lucide-react'

// Example Order interface (from your existing code)
interface Order {
  id: string
  order_number: string
  project?: {
    name: string
    client_name: string
  }
  category: 'furniture' | 'decking' | 'cladding' | 'fixtures' | 'custom_millwork'
  status: 'draft' | 'confirmed' | 'in_production' | 'ready_to_ship' | 'shipped' | 'delivered'
  line_items: Array<{
    id: string
    quantity: number
  }>
  total_amount: number
  payment_status: 'pending' | 'deposit_paid' | 'fully_paid'
  estimated_delivery_date?: string
  actual_delivery_date?: string
  created_at: string
  po_number?: string
}

// Status mapping for consistent badge colors
const statusMap = {
  draft: { variant: 'secondary' as const, label: 'Draft' },
  confirmed: { variant: 'default' as const, label: 'Confirmed' },
  in_production: { variant: 'default' as const, label: 'In Production' },
  ready_to_ship: { variant: 'default' as const, label: 'Ready to Ship' },
  shipped: { variant: 'default' as const, label: 'Shipped' },
  delivered: { variant: 'default' as const, label: 'Delivered' }
}

const paymentStatusMap = {
  pending: { variant: 'secondary' as const, label: 'Pending' },
  deposit_paid: { variant: 'default' as const, label: 'Deposit Paid' },
  fully_paid: { variant: 'default' as const, label: 'Fully Paid' }
}

const categoryMap = {
  furniture: { variant: 'default' as const, label: 'Furniture' },
  decking: { variant: 'secondary' as const, label: 'Decking' },
  cladding: { variant: 'secondary' as const, label: 'Cladding' },
  fixtures: { variant: 'default' as const, label: 'Fixtures' },
  custom_millwork: { variant: 'default' as const, label: 'Custom Millwork' }
}

interface OrdersTableProps {
  orders: Order[]
  loading?: boolean
  onViewOrder: (order: Order) => void
  onEditOrder: (order: Order) => void
  onDeleteOrder: (order: Order) => void
  onGenerateInvoice?: (order: Order) => void
}

export function OrdersTableExample({
  orders,
  loading = false,
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
  onGenerateInvoice
}: OrdersTableProps) {

  // Define table columns with the new standardized approach
  const columns: DataTableColumn<Order>[] = [
    {
      key: 'order_number',
      header: 'Order Number',
      accessor: 'order_number',
      sortable: true,
      searchable: true,
      cell: (value, row) => (
        <div>
          <div className="font-medium text-heading">{String(value || '')}</div>
          {row.po_number && (
            <div className="text-sm text-slate-600">{row.po_number}</div>
          )}
        </div>
      )
    },
    {
      key: 'project',
      header: 'Project',
      accessor: (row) => row.project?.name || 'No Project',
      sortable: true,
      searchable: true,
      cell: (value, row) => (
        <div>
          <div className="font-medium">{row.project?.name || '—'}</div>
          {row.project?.client_name && (
            <div className="text-sm text-slate-600">{row.project.client_name}</div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      accessor: 'category',
      sortable: true,
      cell: (value) => {
        const category = categoryMap[value as keyof typeof categoryMap]
        return (
          <Badge variant={category?.variant || 'secondary'}>
            {category?.label || String(value || '')}
          </Badge>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      cell: (value) => {
        const status = statusMap[value as keyof typeof statusMap]
        return (
          <Badge variant={status?.variant || 'secondary'}>
            {status?.label || String(value || '')}
          </Badge>
        )
      }
    },
    {
      key: 'items_count',
      header: 'Items',
      accessor: (row) => (row.line_items || []).length,
      sortable: true,
      align: 'center',
      cell: (value) => (
        <span className="font-medium">{String(value || '')}</span>
      )
    },
    {
      key: 'total_amount',
      header: 'Total',
      accessor: 'total_amount',
      sortable: true,
      align: 'right',
      cell: (value) => (
        <span className="font-medium">
          {new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
          }).format(Number(value || 0))}
        </span>
      )
    },
    {
      key: 'payment_status',
      header: 'Payment',
      accessor: 'payment_status',
      sortable: true,
      cell: (value) => {
        const paymentStatus = paymentStatusMap[value as keyof typeof paymentStatusMap]
        return (
          <Badge variant={paymentStatus?.variant || 'secondary'}>
            {paymentStatus?.label || String(value || '')}
          </Badge>
        )
      }
    },
    {
      key: 'delivery',
      header: 'Delivery',
      accessor: (row) => row.actual_delivery_date || row.estimated_delivery_date,
      sortable: true,
      cell: (value, row) => (
        <div className="text-sm">
          {row.actual_delivery_date ? (
            <div className="text-green-600">
              {new Date(row.actual_delivery_date).toLocaleDateString()}
            </div>
          ) : row.estimated_delivery_date ? (
            <div>
              {new Date(row.estimated_delivery_date).toLocaleDateString()}
            </div>
          ) : (
            <div className="text-slate-400">TBD</div>
          )}
        </div>
      )
    }
  ]

  // Define table actions
  const actions: DataTableAction<Order>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: onViewOrder
    },
    {
      label: 'Edit Order',
      icon: Edit,
      onClick: onEditOrder,
      show: (order) => order.status === 'draft' || order.status === 'confirmed'
    },
    {
      label: 'Generate Invoice',
      icon: FileText,
      onClick: onGenerateInvoice || (() => {}),
      show: (order) => order.payment_status !== 'fully_paid' && !!onGenerateInvoice
    },
    {
      label: 'Delete Order',
      icon: Trash2,
      variant: 'destructive',
      onClick: onDeleteOrder,
      show: (order) => order.status === 'draft'
    }
  ]

  return (
    <DataTable
      data={orders}
      columns={columns}
      actions={actions}
      loading={loading}
      searchable={true}
      sortable={true}
      pagination={true}
      pageSize={10}
      searchPlaceholder="Search orders..."
      emptyMessage="No orders found"
      onRowClick={onViewOrder}
      rowKey="id"
      compact={false}
      striped={true}
    />
  )
}

// Usage example in a page component:
export function OrdersPageExample() {
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)

  // Load orders data
  React.useEffect(() => {
    const loadOrders = async () => {
      setLoading(true)
      try {
        // Replace with your actual API call
        const response = await fetch('/api/orders')
        const data = await response.json()
        setOrders(data)
      } catch (error) {
        console.error('Error loading orders:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  // Action handlers
  const handleViewOrder = (order: Order) => {
    // Navigate to order detail page or open modal
    console.log('View order:', order.id)
  }

  const handleEditOrder = (order: Order) => {
    // Navigate to edit page or open edit modal
    console.log('Edit order:', order.id)
  }

  const handleDeleteOrder = (order: Order) => {
    // Show confirmation dialog and delete
    if (confirm(`Are you sure you want to delete order ${order.order_number}?`)) {
      console.log('Delete order:', order.id)
      // Implement deletion logic
    }
  }

  const handleGenerateInvoice = (order: Order) => {
    // Generate and download invoice
    console.log('Generate invoice for order:', order.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Button onClick={() => console.log('Create new order')}>
          Create Order
        </Button>
      </div>

      <OrdersTableExample
        orders={orders}
        loading={loading}
        onViewOrder={handleViewOrder}
        onEditOrder={handleEditOrder}
        onDeleteOrder={handleDeleteOrder}
        onGenerateInvoice={handleGenerateInvoice}
      />
    </div>
  )
}