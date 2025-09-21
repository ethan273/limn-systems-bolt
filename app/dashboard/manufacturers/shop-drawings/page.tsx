'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  FileImage, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  MessageSquare,
  Search,
  // Filter, - removed unused
  Download,
  Eye,
  RotateCcw,
  Calendar,
  User,
  Building2
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface ShopDrawing {
  id: string
  project_name: string
  manufacturer_name: string
  manufacturer_id: string
  item_name: string
  drawing_type: 'prototype' | 'production' | 'revision'
  status: 'pending_review' | 'under_review' | 'revision_requested' | 'approved' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  submitted_date: string
  review_deadline: string
  reviewer: string
  revision_count: number
  file_url?: string
  thumbnail_url?: string
  comments_count: number
  latest_comment?: string
  estimated_cost_impact?: number
  timeline_impact_days?: number
}

export default function ShopDrawingsPage() {
  const [shopDrawings, setShopDrawings] = useState<ShopDrawing[]>([])
  const [filteredDrawings, setFilteredDrawings] = useState<ShopDrawing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  // const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null) - removed unused

  const applyFilters = useCallback(() => {
    let filtered = [...shopDrawings]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(drawing => drawing.status === statusFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(drawing => drawing.priority === priorityFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(drawing =>
        (drawing.project_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (drawing.manufacturer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (drawing.item_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (drawing.reviewer || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredDrawings(filtered)
  }, [shopDrawings, searchTerm, statusFilter, priorityFilter])

  useEffect(() => {
    loadShopDrawings()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [shopDrawings, searchTerm, statusFilter, priorityFilter, applyFilters])

  const loadShopDrawings = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Try to fetch shop drawings from database
      const { data, error } = await supabase
        .from('shop_drawings')
        .select(`
          *,
          manufacturer:manufacturers!inner(name),
          project:manufacturer_projects(project_name, item_name),
          comments:shop_drawing_comments(count)
        `)
        .order('review_deadline', { ascending: true })

      if (error) {
        console.error('Database error:', error.message || error.code)
        setShopDrawings([])
      } else if (data && data.length > 0) {
        setShopDrawings(data)
        setLoading(false)
        return
      } else {
        setShopDrawings([])
      }
    } catch (error) {
      console.error('Error fetching shop drawings:', error)
      setShopDrawings([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_review: 'bg-amber-100 text-amber-800',
      under_review: 'bg-blue-100 text-blue-800',
      revision_requested: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.pending_review
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />
      case 'rejected': return <AlertTriangle className="w-4 h-4" />
      case 'revision_requested': return <RotateCcw className="w-4 h-4" />
      case 'under_review': return <Eye className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-slate-900',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-amber-100 text-amber-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[priority] || colors.medium
  }

  const getDeadlineStatus = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntil < 0) return { status: 'overdue', text: 'Overdue', color: 'text-red-600' }
    if (daysUntil === 0) return { status: 'today', text: 'Due Today', color: 'text-amber-600' }
    if (daysUntil <= 2) return { status: 'soon', text: `${daysUntil} days`, color: 'text-amber-600' }
    return { status: 'ok', text: `${daysUntil} days`, color: 'text-slate-900' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Calculate stats
  const stats = {
    totalDrawings: shopDrawings.length,
    pendingReview: shopDrawings.filter(d => d.status === 'pending_review').length,
    underReview: shopDrawings.filter(d => d.status === 'under_review').length,
    overdue: shopDrawings.filter(d => new Date(d.review_deadline) < new Date()).length
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-stone-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-stone-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Shop Drawings</h1>
          <p className="text-slate-900 text-lg mt-1">Review and approve manufacturing drawings</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Review
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <FileImage className="w-4 h-4 mr-2" />
              Total Drawings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalDrawings}</div>
            <div className="text-sm text-primary">All submissions</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.pendingReview}</div>
            <div className="text-sm text-amber">Awaiting action</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              Under Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.underReview}</div>
            <div className="text-sm text-primary">In progress</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.overdue}</div>
            <div className="text-sm text-red-600">Past deadline</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-900 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search drawings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="revision_requested">Revision Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shop Drawings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Review Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Revisions</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrawings.map((drawing, index) => {
                  const deadline = getDeadlineStatus(drawing.review_deadline)
                  return (
                    <TableRow key={drawing.id || `drawing-${index}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">{drawing.project_name}</div>
                          <div className="text-sm text-slate-900">{drawing.item_name}</div>
                          <div className="text-xs text-slate-900 capitalize">{drawing.drawing_type}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(drawing.status)}`}>
                          {getStatusIcon(drawing.status)}
                          <span className="ml-1">{safeFormatString(drawing.status, 'pending')}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(drawing.priority)}`}>
                          {(drawing.priority || "").toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-slate-900" />
                          <span className="text-slate-700">{drawing.manufacturer_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-slate-900" />
                          <span className="text-slate-700">{drawing.reviewer}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className={deadline.color}>{deadline.text}</div>
                          <div className="text-xs text-slate-900">
                            {formatDate(drawing.review_deadline)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <RotateCcw className="w-4 h-4 mr-1 text-slate-900" />
                          <span className="text-slate-700">{drawing.revision_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {drawing.estimated_cost_impact && drawing.estimated_cost_impact !== 0 && (
                            <div className={`text-sm ${drawing.estimated_cost_impact > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {drawing.estimated_cost_impact > 0 ? '+' : ''}${drawing.estimated_cost_impact}
                            </div>
                          )}
                          {drawing.timeline_impact_days && drawing.timeline_impact_days > 0 && (
                            <div className="text-xs text-amber-600">
                              +{drawing.timeline_impact_days} days
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredDrawings.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileImage className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No shop drawings found</h3>
            <p className="text-slate-900">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Shop drawings will appear here when submitted by manufacturers'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}