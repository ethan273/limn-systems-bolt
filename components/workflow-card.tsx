'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Play, 
  Edit, 
  Copy, 
  Trash2, 
  Eye, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Workflow } from '@/app/api/workflows/route'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface WorkflowCardProps {
  workflow: Workflow
  onToggleEnabled?: (id: string, enabled: boolean) => void
  onEdit?: (id: string) => void
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
  onViewLogs?: (id: string) => void
  onExecute?: (id: string) => void
}

export function WorkflowCard({
  workflow,
  onToggleEnabled,
  onEdit,
  onDuplicate,
  onDelete,
  onViewLogs,
  onExecute
}: WorkflowCardProps) {
  const getTriggerIcon = (triggerType: string | undefined) => {
    switch (triggerType) {
      case 'order_created':
        return '📦'
      case 'status_change':
        return '🔄'
      case 'schedule':
        return '⏰'
      case 'payment_received':
        return '💰'
      case 'production_delayed':
        return '⚠️'
      case 'customer_risk_score_change':
        return '🚨'
      default:
        return '🔔'
    }
  }

  const getStatusColor = (successRate: number) => {
    if (successRate >= 95) return 'text-green-600'
    if (successRate >= 85) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatLastRun = (lastRun?: string) => {
    if (!lastRun) return 'Never'
    
    const now = new Date()
    const runTime = new Date(lastRun)
    const diffMs = now.getTime() - runTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Recently'
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">{getTriggerIcon(workflow.trigger_type || 'manual')}</span>
              {workflow.name}
            </CardTitle>
            <p className="text-sm text-gray-600">{workflow.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={workflow.enabled}
              onCheckedChange={(checked) => onToggleEnabled?.(workflow.id, checked)}
            />
            <Badge variant={workflow.enabled ? "default" : "secondary"}>
              {workflow.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trigger and Actions Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">Trigger:</span>
            <Badge variant="outline">
              {safeFormatString(workflow.trigger_type, 'manual')}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">Actions:</span>
            <span className="font-medium">{(workflow.actions || []).length}</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-3 border-t border-b">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {workflow.statistics.runs_today}
            </div>
            <div className="text-xs text-gray-500">Runs Today</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getStatusColor(workflow.statistics.success_rate)}`}>
              {workflow.statistics.success_rate}%
            </div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {formatDuration(workflow.statistics.avg_duration_ms)}
            </div>
            <div className="text-xs text-gray-500">Avg Time</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-700">
              {workflow.statistics.total_runs || 0}
            </div>
            <div className="text-xs text-gray-500">Total Runs</div>
          </div>
        </div>

        {/* Last Run */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">Last run:</span>
            <span>{formatLastRun(workflow.statistics.last_run)}</span>
          </div>
          <div className="flex items-center space-x-1">
            {workflow.statistics.success_rate >= 95 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : workflow.statistics.success_rate >= 85 ? (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExecute?.(workflow.id)}
              disabled={!workflow.enabled}
            >
              <Play className="w-4 h-4 mr-1" />
              Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewLogs?.(workflow.id)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Logs
            </Button>
          </div>
          
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(workflow.id)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate?.(workflow.id)}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(workflow.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}