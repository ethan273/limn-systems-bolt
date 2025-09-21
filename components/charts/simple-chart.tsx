'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartDataPoint {
  label: string
  value: number
  target?: number
  color?: string
}

interface SimpleChartProps {
  data: ChartDataPoint[]
  type: 'bar' | 'line' | 'area'
  title: string
  height?: number
  showTarget?: boolean
  valueFormatter?: (value: number) => string
}

export function SimpleChart({ 
  data, 
  type = 'bar', 
  title, 
  height = 200, 
  showTarget = false,
  valueFormatter = (v) => v.toFixed(1)
}: SimpleChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.target || 0)))
  const minValue = Math.min(...data.map(d => Math.min(d.value, d.target || Infinity)))
  const range = maxValue - minValue || 1

  const getBarColor = (dataPoint: ChartDataPoint, index: number) => {
    if (dataPoint.color) return dataPoint.color
    
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
      'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ]
    return colors[index % colors.length]
  }

  const renderBarChart = () => (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
        const targetPercentage = item.target && maxValue > 0 ? (item.target / maxValue) * 100 : 0
        
        return (
          <div key={item.label} className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
              <div className="flex items-center space-x-4 text-xs">
                <span className="text-gray-600">
                  Value: {valueFormatter(item.value)}
                </span>
                {showTarget && item.target && (
                  <span className="text-gray-500">
                    Target: {valueFormatter(item.target)}
                  </span>
                )}
              </div>
            </div>
            <div className="relative">
              {/* Background */}
              <div className="w-full bg-gray-200 rounded h-6">
                {/* Value bar */}
                <div 
                  className={`h-6 rounded transition-all duration-500 ${getBarColor(item, index)}`}
                  style={{ width: `${Math.max(2, percentage)}%` }}
                />
                {/* Target line */}
                {showTarget && item.target && targetPercentage > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-600"
                    style={{ left: `${targetPercentage}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderLineChart = () => {
    const chartHeight = height - 40
    const chartWidth = 100 // percentage
    
    const points = data.map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * chartWidth
      const y = chartHeight - ((item.value - minValue) / range) * chartHeight
      return `${x},${y}`
    }).join(' ')

    const targetPoints = showTarget ? data.map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * chartWidth
      const y = item.target ? chartHeight - ((item.target - minValue) / range) * chartHeight : chartHeight
      return `${x},${y}`
    }).join(' ') : ''

    return (
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} className="overflow-visible">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(ratio => (
            <line
              key={ratio}
              x1="0"
              y1={ratio * chartHeight}
              x2="100"
              y2={ratio * chartHeight}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Target line */}
          {showTarget && targetPoints && (
            <polyline
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="4,4"
              points={targetPoints}
            />
          )}
          
          {/* Data line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            points={points}
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = (index / Math.max(data.length - 1, 1)) * chartWidth
            const y = chartHeight - ((item.value - minValue) / range) * chartHeight
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
              />
            )
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          {data.map((item, index) => (
            <span key={index} className="truncate max-w-16">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          {type === 'bar' ? renderBarChart() : renderLineChart()}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>Actual</span>
          </div>
          {showTarget && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-red-600 border-dashed" />
              <span>Target</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}