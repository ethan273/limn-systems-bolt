'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageWrapper } from '@/components/layouts/page-wrapper'
import { QuickAddManufacturer } from '@/components/manufacturers/QuickAddManufacturer'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Building2, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Eye,
  MoreHorizontal,
  Award,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'
import { PageLoading } from '@/components/ui/enhanced-loading-states'

interface Manufacturer {
  id: string
  name: string
  contact_name: string
  email: string
  phone: string
  status: 'prospect' | 'approved' | 'preferred' | 'suspended'
  capabilities: string[]
  rating: number | null
  total_projects: number
  active_projects: number
  on_time_delivery: number
  average_lead_time: number
  last_project_date: string
  created_at: string
}

export default function ManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [filteredManufacturers, setFilteredManufacturers] = useState<Manufacturer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [capabilityFilter, setCapabilityFilter] = useState('all')
  const [_ratingFilter, _setRatingFilter] = useState('all')

  useEffect(() => {
    loadManufacturers()
  }, [])

  const applyFiltersCallback = useCallback(() => {
    let filtered = [...manufacturers]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(manufacturer => manufacturer.status === statusFilter)
    }

    if (capabilityFilter !== 'all') {
      filtered = filtered.filter(manufacturer => 
        (manufacturer.capabilities || "").includes(capabilityFilter)
      )
    }

    if (_ratingFilter !== 'all') {
      const minRating = parseFloat(_ratingFilter)
      filtered = filtered.filter(manufacturer => (manufacturer.rating || 0) >= minRating)
    }

    if (searchTerm) {
      filtered = filtered.filter(manufacturer =>
        (manufacturer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (manufacturer.contact_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (manufacturer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        manufacturer.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredManufacturers(filtered)
  }, [manufacturers, searchTerm, statusFilter, capabilityFilter, _ratingFilter])

  useEffect(() => {
    applyFiltersCallback()
  }, [applyFiltersCallback])

  const loadManufacturers = async () => {
    setLoading(true)
    try {
      // Fetch real manufacturers data from API
      const response = await fetch('/api/manufacturers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setManufacturers(result.data)
          setError('')
          console.log(`Loaded ${result.data.length} manufacturers from API`)
          return
        }
      }

      // If API fails or returns no data, set empty array with helpful error message
      console.log('Manufacturers API returned no data or failed - check if manufacturers table exists')
      setManufacturers([])
      setError('No manufacturers data available. Check if manufacturers table exists and contains data.')
    } catch (error) {
      console.error('Error fetching manufacturers:', error)
      setError(`Failed to load manufacturers: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setManufacturers([])
    } finally {
      setLoading(false)
    }
  }


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      prospect: 'bg-gray-100 text-slate-900',
      approved: 'bg-blue-100 text-blue-800',
      preferred: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.prospect
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preferred': return <Award className="w-4 h-4" />
      case 'approved': return <CheckCircle className="w-4 h-4" />
      case 'suspended': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const renderStarRating = (rating: number | null) => {
    const safeRating = rating || 0
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= safeRating ? 'text-amber-400 fill-current' : 'text-slate-500'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-slate-900">{safeRating.toFixed(1)}</span>
      </div>
    )
  }

  // Calculate stats
  const stats = {
    totalManufacturers: manufacturers.length,
    activeProjects: manufacturers.reduce((sum, m) => sum + (m.active_projects || 0), 0),
    shopDrawingsPending: 0, // TODO: Fetch from shop_drawings table
    averageRating: manufacturers.length > 0
      ? (manufacturers.reduce((sum, m) => sum + (m.rating || 0), 0) / manufacturers.length).toFixed(1)
      : '0.0'
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <PageWrapper 
      title="Manufacturers"
      description="Manage your manufacturing partners and suppliers"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between -mt-4">
          <div></div>
          <div className="flex items-center gap-3">
            <Button
              onClick={loadManufacturers}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Link href="/dashboard/manufacturers/shop-drawings">
              <Button variant="outline" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Shop Drawings
              </Button>
            </Link>
            <QuickAddManufacturer onManufacturerAdded={loadManufacturers} />
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
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              Total Manufacturers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalManufacturers}</div>
            <div className="text-sm text-primary">+2 this month</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.activeProjects}</div>
            <div className="text-sm text-primary">Across all partners</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Shop Drawings Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.shopDrawingsPending}</div>
            <div className="text-sm text-amber">Awaiting review</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center">
              <Star className="w-4 h-4 mr-2" />
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.averageRating}</div>
            <div className="text-sm text-primary">Partner performance</div>
          </CardContent>
        </Card>
        </div>

        {/* Filters */}
        <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-900 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search manufacturers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Capabilities</label>
              <Select value={capabilityFilter} onValueChange={setCapabilityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Capabilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Capabilities</SelectItem>
                  <SelectItem value="woodwork">Woodwork</SelectItem>
                  <SelectItem value="upholstery">Upholstery</SelectItem>
                  <SelectItem value="metalwork">Metalwork</SelectItem>
                  <SelectItem value="finishing">Finishing</SelectItem>
                  <SelectItem value="carving">Carving</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Min Rating</label>
              <Select value={_ratingFilter} onValueChange={_setRatingFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  <SelectItem value="4.0">4.0+ Stars</SelectItem>
                  <SelectItem value="3.5">3.5+ Stars</SelectItem>
                  <SelectItem value="3.0">3.0+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        </Card>

        {/* Manufacturers Table */}
        <Card>
        <CardHeader>
          <CardTitle>Manufacturing Partners</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto overflow-y-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredManufacturers.map((manufacturer, index) => (
                  <TableRow key={manufacturer.id || `manufacturer-${index}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{manufacturer.name}</div>
                        <div className="text-sm text-slate-900">{manufacturer.contact_name}</div>
                        <div className="text-sm text-slate-900">{manufacturer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(manufacturer.status)}`}>
                        {getStatusIcon(manufacturer.status)}
                        <span className="ml-1 capitalize">{manufacturer.status}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(manufacturer.capabilities) ? (manufacturer.capabilities || []).slice(0, 2).map((capability, capIndex) => (
                          <span
                            key={capIndex}
                            className="inline-flex px-2 py-1 text-xs rounded-md bg-stone-100 text-stone-700"
                          >
                            {safeFormatString(capability, 'unknown')}
                          </span>
                        )) : []}
                        {Array.isArray(manufacturer.capabilities) && (manufacturer.capabilities || []).length > 2 && (
                          <span className="inline-flex px-2 py-1 text-xs rounded-md bg-stone-100 text-stone-700">
                            +{(manufacturer.capabilities || []).length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderStarRating(manufacturer.rating)}
                    </TableCell>
                    <TableCell>
                      <div className="text-slate-700">
                        <div>{manufacturer.active_projects} active</div>
                        <div className="text-sm text-slate-900">{manufacturer.total_projects} total</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-slate-700">
                        <div>{manufacturer.on_time_delivery}% on-time</div>
                        <div className="text-sm text-slate-900">{manufacturer.average_lead_time} days avg</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link href={`/dashboard/manufacturers/${manufacturer.id}`}>
                          <Button variant="outline" size="sm" title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/manufacturers/projects?manufacturerId=${manufacturer.id}`}>
                          <Button variant="outline" size="sm" title="View Projects">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        </Card>

        {filteredManufacturers.length === 0 && !loading && (
          <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Building2 className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No manufacturers found</h3>
            <p className="text-slate-900">
              {searchTerm || statusFilter !== 'all' || capabilityFilter !== 'all' || _ratingFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first manufacturing partner to get started'
              }
            </p>
          </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}