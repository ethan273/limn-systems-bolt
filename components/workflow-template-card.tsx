'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Users, Zap } from 'lucide-react'
import { WorkflowTemplate } from '@/app/api/workflows/templates/route'
import { safeFormatString } from '@/lib/utils/string-helpers'
import { safeGet } from '@/lib/utils/bulk-type-fixes'

interface WorkflowTemplateCardProps {
  template: WorkflowTemplate
  onInstall?: (template: WorkflowTemplate) => void
  onPreview?: (template: WorkflowTemplate) => void
}

export function WorkflowTemplateCard({
  template,
  onInstall,
  onPreview
}: WorkflowTemplateCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Order Management':
        return 'bg-blue-100 text-blue-800'
      case 'Customer Service':
        return 'bg-green-100 text-green-800'
      case 'Production':
        return 'bg-orange-100 text-orange-800'
      case 'Sales & Marketing':
        return 'bg-purple-100 text-purple-800'
      case 'Finance':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPopularityStars = (popularity: number) => {
    const stars = Math.floor(popularity / 20) // Convert to 1-5 scale
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{template.icon}</span>
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">
              {template.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category */}
        <div className="flex items-center justify-between">
          <Badge className={getCategoryColor(template.category)}>
            {template.category}
          </Badge>
          <div className="flex items-center space-x-1">
            {getPopularityStars(template.popularity)}
            <span className="text-xs text-gray-500 ml-1">
              ({template.popularity}%)
            </span>
          </div>
        </div>

        {/* Trigger and Actions Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Trigger:</span>
            <Badge variant="outline" className="text-xs">
              {safeFormatString(template.trigger.type, 'manual')}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Actions:</span>
            <span className="font-medium">{(template.actions || []).length}</span>
          </div>
        </div>

        {/* Action Preview */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">What it does:</h4>
          <ul className="space-y-1">
            {(template.actions || []).slice(0, 3).map((action) => (
              <li key={action.id} className="text-xs text-gray-600 flex items-start gap-2">
                <Zap className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                <span className="line-clamp-1">{action.name}</span>
              </li>
            ))}
            {(template.actions || []).length > 3 && (
              <li className="text-xs text-gray-500">
                +{(template.actions || []).length - 3} more actions...
              </li>
            )}
          </ul>
        </div>

        {/* Conditions */}
        {template.conditions && (
          <div className="text-xs text-gray-600">
            <span className="font-medium">Conditions:</span>{' '}
            {typeof template.conditions === 'object' && 
             template.conditions && 
             'field' in template.conditions ? (
              <span>
                {String(safeGet(template.conditions, ['field']) || '')} {String(safeGet(template.conditions, ['operator']) || '')} {String(safeGet(template.conditions, ['value']) || '')}
              </span>
            ) : (
              <span>None</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button
            onClick={() => onInstall?.(template)}
            className="flex-1"
            size="sm"
          >
            <Users className="w-4 h-4 mr-1" />
            Use Template
          </Button>
          <Button
            variant="outline"
            onClick={() => onPreview?.(template)}
            size="sm"
          >
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}