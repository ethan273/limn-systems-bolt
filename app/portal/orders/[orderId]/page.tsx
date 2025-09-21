'use client'

import { useParams } from 'next/navigation'
import ProductionShippingDashboard from '@/components/dashboard/ProductionShippingDashboard'

export default function OrderStatusPage() {
  const params = useParams()
  const orderId = params?.orderId as string

  return (
    <div className="container mx-auto p-6">
      <ProductionShippingDashboard orderId={orderId} />
    </div>
  )
}