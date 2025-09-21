'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react'

interface EfficiencyCardProps {
  title: string
  value: number
  target?: number
  unit?: string
  trend?: number // Percentage change from previous period
  trendPeriod?: string // e.g., "vs last month"
  format?: 'percentage' | 'decimal' | 'days' | 'currency' | 'number'
  icon?: React.ComponentType<{ className?: string }>
  subtitle?: string
  sparklineData?: number[] // Simple array of values for mini chart
}

export function EfficiencyCard({ 
  title, 
  value, 
  target,
  unit = '', 
  trend, 
  trendPeriod = 'vs last period',
  format = 'number',
  icon: Icon,
  subtitle,
  sparklineData
}: EfficiencyCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'decimal':
        return val.toFixed(2)
      case 'days':
        return `${val.toFixed(1)} days`
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val)
      case 'number':
        return Math.round(val).toLocaleString()
      default:
        return val.toString()
    }
  }

  const getTrendIcon = () => {
    if (!trend || trend === 0) return <Minus className="w-4 h-4 text-gray-500" />
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
    return <TrendingDown className="w-4 h-4 text-red-600" />
  }

  const getTrendColor = () => {
    if (!trend || trend === 0) return 'text-gray-600'
    // For most metrics, positive trend is good. For lead time/costs, negative is good
    const isInverseGood = title.toLowerCase().includes('lead time') || 
                          title.toLowerCase().includes('cost') ||
                          title.toLowerCase().includes('delay')
    
    if (isInverseGood) {
      return trend > 0 ? 'text-red-600' : 'text-green-600'
    }
    return trend > 0 ? 'text-green-600' : 'text-red-600'
  }

  const getPerformanceStatus = () => {
    if (!target) return null
    
    const performance = (value / target) * 100
    if (performance >= 100) return { status: 'excellent', color: 'bg-green-500' }
    if (performance >= 90) return { status: 'good', color: 'bg-blue-500' }
    if (performance >= 75) return { status: 'fair', color: 'bg-yellow-500' }
    return { status: 'poor', color: 'bg-red-500' }
  }

  const performanceStatus = getPerformanceStatus()

  const generateSparkline = (data: number[]) => {
    if (!data || data.length < 2) return null
    
    const maxVal = Math.max(...data)
    const minVal = Math.min(...data)
    const range = maxVal - minVal || 1
    
    const points = data.map((val, index) => {
      const x = (index / (data.length - 1)) * 60
      const y = 20 - ((val - minVal) / range) * 20
      return `${x},${y}`
    }).join(' ')
    
    return (
      <svg width="60" height="20" className="ml-auto">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          points={points}
          className="opacity-60"
        />
      </svg>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-gray-700">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-gray-600">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {sparklineData && generateSparkline(sparklineData)}
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Main Value */}
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(value)}
            {unit && <span className="text-lg text-gray-600 ml-1">{unit}</span>}
          </div>
          
          {/* Target Comparison */}
          {target && (
            <div className="flex items-center space-x-2">
              <Target className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-600">
                Target: {formatValue(target)}{unit}
              </span>
              {performanceStatus && (
                <Badge 
                  variant="outline" 
                  className="text-xs capitalize"
                  style={{ 
                    backgroundColor: `${performanceStatus.color}20`,
                    borderColor: performanceStatus.color,
                    color: performanceStatus.color
                  }}
                >
                  {performanceStatus.status}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Trend Information */}
        {trend !== undefined && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {Math.abs(trend).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-600">
                {trendPeriod}
              </span>
            </div>
          </div>
        )}

        {/* Performance Bar */}
        {target && (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  performanceStatus?.color || 'bg-gray-400'
                }`}
                style={{ 
                  width: `${Math.min(100, Math.max(2, (value / target) * 100))}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>{formatValue(target)}</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Performance indicator stripe */}
      {performanceStatus && (
        <div 
          className={`absolute top-0 left-0 w-1 h-full ${performanceStatus.color}`}
        />
      )}
    </Card>
  )
}