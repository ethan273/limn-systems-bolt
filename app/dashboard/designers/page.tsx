'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { safeFormatString } from '@/lib/utils/string-helpers'
import { QuickAddDesigner } from '@/components/designers/QuickAddDesigner'
import { PageLoading } from '@/components/ui/enhanced-loading-states'
import { 
  Users, 
  Star, 
  Palette, 
  CheckCircle, 
  Clock,
  Eye,
  MoreHorizontal,
  Search,
  Filter,
  // Plus removed - not used
  Briefcase,
  Award
} from 'lucide-react'
import { DesignerDashboardData } from '@/types/designer'

export default function DesignersPage() {
  const [designers, setDesigners] = useState<DesignerDashboardData[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<DesignerDashboardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')

  const loadDesigners = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch real designers data from API
      const response = await fetch('/api/designers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setDesigners(result.data)
          setError('')
          console.log(`Loaded ${result.data.length} designers from API`)
          return
        }
      }

      // If API fails or returns no data, set empty array with helpful error message
      console.log('Designers API returned no data or failed - check if designer_dashboard view exists')
      setDesigners([])
      setError('No designers data available. Check if designer_dashboard view exists and contains data.')
    } catch (err) {
      console.error('Error fetching designers:', err)
      setError(`Failed to load designers: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setDesigners([])
    } finally {
      setLoading(false)
    }
  }, [])

  const applyFilters = useCallback(() => {
    let filtered = Array.isArray(designers) ? [...designers] : []

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(designer => 
        (designer.name || "").toLowerCase().includes(term) ||
        designer.company_name?.toLowerCase().includes(term) ||
        (designer.contact_email || "").toLowerCase().includes(term) ||
        designer.specialties.some(s => s.toLowerCase().includes(term))
      )
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(designer => designer.status === statusFilter)
    }

    if (specialtyFilter && specialtyFilter !== 'all') {
      filtered = filtered.filter(designer => 
        (designer.specialties || "").includes(specialtyFilter)
      )
    }

    if (ratingFilter && ratingFilter !== 'all') {
      const minRating = parseFloat(ratingFilter)
      filtered = filtered.filter(designer => 
        designer.rating && designer.rating >= minRating
      )
    }

    setFilteredDesigners(filtered)
  }, [designers, searchTerm, statusFilter, specialtyFilter, ratingFilter])

  useEffect(() => {
    loadDesigners()
  }, [loadDesigners])

  useEffect(() => {
    applyFilters()
  }, [designers, searchTerm, statusFilter, specialtyFilter, ratingFilter, applyFilters])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'prospect': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'active': return 'bg-green-100 text-green-800 border-green-300'
      case 'preferred': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'inactive': return 'bg-gray-100 text-slate-900 border-gray-300'
      default: return 'bg-gray-100 text-slate-900 border-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preferred': return <Award className="h-3 w-3" />
      case 'active': return <CheckCircle className="h-3 w-3" />
      case 'on_hold': return <Clock className="h-3 w-3" />
      default: return <Users className="h-3 w-3" />
    }
  }

  const renderStarRating = (rating?: number) => {
    if (!rating) return <span className="text-sm text-slate-600">No rating</span>
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-slate-600">({rating.toFixed(1)})</span>
      </div>
    )
  }

  const formatPercentage = (value?: number) => {
    return value ? `${Math.round(value)}%` : 'N/A'
  }

  // Calculate dashboard stats
  const totalDesigners = designers.length
  const activeProjects = designers.reduce((sum, d) => sum + (d.active_projects || 0), 0)
  const avgRating = designers.reduce((sum, d) => sum + (d.rating || 0), 0) / (designers.filter(d => d.rating).length || 1)
  const preferredDesigners = designers.filter(d => d.status === 'preferred').length

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Designers</h1>
          <p className="text-slate-700 text-lg font-medium mt-1">Manage your design partners and creative workflow</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={loadDesigners}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Link href="/dashboard/design-projects">
            <Button variant="outline" className="flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              Design Projects
            </Button>
          </Link>
          <Link href="/dashboard/design-briefs">
            <Button variant="outline" className="flex items-center">
              <Palette className="w-4 h-4 mr-2" />
              Briefs
            </Button>
          </Link>
          <QuickAddDesigner onDesignerAdded={loadDesigners} />
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="text-amber-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Designers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-primary" />
              <span className="text-3xl font-bold text-slate-900">{totalDesigners}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-6 w-6 text-blue-600" />
              <span className="text-3xl font-bold text-slate-900">{activeProjects}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              <span className="text-3xl font-bold text-slate-900">{avgRating.toFixed(1)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Preferred Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Award className="h-6 w-6 text-purple-600" />
              <span className="text-3xl font-bold text-slate-900">{preferredDesigners}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search designers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-stone-300"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-stone-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="preferred">Preferred</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="border-stone-300">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
                <SelectItem value="textiles">Textiles</SelectItem>
                <SelectItem value="ceramics">Ceramics</SelectItem>
                <SelectItem value="metalwork">Metalwork</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
                <SelectItem value="seating">Seating</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="border-stone-300">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="4.5">4.5+ Stars</SelectItem>
                <SelectItem value="4.0">4.0+ Stars</SelectItem>
                <SelectItem value="3.5">3.5+ Stars</SelectItem>
                <SelectItem value="3.0">3.0+ Stars</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setSpecialtyFilter('all')
                setRatingFilter('all')
              }}
              className="border-stone-300"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Designers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDesigners.map((designer) => (
          <Card key={designer.id} className="border border-stone-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg text-slate-900">{designer.name}</CardTitle>
                  {designer.company_name && (
                    <p className="text-sm text-slate-600">{designer.company_name}</p>
                  )}
                  <p className="text-sm text-slate-600">{designer.contact_email}</p>
                </div>
                <Badge className={`${getStatusColor(designer.status)} flex items-center space-x-1`}>
                  {getStatusIcon(designer.status)}
                  <span className="capitalize">{designer.status}</span>
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Rating */}
              <div>
                {renderStarRating(designer.rating)}
              </div>

              {/* Specialties */}
              <div>
                <p className="text-sm text-slate-600 mb-2">Specialties</p>
                <div className="flex flex-wrap gap-1">
                  {(designer.specialties || []).slice(0, 3).map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="bg-stone-100 text-xs">
                      {safeFormatString(specialty, 'design')}
                    </Badge>
                  ))}
                  {(designer.specialties || []).length > 3 && (
                    <Badge variant="secondary" className="bg-stone-100 text-xs">
                      +{(designer.specialties || []).length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Project Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-stone-50 p-2 rounded">
                  <p className="text-lg font-bold text-slate-900">{designer.total_projects}</p>
                  <p className="text-xs text-slate-600">Total</p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-lg font-bold text-blue-600">{designer.active_projects}</p>
                  <p className="text-xs text-slate-600">Active</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-lg font-bold text-green-600">{designer.completed_projects}</p>
                  <p className="text-xs text-slate-600">Done</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">On-Time Delivery</span>
                  <span className="font-medium">{formatPercentage(designer.on_time_percentage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Avg. Revisions</span>
                  <span className="font-medium">{designer.avg_revisions?.toFixed(1) || 'N/A'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <Link href={`/dashboard/designers/${designer.id}`}>
                  <Button variant="outline" size="sm" className="flex-1 mr-2">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </Link>
                <Link href={`/dashboard/design-projects?designerId=${designer.id}`}>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDesigners.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">No designers found</h3>
          <p className="mt-1 text-sm text-slate-600">
            Try adjusting your filters or add a new designer to get started
          </p>
          <div className="mt-4">
            <QuickAddDesigner onDesignerAdded={loadDesigners} />
          </div>
        </div>
      )}
    </div>
  )
}