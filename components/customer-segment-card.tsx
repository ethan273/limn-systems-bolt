'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, TrendingUp, Target, ChevronRight } from 'lucide-react'

interface SegmentCardProps {
  segment: {
    id: string
    name: string
    description: string
    customer_count: number
    percentage: number
    metrics: {
      avg_clv: number
      growth_rate: number
      retention_rate: number
    }
    characteristics: string[]
    color: string
  }
  onClick?: () => void
  showDetails?: boolean
}

export function CustomerSegmentCard({ 
  segment, 
  onClick,
  showDetails = true 
}: SegmentCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getGrowthColor = (rate: number) => {
    if (rate > 20) return 'text-green-600'
    if (rate > 10) return 'text-blue-600'
    if (rate > 0) return 'text-gray-600'
    return 'text-red-600'
  }

  const getGrowthIcon = (rate: number) => {
    return rate >= 0 ? TrendingUp : TrendingUp
  }

  const GrowthIcon = getGrowthIcon(segment.metrics.growth_rate)

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden ${
        onClick ? 'hover:border-blue-300' : ''
      }`}
      onClick={onClick}
    >
      {/* Color indicator stripe */}
      <div 
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: segment.color }}
      />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {segment.name}
            </CardTitle>
            <p className="text-sm text-gray-600 line-clamp-2">
              {segment.description}
            </p>
          </div>
          {onClick && (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-lg font-bold text-gray-900">
                {segment.customer_count}
              </div>
              <div className="text-xs text-gray-600">
                {segment.percentage}% of customers
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(segment.metrics.avg_clv)}
              </div>
              <div className="text-xs text-gray-600">
                Avg CLV
              </div>
            </div>
          </div>
        </div>

        {/* Growth and Retention */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <GrowthIcon className={`w-4 h-4 ${getGrowthColor(segment.metrics.growth_rate)}`} />
            <span className={`text-sm font-medium ${getGrowthColor(segment.metrics.growth_rate)}`}>
              {segment.metrics.growth_rate > 0 ? '+' : ''}{segment.metrics.growth_rate}% growth
            </span>
          </div>
          
          <Badge 
            variant="outline" 
            className={`text-xs ${
              segment.metrics.retention_rate >= 90 ? 'border-green-200 text-green-800 bg-green-50' :
              segment.metrics.retention_rate >= 70 ? 'border-blue-200 text-blue-800 bg-blue-50' :
              'border-yellow-200 text-yellow-800 bg-yellow-50'
            }`}
          >
            {segment.metrics.retention_rate}% retention
          </Badge>
        </div>

        {/* Characteristics */}
        {showDetails && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Key Characteristics:</h4>
            <div className="space-y-1">
              {(segment.characteristics || []).slice(0, 3).map((characteristic, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  <span className="text-xs text-gray-600">{characteristic}</span>
                </div>
              ))}
              {(segment.characteristics || []).length > 3 && (
                <div className="text-xs text-gray-500 ml-3.5">
                  +{(segment.characteristics || []).length - 3} more characteristics
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        {onClick && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
            >
              View Segment Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}