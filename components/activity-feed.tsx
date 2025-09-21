'use client'

import { Badge } from '@/components/ui/badge'
import { 
  FileText,
  Package,
  CheckCircle,
  Settings,
  Upload,
  LogIn,
  TrendingUp,
  AlertTriangle,
  Clock,
  Building2
} from 'lucide-react'

interface ActivityItem {
  id: string
  timestamp: string
  event_type: string
  actor_id: string
  actor_email: string
  actor_name?: string
  action: string
  resource_type: string
  resource_id: string
  details: Record<string, unknown>
  outcome: 'success' | 'failure'
  department?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  showAvatars?: boolean
  compact?: boolean
}

export function ActivityFeed({ activities, showAvatars = true, compact = false }: ActivityFeedProps) {
  const getActivityIcon = (eventType: string, outcome: string) => {
    const iconClasses = `w-4 h-4 ${outcome === 'failure' ? 'text-red-600' : 'text-slate-600'}`
    
    switch (eventType) {
      case 'order_status_change':
      case 'order_creation':
        return <Package className={iconClasses} />
      case 'task_completion':
      case 'task_creation':
        return <CheckCircle className={iconClasses} />
      case 'design_approval':
      case 'design_rejection':
        return <FileText className={iconClasses} />
      case 'production_stage_update':
        return <Settings className={iconClasses} />
      case 'document_upload':
        return <Upload className={iconClasses} />
      case 'user_login':
      case 'user_logout':
        return <LogIn className={iconClasses} />
      default:
        return <TrendingUp className={iconClasses} />
    }
  }

  const getActionColor = (action: string, outcome: string) => {
    if (outcome === 'failure') return 'text-red-600'
    
    switch (action) {
      case 'created':
        return 'text-green-600'
      case 'updated':
        return 'text-blue-600'
      case 'completed':
        return 'text-green-600'
      case 'approved':
        return 'text-green-600'
      case 'rejected':
        return 'text-red-600'
      case 'deleted':
        return 'text-red-600'
      default:
        return 'text-slate-600'
    }
  }

  const getDepartmentColor = (department?: string) => {
    switch (department) {
      case 'design':
        return 'bg-purple-100 text-purple-800'
      case 'production':
        return 'bg-blue-100 text-blue-800'
      case 'sales':
        return 'bg-green-100 text-green-800'
      case 'quality':
        return 'bg-yellow-100 text-yellow-800'
      case 'admin':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now.getTime() - time.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    
    return time.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getActivityDescription = (activity: ActivityItem) => {
    const { event_type, action, resource_type, details } = activity
    
    let resourceName: string = (details?.order_name || 
                      details?.task_title || 
                      details?.design_title || 
                      details?.document_name ||
                      details?.item_name ||
                      `${resource_type} ${activity.resource_id}`) as string

    // Truncate long names
    if (resourceName && resourceName.length > 60) {
      resourceName = resourceName.substring(0, 60) + '...'
    }

    switch (event_type) {
      case 'order_status_change':
        return (
          <span>
            {action} order status from <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">{details?.old_status as string}</code> to{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">{details?.new_status as string}</code> for{' '}
            <span className="font-medium">{resourceName}</span>
          </span>
        )
      case 'task_completion':
        return (
          <span>
            {action} task <span className="font-medium">{resourceName}</span>
            {(details?.completion_time as string) && (
              <span className="text-slate-500"> in {details.completion_time as string}</span>
            )}
          </span>
        )
      case 'design_approval':
        return (
          <span>
            {action} design <span className="font-medium">{resourceName}</span>
            {(details?.approval_notes as string) && (
              <span className="text-slate-500"> - &quot;{details.approval_notes as string}&quot;</span>
            )}
          </span>
        )
      case 'production_stage_update':
        return (
          <span>
            moved <span className="font-medium">{resourceName}</span> from{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">{details?.old_stage as string}</code> to{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">{details?.new_stage as string}</code>
          </span>
        )
      case 'document_upload':
        return (
          <span>
            {action} document <span className="font-medium">{resourceName}</span>
            {(details?.size_mb as string) && (
              <span className="text-slate-500"> ({details.size_mb as string} MB)</span>
            )}
          </span>
        )
      case 'order_creation':
        return (
          <span>
            {action} new order for <span className="font-medium">{details?.customer_name as string}</span>
            {(details?.order_value as number) && (
              <span className="text-slate-500"> (${(details.order_value as number).toLocaleString()})</span>
            )}
          </span>
        )
      case 'user_login':
        return (
          <span>
            {action} to the system
            {(details?.location as string) && (
              <span className="text-slate-500"> from {details.location as string}</span>
            )}
          </span>
        )
      default:
        return (
          <span>
            {action} {resource_type} <span className="font-medium">{resourceName}</span>
          </span>
        )
    }
  }

  const getContextInfo = (activity: ActivityItem) => {
    const context: string[] = []
    
    if (activity.details?.project) {
      context.push(activity.details.project as string)
    }
    if (activity.details?.customer_name) {
      context.push(activity.details.customer_name as string)
    }
    if (activity.department) {
      context.push((activity.department || "").charAt(0).toUpperCase() + (activity.department || []).slice(1))
    }
    
    return context.length > 0 ? context.join(' • ') : null
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No activities to display
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <div 
          key={activity.id} 
          className={`flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors ${
            compact ? 'py-2' : 'py-3'
          }`}
        >
          {/* Avatar */}
          {showAvatars && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-700">
                {getUserInitials(activity.actor_name, activity.actor_email)}
              </div>
            </div>
          )}
          
          {/* Activity Icon */}
          <div className="flex-shrink-0 mt-1">
            <div className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center">
              {getActivityIcon(activity.event_type, activity.outcome)}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${compact ? 'leading-5' : 'leading-6'}`}>
                  <span className="font-medium text-slate-900">
                    {activity.actor_name || (activity.actor_email || "").split('@')[0]}
                  </span>
                  <span className={`ml-1 ${getActionColor(activity.action, activity.outcome)}`}>
                    {getActivityDescription(activity)}
                  </span>
                </div>
                
                {/* Context Information */}
                {!compact && getContextInfo(activity) && (
                  <div className="mt-1 text-xs text-slate-500 flex items-center">
                    <Building2 className="w-3 h-3 mr-1" />
                    {getContextInfo(activity)}
                  </div>
                )}
                
                {/* Additional Details */}
                {!compact && activity.details && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activity.department && (
                      <Badge variant="outline" className={getDepartmentColor(activity.department)}>
                        {activity.department}
                      </Badge>
                    )}
                    {activity.severity !== 'low' && (
                      <Badge variant="outline" className={getSeverityColor(activity.severity)}>
                        {activity.severity}
                      </Badge>
                    )}
                    {activity.outcome === 'failure' && (
                      <Badge variant="outline" className="bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {/* Timestamp */}
              <div className="ml-3 flex-shrink-0">
                <div className="text-xs text-slate-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatRelativeTime(activity.timestamp)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}