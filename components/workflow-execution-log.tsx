'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Play,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw
} from 'lucide-react'
import { useState } from 'react'

export interface WorkflowExecution {
  id: string
  template_id: string
  template_name?: string
  trigger_data: unknown
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial'
  started_at: string
  completed_at?: string
  error_message?: string
  actions_completed: unknown[]
  duration_ms?: number
}

interface WorkflowExecutionLogProps {
  execution: WorkflowExecution
  onRerun?: (executionId: string) => void
  onViewDetails?: (executionId: string) => void
}

export function WorkflowExecutionLog({
  execution,
  onRerun,
  onViewDetails
}: WorkflowExecutionLogProps) {
  const [expanded, setExpanded] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'partial':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'running':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'pending':
        return 'text-gray-700 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getTriggerSummary = (triggerData: unknown) => {
    if (safeGet(triggerData, ['order'])) {
      const order = safeGet(triggerData, ['order'])
      return `Order ${safeGet(order, ['number']) || safeGet(order, ['id']) || 'Unknown'}`
    }
    if (safeGet(triggerData, ['customer'])) {
      const customer = safeGet(triggerData, ['customer'])
      return `Customer ${safeGet(customer, ['name']) || safeGet(customer, ['id']) || 'Unknown'}`
    }
    return 'System trigger'
  }

  return (
    <Card className="mb-4">
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            {getStatusIcon(execution.status)}
            <div>
              <CardTitle className="text-base">
                {execution.template_name || 'Unknown Workflow'}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Triggered by {getTriggerSummary(execution.trigger_data)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right text-sm">
              <div className="text-gray-500">
                {formatTimestamp(execution.started_at)}
              </div>
              <div className="font-medium">
                {formatDuration(execution.duration_ms)}
              </div>
            </div>
            
            <Badge 
              variant="outline"
              className={`${getStatusColor(execution.status)} capitalize`}
            >
              {execution.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t">
          <div className="space-y-4">
            {/* Execution Timeline */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Execution Timeline</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Started:</span>
                  <span>{formatTimestamp(execution.started_at)}</span>
                </div>
                {execution.completed_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Completed:</span>
                    <span>{formatTimestamp(execution.completed_at)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span>{formatDuration(execution.duration_ms)}</span>
                </div>
              </div>
            </div>

            {/* Actions Completed */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Actions ({(execution.actions_completed || []).length} completed)
              </h4>
              <div className="space-y-1">
                {(execution.actions_completed || []).map((actionId, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>Action {String(actionId)} completed</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {execution.error_message && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2">Error Details</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{execution.error_message}</p>
                </div>
              </div>
            )}

            {/* Trigger Data */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Trigger Data</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(execution.trigger_data, null, 2)}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(execution.id)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Full Details
              </Button>
              {(execution.status === 'failed' || execution.status === 'partial') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRerun?.(execution.id)}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Rerun
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}