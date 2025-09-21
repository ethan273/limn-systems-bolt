'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface CapacityGaugeProps {
  data: Array<{
    name: string
    current_load: number
    max_capacity: number
    utilization_percent: number
    projected_overflow_date?: string
  }>
  title?: string
}

export function CapacityGauge({ data, title = 'Stage Capacity' }: CapacityGaugeProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No capacity data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 95) return 'bg-red-500'
    if (utilization >= 80) return 'bg-yellow-500'
    if (utilization >= 60) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getUtilizationBgColor = (utilization: number) => {
    if (utilization >= 95) return 'bg-red-50'
    if (utilization >= 80) return 'bg-yellow-50'
    if (utilization >= 60) return 'bg-blue-50'
    return 'bg-green-50'
  }

  const getStatusIcon = (utilization: number) => {
    if (utilization >= 95) return <AlertTriangle className="w-4 h-4 text-red-600" />
    if (utilization >= 80) return <Clock className="w-4 h-4 text-yellow-600" />
    return <CheckCircle className="w-4 h-4 text-green-600" />
  }

  const getStatusBadge = (utilization: number, overflowDate?: string) => {
    if (utilization >= 95) {
      return <Badge className="bg-red-100 text-red-800" variant="outline">Critical</Badge>
    }
    if (utilization >= 80) {
      return <Badge className="bg-yellow-100 text-yellow-800" variant="outline">Warning</Badge>
    }
    if (overflowDate) {
      return <Badge className="bg-blue-100 text-blue-800" variant="outline">Overflow Risk</Badge>
    }
    return <Badge className="bg-green-100 text-green-800" variant="outline">Normal</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((stage) => (
            <div 
              key={stage.name}
              className={`p-4 rounded-lg ${getUtilizationBgColor(stage.utilization_percent)}`}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(stage.utilization_percent)}
                  <span className="font-medium text-gray-900">{stage.name}</span>
                  {getStatusBadge(stage.utilization_percent, stage.projected_overflow_date)}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {stage.utilization_percent.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">
                    {stage.current_load}/{stage.max_capacity} items
                  </div>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${getUtilizationColor(stage.utilization_percent)}`}
                    style={{ 
                      width: `${Math.min(100, Math.max(2, stage.utilization_percent))}%` 
                    }}
                  />
                </div>
                
                {/* Capacity Labels */}
                <div className="flex justify-between text-xs text-gray-600">
                  <span>0</span>
                  <span className="font-medium">
                    {stage.current_load} current
                  </span>
                  <span>{stage.max_capacity} max</span>
                </div>
              </div>

              {/* Overflow Warning */}
              {stage.projected_overflow_date && (
                <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                  <div className="flex items-center space-x-2 text-orange-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      Capacity may be exceeded by {formatDate(stage.projected_overflow_date)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Overall Capacity Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {data.reduce((sum, stage) => sum + stage.current_load, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {data.reduce((sum, stage) => sum + stage.max_capacity, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Capacity</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${
                data.length > 0 
                  ? data.reduce((sum, stage) => sum + stage.utilization_percent, 0) / data.length >= 80
                    ? 'text-red-600' 
                    : 'text-green-600'
                  : 'text-gray-900'
              }`}>
                {data.length > 0 
                  ? ((data.reduce((sum, stage) => sum + stage.utilization_percent, 0) / data.length).toFixed(1))
                  : 0}%
              </div>
              <div className="text-sm text-gray-600">Avg Utilization</div>
            </div>
          </div>
        </div>

        {/* Capacity Recommendations */}
        <div className="mt-4">
          {data.filter(stage => stage.utilization_percent >= 90).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="font-medium text-red-800 mb-2">Capacity Alerts</h4>
              <div className="space-y-1 text-sm text-red-700">
                {data
                  .filter(stage => stage.utilization_percent >= 90)
                  .map(stage => (
                    <div key={stage.name}>
                      • {stage.name} is at {stage.utilization_percent.toFixed(1)}% capacity
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}