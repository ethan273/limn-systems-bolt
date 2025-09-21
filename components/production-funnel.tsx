'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, ArrowRight } from 'lucide-react'

interface ProductionFunnelProps {
  data: Array<{
    stage: string
    item_count: number
    conversion_rate: number
  }>
  title?: string
}

export function ProductionFunnel({ data, title = 'Production Flow' }: ProductionFunnelProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No production data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...data.map(d => d.item_count))

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Design': 'bg-purple-500',
      'Cutting': 'bg-blue-500',
      'Assembly': 'bg-green-500',
      'Finishing': 'bg-orange-500',
      'QC': 'bg-red-500',
      'Packaging': 'bg-indigo-500',
      'Shipping': 'bg-gray-500'
    }
    return colors[stage] || 'bg-gray-400'
  }

  const getConversionColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingDown className="w-5 h-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((stage, index) => {
            const widthPercent = maxCount > 0 ? (stage.item_count / maxCount) * 100 : 0
            const isFirst = index === 0
            const conversionFromPrevious = isFirst ? 100 : stage.conversion_rate

            return (
              <div key={stage.stage} className="relative">
                {/* Stage Container */}
                <div className="flex items-center space-x-4">
                  {/* Stage Bar */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{stage.stage}</span>
                        <Badge variant="outline" className="text-xs">
                          {stage.item_count} items
                        </Badge>
                      </div>
                      {!isFirst && (
                        <div className={`text-sm font-medium ${getConversionColor(conversionFromPrevious)}`}>
                          {conversionFromPrevious.toFixed(1)}% conversion
                        </div>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-lg h-8 overflow-hidden">
                        <div 
                          className={`h-full ${getStageColor(stage.stage)} transition-all duration-500 ease-out flex items-center justify-center`}
                          style={{ width: `${Math.max(widthPercent, 10)}%` }}
                        >
                          <span className="text-white text-sm font-medium px-2">
                            {stage.item_count}
                          </span>
                        </div>
                      </div>
                      
                      {/* Percentage indicator */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-600">
                        {widthPercent.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow connector */}
                {index < data.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary Statistics */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-900">{data[0]?.item_count || 0}</div>
              <div className="text-gray-600">Started</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{data[data.length - 1]?.item_count || 0}</div>
              <div className="text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {data.length > 0 && data[0].item_count > 0 
                  ? ((data[data.length - 1]?.item_count / data[0].item_count) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-gray-600">Overall Rate</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {data.reduce((sum, stage) => sum + stage.item_count, 0)}
              </div>
              <div className="text-gray-600">Total WIP</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 justify-center">
            {data.map((stage) => (
              <div key={stage.stage} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded ${getStageColor(stage.stage)}`} />
                <span className="text-xs text-gray-600">{stage.stage}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}