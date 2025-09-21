'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { safeGet } from '@/lib/utils/bulk-type-fixes'

interface ProductionData {
  orderId: string
  orderNumber: string
  items: {
    id: string
    item_name: string
    quantity: number
    currentStage: string
    stageProgress: number
    overallProgress: number
    stages: Record<string, {
      progress: number
      started_at?: string
      completed_at?: string
      notes?: string
    }>
  }[]
  overallProgress: number
  currentStage: string
  estimatedCompletion?: string
}

export function useProductionTracking(orderId: string) {
  const [data, setData] = useState<ProductionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProductionData = useCallback(async () => {
    if (!orderId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/portal/production/${orderId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const productionData = await response.json()
      setData(productionData)

      // Log the production view for analytics
      fetch(`/api/portal/production/${orderId}`, {
        method: 'POST'
      }).catch(() => {
        // Ignore logging errors
      })

    } catch (error) {
      console.error('Error fetching production data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load production data')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  const refetch = useCallback(() => {
    return fetchProductionData()
  }, [fetchProductionData])

  useEffect(() => {
    fetchProductionData()
  }, [fetchProductionData])

  useEffect(() => {
    if (!orderId) return

    const supabase = createClient()
    
    // Set up real-time subscription for production updates
    const channel = supabase
      .channel(`production-updates-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_items'
        },
        async (payload) => {
          // Check if this update is for our order by checking the order_item_id
          const orderItemId = safeGet(payload, ['new', 'order_item_id']) || safeGet(payload, ['old', 'order_item_id'])
          
          if (orderItemId) {
            try {
              // Fetch the order_id for this order_item to see if it matches our orderId
              const { data: orderItem } = await supabase
                .from('order_items')
                .select('order_id')
                .eq('id', orderItemId)
                .single()
              
              if (orderItem?.order_id === orderId) {
                // This update is for our order, refresh the data
                console.log('Production update received for order:', orderId)
                setTimeout(fetchProductionData, 1000) // Small delay to ensure DB consistency
              }
            } catch (error) {
              console.error('Error checking order item:', error)
            }
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [orderId, fetchProductionData])

  return {
    data,
    loading,
    error,
    refetch
  }
}