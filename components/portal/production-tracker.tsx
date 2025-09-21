'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { 
  Palette,
  Scissors, 
  Hammer,
  Sparkles,
  CheckCircle2,
  Package,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const PRODUCTION_STAGES = [
  { 
    key: 'Design', 
    label: 'Design', 
    icon: Palette,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    description: 'Design and planning phase'
  },
  { 
    key: 'Cutting', 
    label: 'Cutting', 
    icon: Scissors,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    description: 'Materials being cut'
  },
  { 
    key: 'Assembly', 
    label: 'Assembly', 
    icon: Hammer,
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-100',
    textColor: 'text-yellow-600',
    description: 'Product assembly'
  },
  { 
    key: 'Finishing', 
    label: 'Finishing', 
    icon: Sparkles,
    color: 'bg-green-500',
    lightColor: 'bg-green-100',
    textColor: 'text-green-600',
    description: 'Finishing touches'
  },
  { 
    key: 'QC', 
    label: 'Quality Check', 
    icon: CheckCircle2,
    color: 'bg-red-500',
    lightColor: 'bg-red-100',
    textColor: 'text-red-600',
    description: 'Quality inspection'
  },
  { 
    key: 'Packaging', 
    label: 'Packaging', 
    icon: Package,
    color: 'bg-gray-500',
    lightColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    description: 'Ready to ship'
  }
]


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

interface ProductionTrackerProps {
  orderId: string
  compact?: boolean
}

export function ProductionTracker({ orderId, compact = false }: ProductionTrackerProps) {
  const [data, setData] = useState<ProductionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canViewProduction, setCanViewProduction] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const fetchProductionData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/portal/production/${orderId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch production data')
      }

      const productionData = await response.json()
      setData(productionData)
    } catch (error) {
      console.error('Error fetching production data:', error)
      setError('Failed to load production data')
      
      // Fallback data for testing
      setData({
        orderId,
        orderNumber: `ORD-${orderId}`,
        items: [
          {
            id: '1',
            item_name: 'Custom Widget A',
            quantity: 50,
            currentStage: 'Assembly',
            stageProgress: 45,
            overallProgress: 45,
            stages: {}
          }
        ],
        currentStage: 'Assembly',
        overallProgress: 45,
        estimatedCompletion: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      })
    } finally {
      setLoading(false)
    }
  }, [orderId])

  const setupSubscription = useCallback(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel(`production-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_items'
        },
        async (payload) => {
          const orderItemId = safeGet(payload, ['new', 'order_item_id']) || safeGet(payload, ['old', 'order_item_id'])
          
          if (orderItemId) {
            setTimeout(fetchProductionData, 1000)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [orderId, fetchProductionData])

  useEffect(() => {
    checkPortalSettings()
    if (canViewProduction) {
      fetchProductionData()
      setupSubscription()
    }
  }, [orderId, canViewProduction, fetchProductionData, setupSubscription])

  const checkPortalSettings = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setError('Authentication required')
        return
      }

      // Check portal settings
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (customer) {
        const { data: settings } = await supabase
          .from('portal_settings')
          .select('show_production_tracking')
          .eq('customer_id', customer.id)
          .single()

        setCanViewProduction(settings?.show_production_tracking ?? true)
      }
    } catch (error) {
      console.error('Error checking portal settings:', error)
      setCanViewProduction(false)
    }
  }


  const getStageStatus = (stageKey: string, itemStages: Record<string, unknown>) => {
    const stage = itemStages[stageKey] as unknown
    if (!stage || Number(safeGet(stage, ['progress']) || 0) === 0) return 'pending'
    if (Number(safeGet(stage, ['progress']) || 0) === 100 && safeGet(stage, ['completed_at'])) return 'completed'
    return 'in-progress'
  }

  const getStageClasses = (status: 'completed' | 'in-progress' | 'pending', stage: unknown) => {
    switch (status) {
      case 'completed':
        return `${String(safeGet(stage, ['color']) || 'bg-green-500')} text-white shadow-md scale-110`
      case 'in-progress':
        return `${String(safeGet(stage, ['lightColor']) || 'bg-blue-100')} ${String(safeGet(stage, ['textColor']) || 'text-blue-800')} border-2 border-current shadow-md scale-105 animate-pulse`
      case 'pending':
        return 'bg-gray-200 text-gray-400'
      default:
        return 'bg-gray-200 text-gray-400'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  if (!canViewProduction) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Production tracking is not available for your account.</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="flex justify-between mb-6">
              {PRODUCTION_STAGES.map((_, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 mb-2">Unable to load production data</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#4b4949]">Order {data.orderNumber}</h3>
            <p className="text-sm text-gray-600">Current Stage: {data.currentStage}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#4b4949]">{data.overallProgress}%</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-[#91bdbd] to-[#7da9a9] h-3 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${data.overallProgress}%` }}
          />
        </div>

        <div className="flex justify-between text-xs">
          {PRODUCTION_STAGES.map((stage, index) => {
            const isActive = stage.label === data.currentStage
            const isPassed = PRODUCTION_STAGES.findIndex(s => s.label === data.currentStage) > index
            
            return (
              <div key={stage.key} className="flex flex-col items-center">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center mb-1 transition-all duration-300
                  ${isPassed ? stage.color + ' text-white' : 
                    isActive ? stage.lightColor + ' ' + stage.textColor + ' border-2 border-current' : 
                    'bg-gray-200 text-gray-400'}
                `}>
                  <stage.icon className="w-3 h-3" />
                </div>
                <span className={`text-xs ${isActive ? stage.textColor : 'text-gray-500'}`}>
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-[#4b4949]">Production Tracking</h2>
            <p className="text-gray-600">Order {data.orderNumber} - {(data.items || []).length} item{(data.items || []).length !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#4b4949]">{data.overallProgress}%</div>
            <div className="text-sm text-gray-600">Overall Progress</div>
            {data.estimatedCompletion && (
              <div className="text-xs text-gray-500 mt-1">
                Est. completion: {formatDate(data.estimatedCompletion)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Overall Timeline */}
        <div className="relative">
          {/* Background line */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded" />
          
          {/* Progress line */}
          <div 
            className="absolute top-8 left-0 h-1 bg-gradient-to-r from-[#91bdbd] to-[#7da9a9] rounded transition-all duration-700 ease-out"
            style={{ width: `${(data.overallProgress / 100) * 100}%` }}
          />
          
          {/* Stage indicators */}
          <div className="relative flex justify-between">
            {PRODUCTION_STAGES.map((stage, index) => {
              const isActive = stage.label === data.currentStage
              const stageIndex = PRODUCTION_STAGES.findIndex(s => s.label === data.currentStage)
              const isPassed = stageIndex > index
              const isCompleted = data.overallProgress === 100 && index === PRODUCTION_STAGES.length - 1
              
              const status = isPassed || isCompleted ? 'completed' : isActive ? 'in-progress' : 'pending'
              
              return (
                <div key={stage.key} className="flex flex-col items-center">
                  <div className={`
                    relative z-10 w-16 h-16 rounded-full flex items-center justify-center
                    ${getStageClasses(status, stage)}
                    transition-all duration-500 cursor-default
                  `}>
                    <stage.icon className="w-6 h-6" />
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${status === 'pending' ? 'text-gray-500' : stage.textColor}`}>
                      {stage.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stage.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Individual Items */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#4b4949] text-lg">Item Progress</h3>
          
          {(data.items || []).map((item) => {
            const isExpanded = expandedItems.has(item.id)
            
            return (
              <div key={item.id} className="bg-gray-50 rounded-lg overflow-hidden">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleItemExpansion(item.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-[#4b4949]">{item.item_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          Qty: {item.quantity}
                        </Badge>
                        <Badge className="text-xs">
                          {item.currentStage}: {item.stageProgress}%
                        </Badge>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-[#91bdbd] to-[#7da9a9] h-2 rounded-full transition-all duration-500"
                              style={{ width: `${item.overallProgress}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-medium text-[#4b4949]">
                          {item.overallProgress}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {PRODUCTION_STAGES.map((stage) => {
                        const stageData = item.stages[stage.key] || { progress: 0 }
                        const status = getStageStatus(stage.key, item.stages)
                        
                        return (
                          <div key={stage.key} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center
                                ${getStageClasses(status, stage)}
                              `}>
                                <stage.icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{stage.label}</div>
                                <div className="text-xs text-gray-500">{stageData.progress}%</div>
                              </div>
                            </div>
                            
                            {stageData.started_at && (
                              <div className="text-xs text-gray-600 mb-1">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Started: {formatDate(stageData.started_at)}
                              </div>
                            )}
                            
                            {stageData.completed_at && (
                              <div className="text-xs text-green-600 mb-1">
                                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                Completed: {formatDate(stageData.completed_at)}
                              </div>
                            )}
                            
                            {stageData.notes && (
                              <div className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border">
                                {stageData.notes}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}