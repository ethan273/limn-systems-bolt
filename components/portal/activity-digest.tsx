'use client'
 

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Download, Activity, User, FileText, Package, CreditCard, Truck, CheckSquare, Eye, EyeOff } from 'lucide-react'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'

interface ActivityItem {
  id: string
  activity_type: string
  entity_type: string
  entity_id: string
  description: string
  metadata: unknown
  created_at: string
}

interface ActivityGroup {
  date: string
  activities: ActivityItem[]
}

const ACTIVITY_TYPES = [
  { key: 'order_created', label: 'Order Created', icon: <Package className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'order_updated', label: 'Order Updated', icon: <Package className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'production_stage_change', label: 'Production Progress', icon: <Activity className="w-4 h-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'payment_received', label: 'Payment Received', icon: <CreditCard className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'document_uploaded', label: 'Document Uploaded', icon: <FileText className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800' },
  { key: 'document_downloaded', label: 'Document Downloaded', icon: <FileText className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800' },
  { key: 'design_approved', label: 'Design Approved', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-orange-100 text-orange-800' },
  { key: 'design_rejected', label: 'Design Rejected', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-red-100 text-red-800' },
  { key: 'shipment_created', label: 'Shipment Created', icon: <Truck className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { key: 'shipment_updated', label: 'Shipment Updated', icon: <Truck className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { key: 'message_sent', label: 'Message Sent', icon: <User className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800' },
  { key: 'login', label: 'Portal Access', icon: <Eye className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800' },
  { key: 'settings_updated', label: 'Settings Updated', icon: <User className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800' }
]

const DATE_RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'custom', label: 'Custom Range' }
]

function ActivityIcon({ activityType }: { activityType: string }) {
  const activityConfig = ACTIVITY_TYPES.find(type => type.key === activityType)
  return activityConfig ? activityConfig.icon : <Activity className="w-4 h-4" />
}

function ActivityBadge({ activityType }: { activityType: string }) {
  const activityConfig = ACTIVITY_TYPES.find(type => type.key === activityType)
  if (!activityConfig) return null
  
  return (
    <Badge variant="secondary" className={`text-xs ${activityConfig.color}`}>
      {activityConfig.label}
    </Badge>
  )
}

interface ActivityItemProps {
  activity: ActivityItem
  showDetails: boolean
}

function ActivityItemComponent({ activity, showDetails }: ActivityItemProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getEntityDetails = () => {
    const metadata = safeGet(activity, ['metadata'])
    switch (safeGet(activity, ['entity_type'])) {
      case 'order':
        return String(safeGet(metadata, ['order_number']) || `Order ${String(safeGet(activity, ['entity_id']) || '').slice(0, 8)}`)
      case 'document':
        return String(safeGet(metadata, ['document_name']) || `Document ${String(safeGet(activity, ['entity_id']) || '').slice(0, 8)}`)
      case 'payment':
        return safeGet(metadata, ['amount']) ? `$${String(safeGet(metadata, ['amount']) || '0')}` : `Payment ${String(safeGet(activity, ['entity_id']) || '').slice(0, 8)}`
      case 'shipment':
        return String(safeGet(metadata, ['tracking_number']) || `Shipment ${String(safeGet(activity, ['entity_id']) || '').slice(0, 8)}`)
      default:
        return String(safeGet(activity, ['entity_id']) || '').slice(0, 8)
    }
  }

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-full bg-[#91bdbd]/10 flex items-center justify-center">
          <ActivityIcon activityType={activity.activity_type} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <ActivityBadge activityType={activity.activity_type} />
            <span className="text-sm text-gray-500">{formatTime(activity.created_at)}</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-900 mb-1">
          {activity.description}
        </p>
        
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>{activity.entity_type}</span>
          <span>•</span>
          <span>{getEntityDetails()}</span>
        </div>
        
        {showDetails && activity.metadata && Object.keys(activity.metadata).length > 0 ? (
          <details className="mt-2">
            <summary className="text-xs text-[#91bdbd] cursor-pointer hover:text-[#7da9a9]">
              View Details
            </summary>
            <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
              <pre className="whitespace-pre-wrap text-gray-600">
                {JSON.stringify(activity.metadata, null, 2)}
              </pre>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  )
}

export function ActivityDigest() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('week')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [activityTypeFilters, setActivityTypeFilters] = useState<string[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingCSV, setExportingCSV] = useState(false)
  
  const supabase = createClient()

  const getDateRange = useCallback(() => {
    const now = new Date()
    let startDate: Date
    const endDate = new Date(now)

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3))
        break
      case 'custom':
        if (customDateStart && customDateEnd) {
          return { startDate: new Date(customDateStart), endDate: new Date(customDateEnd) }
        }
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      default:
        startDate = new Date(now.setDate(now.getDate() - 7))
    }

    return { startDate, endDate }
  }, [dateRange, customDateStart, customDateEnd])

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        return
      }

      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!customer) {
        setError('Customer not found')
        return
      }

      // Calculate date range
      const { startDate, endDate } = getDateRange()

      // Build query
      let query = supabase
        .from('activity_log')
        .select('*')
        .eq('customer_id', customer.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      // Apply activity type filters
      if (activityTypeFilters.length > 0) {
        query = query.in('activity_type', activityTypeFilters)
      }

      const { data: activityData, error: activityError } = await query

      if (activityError) {
        setError(activityError.message)
        return
      }

      setActivities(activityData || [])

    } catch (err) {
      console.error('Error loading activities:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [activityTypeFilters, supabase, getDateRange])

  useEffect(() => {
    loadActivities()
  }, [dateRange, customDateStart, customDateEnd, activityTypeFilters, loadActivities])


  const groupActivitiesByDate = (activities: ActivityItem[]): ActivityGroup[] => {
    const groups: { [key: string]: ActivityItem[] } = {}
    
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
    })

    return Object.entries(groups)
      .map(([date, activities]) => ({ date, activities }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const handleActivityTypeFilter = (activityType: string, checked: boolean) => {
    if (checked) {
      setActivityTypeFilters(prev => [...prev, activityType])
    } else {
      setActivityTypeFilters(prev => prev.filter(type => type !== activityType))
    }
  }

  const exportToPDF = async () => {
    setExportingPDF(true)
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setExportingPDF(false)
    
    // In a real implementation, you would generate and download a PDF
    const blob = new Blob(['PDF content would go here'], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-digest-${new Date().toISOString().split('T')[0]}.pdf`
    a.click()
  }

  const exportToCSV = async () => {
    setExportingCSV(true)
    
    // Create CSV content
    const headers = ['Date', 'Time', 'Type', 'Entity', 'Description']
    const csvContent = [
      headers.join(','),
      ...activities.map(activity => [
        new Date(activity.created_at).toLocaleDateString(),
        new Date(activity.created_at).toLocaleTimeString(),
        activity.activity_type,
        activity.entity_type,
        `"${(activity.description || "").replace(/"/g, '""')}"` // Escape quotes in CSV
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-digest-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    
    setExportingCSV(false)
  }

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  const activityGroups = groupActivitiesByDate(activities)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <div className="text-sm text-gray-500">Loading activity...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#4b4949]">Activity Digest</h2>
          <p className="text-gray-600 mt-1">
            Your recent account activity and timeline.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exportingCSV || activities.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {exportingCSV ? 'Exporting...' : 'CSV'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={exportingPDF || activities.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {exportingPDF ? 'Exporting...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Label>Date Range:</Label>
            </div>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map(range => (
                  <SelectItem key={range.key} value={range.key}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {dateRange === 'custom' && (
              <div className="flex items-center space-x-2">
                <Input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="w-40"
                />
                <span className="text-gray-500">to</span>
                <Input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>

          {/* Activity Type Filters */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Activity Types:</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {ACTIVITY_TYPES.map(activityType => (
                <div key={activityType.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={activityType.key}
                    checked={activityTypeFilters.includes(activityType.key)}
                    onCheckedChange={(checked) => handleActivityTypeFilter(activityType.key, !!checked)}
                  />
                  <Label
                    htmlFor={activityType.key}
                    className="text-sm flex items-center space-x-1"
                  >
                    {activityType.icon}
                    <span>{activityType.label}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      {error ? (
        <div className="text-center py-8">
          <div className="text-red-600">Error loading activity: {error}</div>
        </div>
      ) : activityGroups.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <div className="text-lg text-gray-500 mb-2">No activity found</div>
          <div className="text-sm text-gray-400">
            Try adjusting your date range or activity type filters.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {activityGroups.map((group) => (
            <Card key={group.date}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-[#91bdbd]" />
                  {formatDateHeader(group.date)}
                  <Badge variant="secondary" className="ml-2">
                    {(group.activities || []).length} {(group.activities || []).length === 1 ? 'activity' : 'activities'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-96">
                  <div className="space-y-1">
                    {(group.activities || []).map((activity) => (
                      <ActivityItemComponent
                        key={activity.id}
                        activity={activity}
                        showDetails={showDetails}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}