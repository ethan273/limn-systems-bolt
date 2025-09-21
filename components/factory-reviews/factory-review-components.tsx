import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Camera,
  FileText,
  AlertTriangle,
  CheckCircle2,
  User,
  Ruler,
  Eye,
  Download,
  Edit
} from 'lucide-react'

// ============================================================================
// STATUS BADGES
// ============================================================================

interface StatusBadgeProps {
  status: string
  className?: string
}

export const ReviewStatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-amber-100 text-amber-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'in_review': return 'bg-blue-100 text-blue-800'
      case 'changes_requested': return 'bg-orange-100 text-orange-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Badge className={`${getStatusColor(status)} ${className}`}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

export const PriorityBadge: React.FC<StatusBadgeProps> = ({ status: priority, className = '' }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <Badge variant="outline" className={`${getPriorityColor(priority)} ${className}`}>
      {priority.toUpperCase()}
    </Badge>
  )
}

export const SeverityBadge: React.FC<StatusBadgeProps> = ({ status: severity, className = '' }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'major': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'minor': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <Badge variant="outline" className={`${getSeverityColor(severity)} ${className}`}>
      {severity.toUpperCase()}
    </Badge>
  )
}

// ============================================================================
// COMMENT COMPONENTS
// ============================================================================

interface ReviewCommentProps {
  comment: {
    id: string
    type: 'change_request' | 'approval' | 'measurement' | 'general'
    severity: 'minor' | 'major' | 'critical'
    category: string
    comment: string
    photos?: string[]
    measurements?: {
      expected: string
      actual: string
      tolerance: string
    }
    created_by: string
    created_at: string
    status: 'open' | 'resolved' | 'approved'
  }
  onEdit?: (commentId: string) => void
  onResolve?: (commentId: string) => void
}

export const ReviewComment: React.FC<ReviewCommentProps> = ({ comment, onEdit, onResolve }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'change_request': return <AlertTriangle className="w-4 h-4" />
      case 'approval': return <CheckCircle2 className="w-4 h-4" />
      case 'measurement': return <Ruler className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="border border-gray-200 rounded-md p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getTypeIcon(comment.type)}
          <SeverityBadge status={comment.severity} />
          <Badge variant="outline" className="text-xs">
            {comment.category}
          </Badge>
        </div>
        <span className="text-xs text-gray-500">
          {new Date(comment.created_at).toLocaleString()}
        </span>
      </div>

      <p className="text-sm text-gray-900 mb-3">{comment.comment}</p>

      {comment.measurements && (
        <div className="bg-gray-50 rounded p-3 mb-3 text-sm">
          <h4 className="font-medium mb-2">Measurements</h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div><strong>Expected:</strong> {comment.measurements.expected}</div>
            <div><strong>Actual:</strong> {comment.measurements.actual}</div>
            <div><strong>Tolerance:</strong> {comment.measurements.tolerance}</div>
          </div>
        </div>
      )}

      {comment.photos && comment.photos.length > 0 && (
        <div className="flex space-x-2 mb-3">
          {comment.photos.map((photo, index) => (
            <div key={index} className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center">
              <Camera className="w-6 h-6 text-gray-400" />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <User className="w-4 h-4" />
          <span>By {comment.created_by}</span>
          <ReviewStatusBadge status={comment.status} className="text-xs" />
        </div>
        
        <div className="flex space-x-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(comment.id)}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
          {onResolve && comment.status === 'open' && (
            <Button size="sm" onClick={() => onResolve(comment.id)}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Resolve
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PROTOTYPE CARD
// ============================================================================

interface PrototypeCardProps {
  prototype: {
    id: string
    name: string
    order_number: string
    item_code: string
    review_status: string
    priority: string
    shop_drawing_version: string
    completion_percentage: number
    assigned_reviewer: string
    last_updated: string
  }
  onViewDetails?: (id: string) => void
  onStartReview?: (id: string) => void
  compact?: boolean
}

export const PrototypeCard: React.FC<PrototypeCardProps> = ({ 
  prototype, 
  onViewDetails, 
  onStartReview,
  compact = false 
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (compact) {
    return (
      <div className="border border-gray-200 rounded-md p-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{prototype.name}</h4>
            <div className="text-sm text-gray-600">{prototype.order_number}</div>
          </div>
          <div className="flex items-center space-x-2">
            <ReviewStatusBadge status={prototype.review_status} />
            <PriorityBadge status={prototype.priority} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{prototype.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Order: {prototype.order_number}</span>
                <span>Item Code: {prototype.item_code}</span>
                <span>Drawing: {prototype.shop_drawing_version}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ReviewStatusBadge status={prototype.review_status} />
              <PriorityBadge status={prototype.priority} />
              <span className="text-sm text-gray-600">
                Assigned to: {prototype.assigned_reviewer}
              </span>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="text-sm text-gray-600">
              {prototype.completion_percentage}% complete
            </div>
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${prototype.completion_percentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              Updated: {formatDate(prototype.last_updated)}
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button variant="outline" size="sm" onClick={() => onViewDetails(prototype.id)}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            )}
            {onStartReview && (
              <Button size="sm" onClick={() => onStartReview(prototype.id)}>
                {prototype.review_status === 'pending' ? (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Start Review
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Continue Review
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SESSION SUMMARY CARD
// ============================================================================

interface SessionSummaryProps {
  session: {
    id: string
    session_name: string
    factory_name: string
    scheduled_date: string
    status: string
    prototype_count: number
    reviewed_count: number
    participants: string[]
  }
  onViewSession?: (id: string) => void
  onContinueSession?: (id: string) => void
}

export const SessionSummaryCard: React.FC<SessionSummaryProps> = ({ 
  session, 
  onViewSession, 
  onContinueSession 
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{session.session_name}</CardTitle>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span>{session.factory_name}</span>
              <span>{formatDate(session.scheduled_date)}</span>
              <span>{session.participants.length} participants</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ReviewStatusBadge status={session.status} />
            {session.status === 'in_progress' && (
              <div className="text-sm text-gray-600">
                {session.reviewed_count}/{session.prototype_count} reviewed
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Review Progress</span>
              <span>{Math.round((session.reviewed_count / session.prototype_count) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(session.reviewed_count / session.prototype_count) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            {session.status === 'scheduled' && (
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Offline Package
              </Button>
            )}
            {onViewSession && (
              <Button variant="outline" size="sm" onClick={() => onViewSession(session.id)}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            )}
            {onContinueSession && session.status === 'in_progress' && (
              <Button size="sm" onClick={() => onContinueSession(session.id)}>
                <Edit className="w-4 h-4 mr-2" />
                Continue Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// PROGRESS INDICATORS
// ============================================================================

interface ProgressRingProps {
  percentage: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ 
  percentage, 
  size = 'md', 
  showLabel = true,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  }

  const radius = size === 'sm' ? 18 : size === 'md' ? 28 : 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-600 transition-all duration-300"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-900">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// METRIC CARDS
// ============================================================================

interface MetricCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
    timeframe: string
  }
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = ''
}) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {value}
        </div>
        {subtitle && (
          <div className="text-sm text-gray-600">{subtitle}</div>
        )}
        {trend && (
          <div className="text-xs text-gray-500 mt-2">
            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            {' '}vs {trend.timeframe}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SHOP DRAWING VIEWER
// ============================================================================

interface ShopDrawingViewerProps {
  drawingUrl: string
  version: string
  annotations?: Array<{
    id: string
    x: number
    y: number
    comment: string
    severity: 'minor' | 'major' | 'critical'
  }>
  onAnnotationClick?: (annotationId: string) => void
  onDrawingClick?: (x: number, y: number) => void
  isAnnotating?: boolean
  className?: string
}

export const ShopDrawingViewer: React.FC<ShopDrawingViewerProps> = ({
  drawingUrl,
  version,
  annotations = [],
  onAnnotationClick,
  onDrawingClick,
  isAnnotating = false,
  className = ''
}) => {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating || !onDrawingClick) return
    
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    
    onDrawingClick(x, y)
  }

  return (
    <div className={`relative bg-gray-100 rounded-md overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
        <div className="text-sm font-medium text-gray-900">
          Shop Drawing {version}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
      
      <div 
        className={`relative w-full h-full min-h-[400px] ${
          isAnnotating ? 'cursor-crosshair' : 'cursor-default'
        }`}
        onClick={handleClick}
        style={{
          backgroundImage: `url("${drawingUrl}")`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      >
        {/* Annotation markers */}
        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white cursor-pointer transform hover:scale-110 transition-transform z-10"
            style={{
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              backgroundColor: annotation.severity === 'critical' ? '#ef4444' : 
                             annotation.severity === 'major' ? '#f97316' : '#3b82f6'
            }}
            title={annotation.comment}
            onClick={(e) => {
              e.stopPropagation()
              onAnnotationClick?.(annotation.id)
            }}
          />
        ))}
        
        {isAnnotating && (
          <div className="absolute top-4 left-4 bg-blue-50 border border-blue-200 rounded-md p-2 text-xs text-blue-800">
            Click on the drawing to add an annotation
          </div>
        )}
      </div>
    </div>
  )
}

const FactoryReviewComponents = {
  ReviewStatusBadge,
  PriorityBadge,
  SeverityBadge,
  ReviewComment,
  PrototypeCard,
  SessionSummaryCard,
  ProgressRing,
  MetricCard,
  ShopDrawingViewer
};

export default FactoryReviewComponents;
