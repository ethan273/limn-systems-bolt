'use client'

import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ProductionShippingDashboard from '@/components/dashboard/ProductionShippingDashboard'

export default function ShippingPage() {
  const { canView, loading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !canView('shipping')) {
      router.push('/dashboard')
    }
  }, [loading, canView, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-graphite">Loading...</div>
      </div>
    )
  }

  if (!canView('shipping')) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-heading">Shipping & Delivery</h1>
        <p className="text-graphite mt-1">Track shipments and manage delivery schedules</p>
      </div>
      
      <ProductionShippingDashboard defaultTab="shipping" />
    </div>
  )
}