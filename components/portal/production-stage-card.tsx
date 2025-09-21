'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, CheckCircle2, Circle } from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatProductionTime } from '@/lib/production/calculations'

interface ProductionStageCardProps {
  stage: string
  status: 'completed' | 'in-progress' | 'pending'
  progress: number
  startedAt?: string
  completedAt?: string
  itemCount: number
  notes?: string
  icon: LucideIcon
  color: string
  lightColor: string
  textColor: string
  isExpanded?: boolean
  onToggle?: () => void
  compact?: boolean
}

export function ProductionStageCard({
  stage,
  status,
  progress,
  startedAt,
  completedAt,
  itemCount,
  notes,
  icon: Icon,
  color,
  lightColor,
  textColor,
  isExpanded = false,
  onToggle,
  compact = false
}: ProductionStageCardProps) {
  const [localExpanded, setLocalExpanded] = useState(false)
  const expanded = onToggle ? isExpanded : localExpanded
  
  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setLocalExpanded(!localExpanded)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'in-progress':
        return <Circle className="w-4 h-4 text-blue-600 animate-pulse" />
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'in-progress':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'pending':
        return 'text-gray-500 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200'
    }
  }

  const getProgressBarColor = () => {
    if (progress === 0) return 'bg-gray-200'
    if (progress < 30) return 'bg-red-400'
    if (progress < 60) return 'bg-yellow-400'
    if (progress < 90) return 'bg-blue-400'
    return 'bg-green-400'
  }

  if (compact) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className={`
          relative w-12 h-12 rounded-full flex items-center justify-center
          transition-all duration-300
          ${status === 'completed' ? color + ' text-white shadow-md' :
            status === 'in-progress' ? lightColor + ' ' + textColor + ' border-2 border-current shadow-sm animate-pulse' :
            'bg-gray-200 text-gray-400'}
        `}>
          <Icon className="w-5 h-5" />
          {status === 'in-progress' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
          )}
        </div>
        
        <div className="text-center">
          <div className={`text-xs font-medium ${status === 'pending' ? 'text-gray-500' : textColor}`}>
            {stage}
          </div>
          {progress > 0 && (
            <div className="text-xs font-semibold text-gray-700 mt-1">
              {progress}%
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div 
        className={`p-4 cursor-pointer transition-colors ${expanded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${status === 'completed' ? color + ' text-white' :
                status === 'in-progress' ? lightColor + ' ' + textColor :
                'bg-gray-200 text-gray-400'}
            `}>
              <Icon className="w-5 h-5" />
            </div>
            
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-[#4b4949]">{stage}</h4>
                {getStatusIcon()}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className={getStatusColor()}>
                  {status === 'completed' ? 'Complete' :
                   status === 'in-progress' ? 'In Progress' :
                   'Pending'}
                </Badge>
                
                {itemCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-[#4b4949]">{progress}%</div>
            {onToggle && (
              <div className="mt-1">
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            )}
          </div>
        </div>

        {progress > 0 && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="space-y-3">
            {startedAt && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Started: {formatProductionTime(startedAt)}</span>
              </div>
            )}
            
            {completedAt && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Completed: {formatProductionTime(completedAt)}</span>
              </div>
            )}
            
            {notes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 mb-1">Notes</h5>
                <p className="text-sm text-gray-700">{notes}</p>
              </div>
            )}
            
            {status === 'in-progress' && !notes && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  This stage is currently in progress. Updates will appear here as work continues.
                </p>
              </div>
            )}
            
            {status === 'pending' && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  This stage is scheduled to begin after the previous stages are completed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}