'use client'

import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ProductionShippingDashboard from '@/components/dashboard/ProductionShippingDashboard'

export default function ProductionPage() {
  const { canView, loading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !canView('production')) {
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

  if (!canView('production')) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-heading">Production Tracking</h1>
        <p className="text-graphite mt-1">Monitor and manage production workflows</p>
      </div>
      
      <ProductionShippingDashboard defaultTab="production" />
    </div>
  )
}