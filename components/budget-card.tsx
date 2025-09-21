'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface BudgetCardProps {
  budget: {
    id: string
    name: string
    category: string
    department: string
    period_name?: string
    budget_amount: number
    actual_amount: number
    variance: number
    variance_percentage: number
    status: 'on_track' | 'at_risk' | 'over_budget'
    remaining: number
    burn_rate: number
  }
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewDetails: (id: string) => void
}

export function BudgetCard({ budget, onEdit, onDelete, onViewDetails }: BudgetCardProps) {
  const progressPercentage = budget.budget_amount > 0 
    ? Math.min(100, Math.max(0, (budget.actual_amount / budget.budget_amount) * 100))
    : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800'
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800'
      case 'over_budget':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="w-4 h-4" />
      case 'at_risk':
      case 'over_budget':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return null
    }
  }

  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'bg-red-500'
    if (progressPercentage >= 90) return 'bg-yellow-500'
    if (progressPercentage >= 70) return 'bg-yellow-400'
    return 'bg-green-500'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (percent: number) => {
    const sign = percent > 0 ? '+' : ''
    return `${sign}${percent.toFixed(1)}%`
  }

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg font-semibold text-gray-900 truncate">
            {budget.name}
          </CardTitle>
          <p className="text-sm text-gray-600 truncate">
            {budget.category} • {budget.period_name}
          </p>
        </div>
        <DropdownMenu
          trigger={
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
          items={[
            {
              label: 'View Details',
              onClick: () => onViewDetails(budget.id),
              icon: Eye
            },
            {
              label: 'Edit',
              onClick: () => onEdit(budget.id),
              icon: Edit
            },
            {
              label: 'Delete',
              onClick: () => onDelete(budget.id),
              icon: Trash2,
              destructive: true
            }
          ]}
        />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Budget vs Actual */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Budget</span>
            <span className="font-medium">{formatCurrency(budget.budget_amount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Actual</span>
            <span className="font-medium">{formatCurrency(budget.actual_amount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Remaining</span>
            <span className={`font-medium ${budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(budget.remaining)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
          </div>
        </div>

        {/* Variance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Variance</span>
            {budget.variance !== 0 && (
              budget.variance > 0 ? 
                <TrendingUp className="w-4 h-4 text-red-500" /> : 
                <TrendingDown className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${budget.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(budget.variance))}
            </div>
            <div className={`text-xs ${budget.variance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {formatPercentage(budget.variance_percentage)}
            </div>
          </div>
        </div>

        {/* Status and Burn Rate */}
        <div className="flex items-center justify-between">
          <Badge className={getStatusColor(budget.status)} variant="outline">
            {getStatusIcon(budget.status)}
            <span className="ml-1 capitalize">{safeFormatString(budget.status, 'active')}</span>
          </Badge>
          <div className="text-right">
            <div className="text-xs text-gray-500">Burn Rate</div>
            <div className="text-sm font-medium">
              {formatCurrency(budget.burn_rate)}/mo
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}