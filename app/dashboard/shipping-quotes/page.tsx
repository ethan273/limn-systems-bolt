'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { formatAddress } from '@/lib/utils/safe-render'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageWrapper } from '@/components/layouts/page-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Truck,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Eye,
  Download,
  RefreshCw,
  MoreHorizontal,
  Plane,
  Ship,
  Navigation,
  Timer,
  Target
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

// Type definitions for comprehensive shipping quotes management
interface ShippingQuote {
  id: string
  quote_number: string
  order_id: string
  order_number: string
  customer_id: string
  customer_name: string
  status: 'pending' | 'quoted' | 'approved' | 'rejected' | 'booked' | 'shipped' | 'delivered'
  service_type: 'ground' | 'air' | 'ocean' | 'ltl' | 'ftl' | 'white_glove'
  carrier: 'seko' | 'fedex' | 'ups' | 'dhl' | 'freight' | 'white_glove_partner'
  origin_address: AddressInfo
  destination_address: AddressInfo
  dimensions: PackageDimensions
  weight_lbs: number
  declared_value: number
  quoted_cost: number
  actual_cost?: number
  transit_time_days: number
  pickup_date?: string
  delivery_date?: string
  tracking_number?: string
  special_instructions?: string
  requires_approval: boolean
  approved_by?: string
  approved_date?: string
  created_date: string
  created_by: string
  seko_quote_id?: string
  seko_booking_id?: string
  insurance_required: boolean
  signature_required: boolean
  inside_delivery: boolean
  white_glove_service: boolean
}

interface AddressInfo {
  street: string
  city: string
  state: string
  zip: string
  country: string
  contact_name?: string
  contact_phone?: string
}

interface PackageDimensions {
  length: number
  width: number
  height: number
  pieces: number
  description: string
}

interface ShippingMetrics {
  total_quotes: number
  pending_approval: number
  in_transit: number
  delivered_today: number
  average_cost: number
  cost_savings: number
  on_time_delivery_rate: number
  carrier_performance: Array<{
    carrier: string
    quote_count: number
    avg_cost: number
    on_time_rate: number
    success_rate: number
  }>
}

interface SekoIntegration {
  connection_status: 'connected' | 'disconnected' | 'error'
  last_sync: string
  api_calls_today: number
  rate_limit_remaining: number
  service_availability: {
    ground: boolean
    air: boolean
    ocean: boolean
    white_glove: boolean
  }
}

export default function ShippingQuotesDashboard() {
  // State management for comprehensive shipping quotes
  const [quotes, setQuotes] = useState<ShippingQuote[]>([])
  const [metrics, setMetrics] = useState<ShippingMetrics | null>(null)
  const [sekoStatus, setSekoStatus] = useState<SekoIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [filters, setFilters] = useState({
    status: 'all',
    service_type: 'all',
    carrier: 'all',
    approval_required: 'all',
    search: '',
    date_range: '30d'
  })

  // Fetch comprehensive shipping data
  const fetchShippingData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch shipping quotes
      const quotesResponse = await fetch('/api/shipping/quotes?' + new URLSearchParams(filters))
      const quotesData = await quotesResponse.json()
      
      // Fetch shipping metrics
      const metricsResponse = await fetch('/api/shipping/metrics')
      const metricsData = await metricsResponse.json()

      // Fetch Seko integration status
      const sekoResponse = await fetch('/api/shipping/seko-status')
      const sekoData = await sekoResponse.json()

      setQuotes(quotesData.data || [])
      setMetrics(metricsData.data || null)
      setSekoStatus(sekoData.data || null)
    } catch (error) {
      console.error('Failed to fetch shipping data:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Initial load
  useEffect(() => {
    fetchShippingData()
  }, [fetchShippingData])

  // Handle quote actions
  const handleQuoteAction = async (quoteId: string, action: 'approve' | 'reject' | 'book' | 'track', notes?: string) => {
    try {
      await fetch(`/api/shipping/quotes/${quoteId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes,
          user_id: 'current_user'
        })
      })
      fetchShippingData() // Refresh data
    } catch (error) {
      console.error('Failed to perform quote action:', error)
    }
  }

  // Generate new quote via Seko API
  const handleGenerateQuote = async (orderData: Record<string, unknown>) => {
    try {
      await fetch('/api/shipping/generate-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })
      fetchShippingData() // Refresh data
    } catch (error) {
      console.error('Failed to generate quote:', error)
    }
  }

  // Status styling - standardized with design system
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-success-100 text-success-800'
      case 'shipped': return 'bg-info-100 text-info-800'  
      case 'booked': return 'bg-info-100 text-info-800'
      case 'approved': return 'bg-success-100 text-success-800'
      case 'quoted': return 'bg-warning-100 text-warning-800'
      case 'pending': return 'bg-warning-100 text-warning-800'
      case 'rejected': return 'bg-error-100 text-error-800'
      default: return 'bg-neutral-100 text-neutral-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-4 h-4" />
      case 'shipped': return <Truck className="w-4 h-4" />
      case 'booked': return <Calendar className="w-4 h-4" />
      case 'approved': return <CheckCircle className="w-4 h-4" />
      case 'quoted': return <DollarSign className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'air': return <Plane className="w-4 h-4" />
      case 'ocean': return <Ship className="w-4 h-4" />
      case 'ground': return <Truck className="w-4 h-4" />
      case 'white_glove': return <Target className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      </div>
    )
  }

  return (
    <PageWrapper 
      title="Shipping Quotes"
      description="Seko Logistics integration with tracking and approval workflows"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between -mt-4">
          <div></div>
          <div className="flex items-center space-x-2">
            <Badge className={sekoStatus?.connection_status === 'connected' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'}>
              <Navigation className="w-4 h-4 mr-1" />
              Seko {sekoStatus?.connection_status || 'disconnected'}
            </Badge>
            <Button variant="outline" onClick={() => handleGenerateQuote({})}>
              <Package className="w-4 h-4 mr-2" />
              New Quote
            </Button>
            <Button onClick={fetchShippingData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-900">Total Quotes</CardTitle>
            <Package className="h-4 w-4 text-info-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.total_quotes || 0}
            </div>
            <p className="text-xs text-neutral-500">
              Active shipping quotes
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-900">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-warning-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-600">
              {metrics?.pending_approval || 0}
            </div>
            <p className="text-xs text-neutral-500">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-900">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-info-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-600">
              {metrics?.in_transit || 0}
            </div>
            <p className="text-xs text-neutral-500">
              Currently shipping
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-900">Average Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-success-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.average_cost || 0)}
            </div>
            <p className="text-xs text-neutral-500">
              Per shipment
            </p>
          </CardContent>
        </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotes">All Quotes</TabsTrigger>
          <TabsTrigger value="approval">Approval Queue</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Carrier Performance */}
            <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm">
              <CardHeader className="mb-4">
                <CardTitle className="text-lg font-medium text-neutral-900">Carrier Performance</CardTitle>
                <CardDescription className="text-sm text-neutral-600">Delivery performance by carrier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.carrier_performance.map((carrier, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {getServiceIcon(carrier.carrier)}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{carrier.carrier}</p>
                          <p className="text-sm text-neutral-600">
                            {carrier.quote_count} quotes
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(carrier.avg_cost)}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-success-600">{carrier.on_time_rate}% on-time</span>
                          <span className="text-sm text-info-600">{carrier.success_rate}% success</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Seko Integration Status */}
            <Card>
              <CardHeader>
                <CardTitle>Seko Logistics Integration</CardTitle>
                <CardDescription>API status and service availability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Status</span>
                    <Badge className={sekoStatus?.connection_status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {sekoStatus?.connection_status || 'disconnected'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Sync</span>
                    <span className="text-sm text-slate-500">
                      {sekoStatus?.last_sync ? formatDate(sekoStatus.last_sync) : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Calls Today</span>
                    <span className="text-sm font-medium">{sekoStatus?.api_calls_today || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rate Limit Remaining</span>
                    <span className="text-sm font-medium">{sekoStatus?.rate_limit_remaining || 0}</span>
                  </div>
                  
                  <div className="pt-2">
                    <h4 className="font-medium mb-2">Service Availability</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(sekoStatus?.service_availability || {}).map(([service, available]) => (
                        <div key={service} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{service}</span>
                          <Badge className={available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <Input
                  placeholder="Search by quote number, order, or customer..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="max-w-sm"
                />
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.service_type} onValueChange={(value) => setFilters({...filters, service_type: value})}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="ground">Ground</SelectItem>
                    <SelectItem value="air">Air</SelectItem>
                    <SelectItem value="ocean">Ocean</SelectItem>
                    <SelectItem value="white_glove">White Glove</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quotes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Quotes</CardTitle>
              <CardDescription>Complete quotes with Seko integration and tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Transit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.slice(0, 50).map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          {getServiceIcon(quote.service_type)}
                          <span>{quote.quote_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>{quote.customer_name}</TableCell>
                      <TableCell>{quote.order_number}</TableCell>
                      <TableCell className="capitalize">{quote.service_type}</TableCell>
                      <TableCell className="capitalize">{quote.carrier}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatAddress(quote.origin_address)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatAddress(quote.destination_address)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(quote.quoted_cost)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Timer className="w-4 h-4 text-slate-500" />
                          <span>{quote.transit_time_days}d</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(quote.status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(quote.status)}
                            <span>{quote.status}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {quote.status === 'quoted' && quote.requires_approval && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => handleQuoteAction(quote.id, 'approve')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleQuoteAction(quote.id, 'reject')}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {quote.status === 'approved' && (
                              <DropdownMenuItem 
                                onClick={() => handleQuoteAction(quote.id, 'book')}
                                className="text-blue-600"
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Book Shipment
                              </DropdownMenuItem>
                            )}
                            {quote.tracking_number && (
                              <DropdownMenuItem onClick={() => handleQuoteAction(quote.id, 'track')}>
                                <Navigation className="h-4 w-4 mr-2" />
                                Track Package
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download Label
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval Queue Tab */}
        <TabsContent value="approval" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval Queue</CardTitle>
              <CardDescription>Quotes requiring approval before booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quotes
                  .filter(q => q.requires_approval && q.status === 'quoted')
                  .slice(0, 10)
                  .map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {getServiceIcon(quote.service_type)}
                        </div>
                        <div>
                          <p className="font-medium">{quote.quote_number}</p>
                          <p className="text-sm text-neutral-600">
                            {quote.customer_name} • Order {quote.order_number}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {formatAddress(quote.origin_address)} → {formatAddress(quote.destination_address)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">{formatCurrency(quote.quoted_cost)}</p>
                        <p className="text-sm text-slate-500">{quote.transit_time_days} days transit</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Button size="sm" onClick={() => handleQuoteAction(quote.id, 'approve')}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleQuoteAction(quote.id, 'reject')}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Package Tracking</CardTitle>
              <CardDescription>Real-time tracking for active shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quotes
                  .filter(q => q.tracking_number && ['shipped', 'booked'].includes(q.status))
                  .slice(0, 10)
                  .map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <Navigation className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-medium">{quote.quote_number}</p>
                          <p className="text-sm text-neutral-600">
                            Tracking: {quote.tracking_number}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {quote.customer_name} • {(quote.carrier || "").toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(quote.status)}>
                          {quote.status}
                        </Badge>
                        <p className="text-sm text-slate-500 mt-1">
                          {quote.pickup_date && `Picked up ${formatDate(quote.pickup_date)}`}
                        </p>
                        {quote.delivery_date && (
                          <p className="text-sm text-neutral-600">
                            Est. delivery {formatDate(quote.delivery_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Analytics</CardTitle>
              <CardDescription>Performance metrics and cost analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Performance Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">On-time Delivery Rate:</span>
                      <span className="font-medium">{metrics?.on_time_delivery_rate || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Average Cost:</span>
                      <span className="font-medium">{formatCurrency(metrics?.average_cost || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cost Savings:</span>
                      <span className="font-medium text-green-600">{formatCurrency(metrics?.cost_savings || 0)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Service Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Ground Services:</span>
                      <span className="font-medium">67%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Air Services:</span>
                      <span className="font-medium">23%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">White Glove:</span>
                      <span className="font-medium">10%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  )
}