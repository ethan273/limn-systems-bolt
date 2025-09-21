'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, AlertCircle, Clock, Users } from 'lucide-react'

interface ChurnRiskIndicatorProps {
  riskScore: number
  customerName: string
  warningSignsArray: string[]
  recommendedAction: string
  lastOrderDate: string
  totalRevenue: number
  compact?: boolean
}

export function ChurnRiskIndicator({
  riskScore,
  customerName,
  warningSignsArray,
  recommendedAction,
  lastOrderDate,
  totalRevenue,
  compact = false
}: ChurnRiskIndicatorProps) {
  
  const getRiskLevel = (score: number) => {
    if (score >= 80) return {
      level: 'Critical',
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: AlertTriangle,
      description: 'Immediate action required'
    }
    if (score >= 60) return {
      level: 'High',
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: AlertCircle,
      description: 'Urgent attention needed'
    }
    if (score >= 40) return {
      level: 'Medium',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: Clock,
      description: 'Monitor closely'
    }
    if (score >= 20) return {
      level: 'Low',
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: Users,
      description: 'Stable customer'
    }
    return {
      level: 'Minimal',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle,
      description: 'Healthy relationship'
    }
  }

  const risk = getRiskLevel(riskScore)
  const Icon = risk.icon

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 30) return `${diffDays} days ago`
    if (diffDays < 60) return '1 month ago'
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`
  }

  // Compact version for tables/lists
  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        {/* Risk Gauge */}
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center ${risk.bgColor} ${risk.borderColor} border-2`}
            >
              <span className={`text-xs font-bold ${risk.textColor}`}>
                {riskScore}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <Badge className={`${risk.color} text-white border-0 text-xs px-2 py-0.5`}>
              {risk.level} Risk
            </Badge>
            <span className="text-sm text-gray-600 truncate">
              {risk.description}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Last order: {formatDate(lastOrderDate)}
          </div>
        </div>

        <Icon className={`w-4 h-4 ${risk.textColor} flex-shrink-0`} />
      </div>
    )
  }

  // Full card version
  return (
    <Card className={`${risk.borderColor} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Churn Risk Analysis
          </CardTitle>
          <Badge className={`${risk.color} text-white border-0`}>
            {risk.level} Risk
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          {customerName} • {formatCurrency(totalRevenue)} total revenue
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Score Gauge */}
        <div className={`${risk.bgColor} rounded-lg p-4 border ${risk.borderColor}`}>
          <div className="flex items-center space-x-4">
            <div className="relative">
              {/* Circular progress */}
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                {/* Background circle */}
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-gray-300"
                />
                {/* Progress circle */}
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={`${(riskScore / 100) * 175.93} 175.93`}
                  strokeLinecap="round"
                  className={risk.textColor}
                />
              </svg>
              {/* Score text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${risk.textColor}`}>
                  {riskScore}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Icon className={`w-5 h-5 ${risk.textColor}`} />
                <span className={`font-semibold ${risk.textColor}`}>
                  {risk.level} Risk Level
                </span>
              </div>
              <p className="text-sm text-gray-700">
                {risk.description}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Last Order:</span>
            <div className="font-medium">{formatDate(lastOrderDate)}</div>
          </div>
          <div>
            <span className="text-gray-600">Total Revenue:</span>
            <div className="font-medium">{formatCurrency(totalRevenue)}</div>
          </div>
        </div>

        {/* Warning Signs */}
        {warningSignsArray.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Warning Signs:</h4>
            <div className="space-y-1">
              {warningSignsArray.map((sign, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{sign}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Action */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">
            Recommended Action:
          </h4>
          <p className="text-sm text-blue-800">{recommendedAction}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <button className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
            Take Action
          </button>
          <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            View Customer
          </button>
        </div>
      </CardContent>
    </Card>
  )
}