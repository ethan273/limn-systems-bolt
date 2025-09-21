import * as React from 'react'
import { Card, CardContent } from './card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: LucideIcon
  iconColor?: string
  iconBgColor?: string
  className?: string
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ 
    title, 
    value, 
    change, 
    changeType = 'neutral',
    icon: Icon,
    iconColor = 'text-blue-600',
    iconBgColor = 'bg-blue-50',
    className = ''
  }, ref) => {
    const changeColors = {
      positive: 'text-green-600',
      negative: 'text-red-600', 
      neutral: 'text-slate-600'
    }

    return (
      <Card ref={ref} className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600 mb-2">{title}</p>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {change && (
                <p className={`text-sm font-medium ${changeColors[changeType]}`}>
                  {change}
                </p>
              )}
            </div>
            {Icon && (
              <div className={`p-3 rounded-full ${iconBgColor} flex-shrink-0 ml-4`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)

StatCard.displayName = 'StatCard'

export { StatCard }