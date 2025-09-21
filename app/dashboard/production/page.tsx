'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface QualityCheckItem {
  id: string
  checkpoint: string
  status: 'pending' | 'passed' | 'failed'
  notes?: string
  checked_by?: string
  checked_date?: string
}

interface ProductionPhoto {
  id: string
  url: string
  caption?: string
  stage: 'raw_materials' | 'work_in_progress' | 'quality_check' | 'completed'
  uploaded_by: string
  uploaded_date: string
}

interface ProductionIssue {
  id: string
  type: 'delay' | 'quality' | 'material' | 'equipment' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact?: string
  resolution?: string
  reported_by: string
  reported_date: string
  resolved_date?: string
  status: 'open' | 'in_progress' | 'resolved'
}

interface ProductionBatch {
  id: string
  batch_number: string
  manufacturer: string
  production_date: string
  estimated_completion: string
  actual_completion?: string
  status: 'planned' | 'in_progress' | 'quality_check' | 'completed' | 'delayed'
  line_item_ids: string[]
  total_items: number
  completed_items: number
  batch_notes?: string
}

interface ProductionLineItem {
  id: string
  order_id: string
  order_number: string
  project_name: string
  client_name: string
  item_name: string
  item_sku: string
  quantity: number
  completed_quantity: number
  production_status: 'pending' | 'in_production' | 'quality_check' | 'ready' | 'shipped' | 'delivered'
  manufacturer: string
  workshop: string
  estimated_start_date?: string
  actual_start_date?: string
  estimated_completion_date?: string
  actual_completion_date?: string
  lead_time_days: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  batch_id?: string
  customizations: {
    fabric?: string
    finish?: string
    dimensions?: {
      width?: number
      depth?: number
      height?: number
    }
    notes?: string
  }
  quality_checks: QualityCheckItem[]
  production_photos: ProductionPhoto[]
  issues: ProductionIssue[]
  production_notes?: string
  created_at: string
  updated_at?: string
}

export default function ProductionPage() {
  const [productionQueue, setProductionQueue] = useState<ProductionLineItem[]>([])
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'queue' | 'batches' | 'issues'>('queue')
  const [selectedLineItem, setSelectedLineItem] = useState<ProductionLineItem | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [, setActionLoading] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    fetchProductionData()
  }, [])  // fetchProductionData is defined in this component, no need to add as dependency

  const fetchProductionData = async () => {
    try {
      setLoading(true)
      
      // Fetch real production data from API
      const response = await fetch('/api/production', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          // Transform API response to match ProductionLineItem interface
          const transformedProduction: ProductionLineItem[] = data.data.map((item: unknown) => {
            const prod = item as Record<string, unknown>
            return {
              id: (prod.id as string) || `prod-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
              order_id: (prod.order_id as string) || '',
              order_number: (prod.order_number as string) || `ORD-${prod.order_id}`,
              project_name: (prod.project_name as string) || 'Unknown Project',
              client_name: (prod.client_name as string) || 'Unknown Client',
              item_name: (prod.item_name as string) || 'Unknown Item',
              item_sku: (prod.item_sku as string) || 'UNKNOWN-SKU',
              quantity: parseInt((prod.quantity as string) || '1'),
              completed_quantity: parseInt((prod.completed_quantity as string) || '0'),
              production_status: ((prod.status || prod.production_status) as ProductionLineItem['production_status']) || 'pending',
              manufacturer: (prod.manufacturer as string) || 'Default Manufacturer',
              workshop: (prod.workshop as string) || 'Main Workshop',
              estimated_start_date: prod.estimated_start_date as string | undefined,
              actual_start_date: (prod.actual_start_date || prod.started_at) as string | undefined,
              estimated_completion_date: prod.estimated_completion_date as string | undefined,
              actual_completion_date: prod.actual_completion_date as string | undefined,
              lead_time_days: parseInt((prod.lead_time_days as string) || '30'),
              priority: (prod.priority as ProductionLineItem['priority']) || 'medium',
              batch_id: prod.batch_id as string | undefined,
              customizations: (prod.customizations as ProductionLineItem['customizations']) || {},
              quality_checks: (prod.quality_checks as QualityCheckItem[]) || [],
              production_photos: (prod.production_photos as ProductionPhoto[]) || [],
              issues: (prod.issues as ProductionIssue[]) || [],
              production_notes: (prod.production_notes || prod.notes) as string || '',
              created_at: (prod.created_at as string) || new Date().toISOString(),
              updated_at: prod.updated_at as string | undefined
            }
          })
          
          setProductionQueue(transformedProduction)
          setBatches([]) // API doesn't return batches yet
          setError('')
          console.log(`Loaded ${transformedProduction.length} production items from API`)
          return
        }
      }

      // If API fails or returns no data, set empty array with helpful error message
      console.log('Production API returned no data or failed - check if production_status table exists')
      setProductionQueue([])
      setBatches([])
      setError('No production data available. Check if production_status table exists and contains data.')
    } catch (error) {
      console.error('Error fetching production data:', error)
      setError('Failed to load production data')
    } finally {
      setLoading(false)
    }
  }

  const updateProductionStatus = async (lineItemId: string, newStatus: ProductionLineItem['production_status']) => {
    setActionLoading(`status-${lineItemId}`)

    try {
      // Make API call to persist the status update
      const response = await fetch('/api/production', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: lineItemId,
          production_status: newStatus
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update production status')
      }

      const result = await response.json()

      if (result.success) {
        // Update local state only after successful API call
        const updatedQueue = productionQueue.map(item =>
          item.id === lineItemId
            ? { ...item, production_status: newStatus, updated_at: new Date().toISOString() }
            : item
        )

        setProductionQueue(updatedQueue)

        if (selectedLineItem && selectedLineItem.id === lineItemId) {
          setSelectedLineItem({ ...selectedLineItem, production_status: newStatus })
        }

        setSuccess(`Production status updated to ${safeFormatString(newStatus, 'unknown')}`)
        setError('')
      } else {
        throw new Error('API call failed')
      }
    } catch (error) {
      console.error('Error updating production status:', error)
      setError(`Failed to update production status: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setSuccess('')
    } finally {
      setActionLoading(null)
    }
  }

  const addQualityCheck = async (lineItemId: string, checkpoint: string) => {
    setActionLoading(`quality-${lineItemId}`)

    try {
      const newCheck: QualityCheckItem = {
        id: `check-${Date.now()}`,
        checkpoint,
        status: 'pending',
        notes: ''
      }

      const updatedQueue = productionQueue.map(item => 
        item.id === lineItemId 
          ? { ...item, quality_checks: [...item.quality_checks, newCheck] }
          : item
      )
      
      setProductionQueue(updatedQueue)
      
      if (selectedLineItem && selectedLineItem.id === lineItemId) {
        setSelectedLineItem({ ...selectedLineItem, quality_checks: [...selectedLineItem.quality_checks, newCheck] })
      }
      
      setSuccess(`Quality check added: ${checkpoint}`)
    } catch (error) {
      console.error('Error adding quality check:', error)
      setError('Failed to add quality check')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-stone-100 text-stone-700'
      case 'in_production': return 'bg-amber-100 text-amber-700'
      case 'quality_check': return 'bg-purple-100 text-purple-700'
      case 'ready': return 'bg-emerald-100 text-emerald-700'
      case 'shipped': return 'bg-blue-100 text-blue-700'
      case 'delivered': return 'bg-primary/10 text-primary'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-stone-100 text-stone-700'
      case 'medium': return 'bg-blue-100 text-blue-700'
      case 'high': return 'bg-amber-100 text-amber-700'
      case 'urgent': return 'bg-red-100 text-red-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getQualityStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-stone-100 text-stone-700'
      case 'passed': return 'bg-primary/10 text-primary'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getIssueTypeColor = (type: string) => {
    switch (type) {
      case 'delay': return 'bg-amber-100 text-amber-700'
      case 'quality': return 'bg-red-100 text-red-700'
      case 'material': return 'bg-blue-100 text-blue-700'
      case 'equipment': return 'bg-purple-100 text-purple-700'
      case 'other': return 'bg-stone-100 text-stone-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getIssueSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-stone-100 text-stone-700'
      case 'medium': return 'bg-amber-100 text-amber-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'critical': return 'bg-red-100 text-red-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-stone-100 text-stone-700'
      case 'in_progress': return 'bg-amber-100 text-amber-700'
      case 'quality_check': return 'bg-purple-100 text-purple-700'
      case 'completed': return 'bg-primary/10 text-primary'
      case 'delayed': return 'bg-red-100 text-red-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const viewLineItemDetails = (lineItem: ProductionLineItem) => {
    setSelectedLineItem(lineItem)
    setShowDetails(true)
  }

  const backToList = () => {
    setSelectedLineItem(null)
    setShowDetails(false)
  }

  const filteredQueue = productionQueue.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.production_status === statusFilter
    const matchesManufacturer = manufacturerFilter === 'all' || item.manufacturer === manufacturerFilter
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter
    return matchesStatus && matchesManufacturer && matchesPriority
  })

  const manufacturers = [...new Set(productionQueue.map(item => item.manufacturer))]

  const allIssues = productionQueue.flatMap(item => 
    (item.issues || []).map(issue => ({ ...issue, lineItem: item }))
  )

  if (showDetails && selectedLineItem) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={backToList} variant="outline">
              ← Back to Production Queue
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {selectedLineItem.item_name} - {selectedLineItem.order_number}
              </h1>
              <p className="text-slate-600 mt-1">
                {selectedLineItem.project_name} - {selectedLineItem.client_name}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">Add Photo</Button>
            <Button variant="outline">Report Issue</Button>
            <Button>Update Status</Button>
          </div>
        </div>

        {/* Production Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(selectedLineItem.production_status)}`}>
                  {safeFormatString(selectedLineItem.production_status, 'pending')}
                </span>
                <Select 
                  value={selectedLineItem.production_status} 
                  onValueChange={(value) => updateProductionStatus(selectedLineItem.id, value as ProductionLineItem['production_status'])}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_production">In Production</SelectItem>
                    <SelectItem value="quality_check">Quality Check</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {selectedLineItem.completed_quantity}/{selectedLineItem.quantity}
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(selectedLineItem.completed_quantity / selectedLineItem.quantity) * 100}%` 
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getPriorityColor(selectedLineItem.priority)}`}>
                {(selectedLineItem.priority || "").charAt(0).toUpperCase() + (selectedLineItem.priority || "").slice(1)}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Quality Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {(selectedLineItem.quality_checks || []).filter(q => q.status === 'passed').length}/
                {(selectedLineItem.quality_checks || []).length}
              </div>
              <div className="text-xs text-slate-600">Passed</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Est. Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {selectedLineItem.actual_completion_date 
                  ? formatDate(selectedLineItem.actual_completion_date)
                  : selectedLineItem.estimated_completion_date 
                    ? formatDate(selectedLineItem.estimated_completion_date)
                    : 'TBD'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Production Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Production Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Manufacturer</Label>
                  <p className="text-slate-900">{selectedLineItem.manufacturer}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Workshop</Label>
                  <p className="text-slate-900">{selectedLineItem.workshop}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Start Date</Label>
                  <p className="text-slate-900">
                    {selectedLineItem.actual_start_date 
                      ? formatDate(selectedLineItem.actual_start_date)
                      : selectedLineItem.estimated_start_date 
                        ? `Est: ${formatDate(selectedLineItem.estimated_start_date)}`
                        : '—'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-slate-600">Lead Time</Label>
                  <p className="text-slate-900">{selectedLineItem.lead_time_days} days</p>
                </div>
                {selectedLineItem.batch_id && (
                  <div className="col-span-2">
                    <Label className="text-slate-600">Batch Number</Label>
                    <p className="text-slate-900 font-mono">{selectedLineItem.batch_id}</p>
                  </div>
                )}
              </div>
              {selectedLineItem.production_notes && (
                <div>
                  <Label className="text-slate-600">Production Notes</Label>
                  <p className="text-slate-900">{selectedLineItem.production_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customizations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedLineItem.customizations.fabric && (
                <div>
                  <Label className="text-slate-600">Fabric</Label>
                  <p className="text-slate-900">{selectedLineItem.customizations.fabric}</p>
                </div>
              )}
              {selectedLineItem.customizations.finish && (
                <div>
                  <Label className="text-slate-600">Finish</Label>
                  <p className="text-slate-900">{selectedLineItem.customizations.finish}</p>
                </div>
              )}
              {selectedLineItem.customizations.dimensions && (
                <div>
                  <Label className="text-slate-600">Custom Dimensions</Label>
                  <div className="text-slate-900 space-x-4">
                    {selectedLineItem.customizations.dimensions.width && (
                      <span>W: {selectedLineItem.customizations.dimensions.width}&quot;</span>
                    )}
                    {selectedLineItem.customizations.dimensions.depth && (
                      <span>D: {selectedLineItem.customizations.dimensions.depth}&quot;</span>
                    )}
                    {selectedLineItem.customizations.dimensions.height && (
                      <span>H: {selectedLineItem.customizations.dimensions.height}&quot;</span>
                    )}
                  </div>
                </div>
              )}
              {selectedLineItem.customizations.notes && (
                <div>
                  <Label className="text-slate-600">Special Instructions</Label>
                  <p className="text-slate-900">{selectedLineItem.customizations.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quality Checks */}
        <Card>
          <CardHeader>
            <CardTitle>Quality Control ({(selectedLineItem.quality_checks || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(selectedLineItem.quality_checks || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No quality checks defined</p>
                <Button onClick={() => addQualityCheck(selectedLineItem.id, 'Initial Inspection')}>
                  Add First Quality Check
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {(selectedLineItem.quality_checks || []).map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-medium text-slate-900">{check.checkpoint}</h3>
                          {check.notes && (
                            <p className="text-sm text-slate-600 mt-1">{check.notes}</p>
                          )}
                          {check.checked_by && check.checked_date && (
                            <p className="text-xs text-slate-600 mt-1">
                              Checked by {check.checked_by} on {formatDate(check.checked_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getQualityStatusColor(check.status)}`}>
                        {(check.status || "").charAt(0).toUpperCase() + (check.status || "").slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Production Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Production Photos ({(selectedLineItem.production_photos || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(selectedLineItem.production_photos || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No production photos uploaded</p>
                <Button variant="outline">Upload First Photo</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(selectedLineItem.production_photos || []).map((photo) => (
                  <div key={photo.id} className="border border-stone-200 rounded-lg overflow-hidden">
                    <div className="aspect-w-16 aspect-h-9 bg-stone-100">
                      <div className="flex items-center justify-center text-slate-600 text-sm">
                        📸 {photo.caption || 'Production Photo'}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                        <span className="capitalize">{safeFormatString(photo.stage, 'unknown')}</span>
                        <span>{formatDate(photo.uploaded_date)}</span>
                      </div>
                      {photo.caption && (
                        <p className="text-sm text-slate-900">{photo.caption}</p>
                      )}
                      <p className="text-xs text-slate-600">By {photo.uploaded_by}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issues */}
        {(selectedLineItem.issues || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Production Issues ({(selectedLineItem.issues || []).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(selectedLineItem.issues || []).map((issue) => (
                  <div key={issue.id} className="p-4 border border-stone-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getIssueTypeColor(issue.type)}`}>
                          {safeFormatString(issue.type, 'unknown')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getIssueSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${
                          issue.status === 'resolved' ? 'bg-primary/10 text-primary' : 
                          issue.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {safeFormatString(issue.status, 'pending')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {formatDate(issue.reported_date)}
                      </div>
                    </div>
                    <h3 className="font-medium text-slate-900 mb-2">{issue.description}</h3>
                    {issue.impact && (
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Impact:</span> {issue.impact}
                      </p>
                    )}
                    {issue.resolution && (
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Resolution:</span> {issue.resolution}
                      </p>
                    )}
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Reported by {issue.reported_by}</span>
                      {issue.resolved_date && (
                        <span>Resolved on {formatDate(issue.resolved_date)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Production</h1>
          <p className="text-slate-600 mt-1">Monitor production queue and batch management</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={fetchProductionData} 
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline">
            Create Batch
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="text-amber-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {success && (
        <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
          <div className="text-primary text-sm">
            <strong>Success:</strong> {success}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-stone-200">
        <nav className="flex space-x-8">
          {[
            { id: 'queue', label: 'Production Queue' },
            { id: 'batches', label: 'Production Batches' },
            { id: 'issues', label: 'Issues & Delays' }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setActiveTab(tab.id as 'queue' | 'batches' | 'issues')}
              className={`py-2 px-1 border-b-2 font-medium text-sm rounded-none ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-stone-300'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </nav>
      </div>

      {/* Production Queue Tab */}
      {activeTab === 'queue' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status-filter" className="text-slate-900">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_production">In Production</SelectItem>
                      <SelectItem value="quality_check">Quality Check</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="manufacturer-filter" className="text-slate-900">Manufacturer</Label>
                  <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                    <SelectTrigger id="manufacturer-filter">
                      <SelectValue placeholder="All Manufacturers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Manufacturers</SelectItem>
                      {manufacturers.map(manufacturer => (
                        <SelectItem key={manufacturer} value={manufacturer}>{manufacturer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority-filter" className="text-slate-900">Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger id="priority-filter">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">In Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {filteredQueue.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">In Production</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600 mb-1">
                  {filteredQueue.filter(item => item.production_status === 'in_production').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Quality Check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {filteredQueue.filter(item => item.production_status === 'quality_check').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Ready to Ship</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600 mb-1">
                  {filteredQueue.filter(item => item.production_status === 'ready').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Production Queue Table */}
          <Card>
            <CardHeader>
              <CardTitle>Production Queue ({filteredQueue.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <div className="text-slate-600">Loading production queue...</div>
                </div>
              ) : filteredQueue.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-600 mb-4">No items in production queue</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Completion</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQueue.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-slate-900">{item.item_name}</div>
                            <div className="text-sm text-slate-600 font-mono">{item.item_sku}</div>
                            <div className="text-xs text-slate-600">{item.workshop}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.order_number}</div>
                            <div className="text-sm text-slate-600">{item.project_name}</div>
                            <div className="text-xs text-slate-600">{item.client_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.manufacturer}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.completed_quantity}/{item.quantity}</span>
                              <span>{Math.round((item.completed_quantity / item.quantity) * 100)}%</span>
                            </div>
                            <div className="w-full bg-stone-200 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${(item.completed_quantity / item.quantity) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getStatusColor(item.production_status)}`}>
                            {safeFormatString(item.production_status, 'pending')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getPriorityColor(item.priority)}`}>
                            {(item.priority || "").charAt(0).toUpperCase() + (item.priority || "").slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.actual_completion_date 
                              ? formatDate(item.actual_completion_date)
                              : item.estimated_completion_date 
                                ? `Est: ${formatDate(item.estimated_completion_date)}`
                                : 'TBD'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewLineItemDetails(item)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                            >
                              Update
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <Card>
          <CardHeader>
            <CardTitle>Production Batches ({batches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-600 mb-4">No production batches found</div>
                <Button>Create First Batch</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Production Date</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium font-mono">{batch.batch_number}</TableCell>
                      <TableCell>{batch.manufacturer}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{batch.completed_items}/{batch.total_items}</span>
                            <span>{Math.round((batch.completed_items / batch.total_items) * 100)}%</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${(batch.completed_items / batch.total_items) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getBatchStatusColor(batch.status)}`}>
                          {safeFormatString(batch.status, 'pending')}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(batch.production_date)}</TableCell>
                      <TableCell>
                        {batch.actual_completion 
                          ? formatDate(batch.actual_completion)
                          : `Est: ${formatDate(batch.estimated_completion)}`
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">View</Button>
                          <Button size="sm" variant="outline">Update</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <Card>
          <CardHeader>
            <CardTitle>Production Issues & Delays ({allIssues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {allIssues.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-600 mb-4">No production issues reported</div>
              </div>
            ) : (
              <div className="space-y-4">
                {allIssues.map((issue) => (
                  <div key={issue.id} className="p-4 border border-stone-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getIssueTypeColor(issue.type)}`}>
                          {safeFormatString(issue.type, 'unknown')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getIssueSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${
                          issue.status === 'resolved' ? 'bg-primary/10 text-primary' : 
                          issue.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {safeFormatString(issue.status, 'pending')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {formatDate(issue.reported_date)}
                      </div>
                    </div>
                    <h3 className="font-medium text-slate-900 mb-2">{issue.description}</h3>
                    <div className="flex items-center space-x-4 text-xs text-slate-600 mb-2">
                      <span>{(issue as unknown as { lineItem?: { item_name?: string } }).lineItem?.item_name}</span>
                      <span>{(issue as unknown as { lineItem?: { order_number?: string } }).lineItem?.order_number}</span>
                      <span>{(issue as unknown as { lineItem?: { project_name?: string } }).lineItem?.project_name}</span>
                    </div>
                    {issue.impact && (
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Impact:</span> {issue.impact}
                      </p>
                    )}
                    {issue.resolution && (
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Resolution:</span> {issue.resolution}
                      </p>
                    )}
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Reported by {issue.reported_by}</span>
                      {issue.resolved_date && (
                        <span>Resolved on {formatDate(issue.resolved_date)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}