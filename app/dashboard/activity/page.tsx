 
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/ui/status-badge'
import { ActivityFeed } from '@/components/activity-feed'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Activity, 
  Filter, 
  Clock, 
  Building2, 
  Calendar,
  RefreshCw,
  CheckCircle,
  TrendingUp
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

interface ActivityFilters {
  type: string
  department: string
  user: string
  dateRange: string
  outcome: string
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isRealtime] = useState(true)
  const [filters, setFilters] = useState<ActivityFilters>({
    type: 'all',
    department: 'all',
    user: 'all',
    dateRange: '24h',
    outcome: 'all'
  })

  const supabase = createClient()
  const itemsPerPage = 20

  const fetchActivities = useCallback(async () => {
    if (currentPage === 1) {
      setLoading(true)
    }
    setError(null)

    try {
      console.log('Activity Feed: Making API call to /api/activity')
      
      const response = await fetch(`/api/activity?${new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        type: filters.type,
        department: filters.department,
        user: filters.user,
        dateRange: filters.dateRange,
        outcome: filters.outcome
      })}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })

      console.log('Activity Feed: API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Activity Feed: API error:', errorText)
        throw new Error(`Failed to fetch activities: ${response.status}`)
      }

      const data = await response.json()
      console.log('Activity Feed: API response data:', data)
      
      if (data.activities && data.activities.length > 0) {
        setActivities(data.activities)
        setTotalPages(data.pagination?.total_pages || 1)
      } else {
        console.log('Activity Feed: No activities in response, using fallback data')
        
        // Use fallback data when no real activities exist
        const fallbackData = getFallbackActivities()
        setActivities(fallbackData)
        setTotalPages(1)
        setError(null) // Clear any previous errors
      }
    } catch (err) {
      console.error('Activity Feed: Error occurred:', err)
      console.log('Activity Feed: Using fallback data due to API error')
      
      // Use fallback data when API fails
      const fallbackData = getFallbackActivities()
      setActivities(fallbackData)
      setTotalPages(1)
      setError('Using demo data - API temporarily unavailable')
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, filters])

  useEffect(() => {
    fetchActivities()
    
    // Set up real-time subscription if enabled
    let subscription: ReturnType<typeof supabase.channel> | null = null
    if (isRealtime) {
      subscription = supabase
        .channel('activity-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'admin_audit_log' },
          () => {
            console.log('Activity feed: Real-time update detected')
            fetchActivities()
          }
        )
        .subscribe()
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [currentPage, filters, isRealtime, fetchActivities, supabase])

  const getFallbackActivities = (): ActivityItem[] => [
    {
      id: '1',
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      event_type: 'order_status_change',
      actor_id: 'user-1',
      actor_email: 'sarah.chen@limn.us.com',
      actor_name: 'Sarah Chen',
      action: 'updated',
      resource_type: 'order',
      resource_id: 'ORD-2025-001',
      details: {
        old_status: 'in_production',
        new_status: 'quality_check',
        order_name: 'Executive Desk - TechFlow Solutions'
      },
      outcome: 'success',
      department: 'production',
      severity: 'low'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
      event_type: 'task_completion',
      actor_id: 'user-2',
      actor_email: 'mike.rodriguez@limn.us.com',
      actor_name: 'Mike Rodriguez',
      action: 'completed',
      resource_type: 'task',
      resource_id: 'task-456',
      details: {
        task_title: 'Design Review - Brand Refresh Project',
        project: 'TechFlow Brand Update',
        completion_time: '2.5 hours'
      },
      outcome: 'success',
      department: 'design',
      severity: 'low'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      event_type: 'document_upload',
      actor_id: 'user-3',
      actor_email: 'emma.wilson@limn.us.com',
      actor_name: 'Emma Wilson',
      action: 'uploaded',
      resource_type: 'document',
      resource_id: 'doc-789',
      details: {
        document_name: 'Quality_Check_Report_Aug_2025.pdf',
        document_type: 'report',
        size_mb: 2.3
      },
      outcome: 'success',
      department: 'quality',
      severity: 'low'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 2700000).toISOString(), // 45 minutes ago
      event_type: 'user_login',
      actor_id: 'user-4',
      actor_email: 'admin@limn.us.com',
      actor_name: 'System Administrator',
      action: 'logged_in',
      resource_type: 'auth',
      resource_id: 'session-abc123',
      details: {
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        location: 'Seattle, WA'
      },
      outcome: 'success',
      department: 'admin',
      severity: 'low'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      event_type: 'design_approval',
      actor_id: 'user-5',
      actor_email: 'jennifer.martinez@limn.us.com',
      actor_name: 'Jennifer Martinez',
      action: 'approved',
      resource_type: 'design',
      resource_id: 'design-321',
      details: {
        design_title: 'Coastal Retail Store Layout',
        project: 'Coastal Retail Group - Q3 Expansion',
        approval_notes: 'Looks great, ready for production'
      },
      outcome: 'success',
      department: 'design',
      severity: 'medium'
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
      event_type: 'production_stage_update',
      actor_id: 'user-6',
      actor_email: 'carlos.martinez@limn.us.com',
      actor_name: 'Carlos Martinez',
      action: 'updated',
      resource_type: 'production_item',
      resource_id: 'prod-555',
      details: {
        item_name: 'Oak Conference Table - 12 Person',
        old_stage: 'assembly',
        new_stage: 'finishing',
        estimated_completion: '2025-09-03'
      },
      outcome: 'success',
      department: 'production',
      severity: 'low'
    },
    {
      id: '7',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      event_type: 'order_creation',
      actor_id: 'user-7',
      actor_email: 'sales@limn.us.com',
      actor_name: 'Sales Team',
      action: 'created',
      resource_type: 'order',
      resource_id: 'ORD-2025-007',
      details: {
        customer_name: 'Metro Logistics',
        order_value: 85000,
        items_count: 12,
        expected_delivery: '2025-09-20'
      },
      outcome: 'success',
      department: 'sales',
      severity: 'medium'
    }
  ]

  const handleFilterChange = (key: keyof ActivityFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleRefresh = () => {
    fetchActivities()
  }

  const getActivityStats = () => {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 3600000)
    const oneDayAgo = new Date(now.getTime() - 86400000)

    const recentActivity = activities.filter(a => new Date(a.timestamp) > oneHourAgo)
    const todayActivity = activities.filter(a => new Date(a.timestamp) > oneDayAgo)
    const successRate = activities.length > 0 ? 
      Math.round((activities.filter(a => a.outcome === 'success').length / activities.length) * 100) : 100
    const activeDepartments = [...new Set(activities.map(a => a.department).filter(Boolean))].length

    return {
      recentActivity: recentActivity.length,
      todayActivity: todayActivity.length,
      successRate,
      activeDepartments
    }
  }

  const stats = getActivityStats()

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Activity Feed" description="Real-time company activity and audit trail" />
        <LoadingSpinner size="lg" text="Loading activity feed..." className="py-32" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Activity Feed" 
        description="Real-time company activity and audit trail"
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="flex items-center px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm border border-slate-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            
            <StatusBadge variant={isRealtime ? "success" : "neutral"} size="sm">
              {isRealtime ? "Live" : "Static"}
            </StatusBadge>
          </div>
        }
      />

      {error && (
        <Alert variant="error">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Last Hour</p>
                <p className="text-2xl font-bold text-slate-900">{stats.recentActivity}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Success Rate</p>
                <p className="text-2xl font-bold text-slate-900">{stats.successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Departments</p>
                <p className="text-2xl font-bold text-slate-900">{stats.activeDepartments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Activity className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Today</p>
                <p className="text-2xl font-bold text-slate-900">{stats.todayActivity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-600" />
          <label className="text-sm font-medium text-slate-700">Type:</label>
          <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="order_status_change">Order Updates</SelectItem>
              <SelectItem value="task_completion">Task Completions</SelectItem>
              <SelectItem value="design_approval">Design Approvals</SelectItem>
              <SelectItem value="production_stage_update">Production Updates</SelectItem>
              <SelectItem value="document_upload">Document Uploads</SelectItem>
              <SelectItem value="user_login">User Logins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-slate-600" />
          <label className="text-sm font-medium text-slate-700">Department:</label>
          <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-600" />
          <label className="text-sm font-medium text-slate-700">Time:</label>
          <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-slate-600" />
          <label className="text-sm font-medium text-slate-700">Status:</label>
          <Select value={filters.outcome} onValueChange={(value) => handleFilterChange('outcome', value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Recent Activity</span>
            {isRealtime && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No activity found</h3>
              <p className="mt-1 text-sm text-slate-600">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <ActivityFeed activities={activities} />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4">
          <div className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}