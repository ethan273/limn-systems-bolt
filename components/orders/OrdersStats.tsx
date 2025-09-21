'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Order {
  id: string
  order_number: string
  project_id: string
  project?: {
    id: string
    name: string
    customer?: {
      name: string
    }
  }
  category: 'furniture' | 'decking' | 'cladding' | 'fixtures' | 'custom_millwork'
  status: 'draft' | 'confirmed' | 'in_production' | 'ready_to_ship' | 'shipped' | 'delivered'
  total_amount: number
  estimated_delivery_date?: string
  created_at: string
}

interface OrdersStatsProps {
  orders: Order[]
  formatCurrency: (amount: number) => string
}

const OrdersStats = React.memo(({ orders, formatCurrency }: OrdersStatsProps) => {
  const totalOrders = orders.length
  const inProductionCount = orders.filter(o => o.status === 'in_production').length
  const readyToShipCount = orders.filter(o => o.status === 'ready_to_ship').length
  const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-heading mb-1">
            {totalOrders}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">In Production</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-amber-600 mb-1">
            {inProductionCount}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Ready to Ship</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {readyToShipCount}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-heading mb-1">
            {formatCurrency(totalValue)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

OrdersStats.displayName = 'OrdersStats'

export default OrdersStats