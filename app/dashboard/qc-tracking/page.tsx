'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  Eye,
  MoreHorizontal,
  CheckSquare,
  XCircle,
  Camera,
  FileText,
  User
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'
import { PageLoading } from '@/components/ui/enhanced-loading-states'
import { StatsGrid } from '@/components/ui/responsive-grid'

interface QCItem {
  id: string
  order_id: string
  order_number: string
  item_name: string
  batch_id: string
  qc_stage: 'incoming_inspection' | 'in_process_check' | 'final_inspection' | 'packaging_check'
  status: 'pending' | 'in_progress' | 'passed' | 'failed' | 'on_hold'
  assigned_inspector: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  defects_found: number
  customer_name: string
  started_at: string
  due_date: string
  completed_at?: string
  notes?: string
}


export default function QCTrackingPage() {
  const [items, setItems] = useState<QCItem[]>([])
  const [filteredItems, setFilteredItems] = useState<QCItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [editingStage, setEditingStage] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<string | null>(null)  
  const [editingPriority, setEditingPriority] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')


  const applyFilters = useCallback(() => {
    let filtered = [...items]
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }
    
    if (stageFilter !== 'all') {
      filtered = filtered.filter(item => item.qc_stage === stageFilter)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        (item.item_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.order_number || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    setFilteredItems(filtered)
  }, [items, statusFilter, stageFilter, searchTerm])

  useEffect(() => {
    loadQCItems()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element)?.closest('.relative')) {
        setOpenDropdown(null)
      }
      if (editingStage && !(event.target as Element)?.closest('.relative')) {
        setEditingStage(null)
      }
      if (editingStatus && !(event.target as Element)?.closest('.relative')) {
        setEditingStatus(null)
      }
      if (editingPriority && !(event.target as Element)?.closest('.relative')) {
        setEditingPriority(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown, editingStage, editingStatus, editingPriority])

  const loadQCItems = async () => {
    setLoading(true)
    try {
      console.log('Loading QC inspections from API...')

      // Fetch real QC inspection data from API
      const response = await fetch('/api/qc-inspections', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          // Transform API response to match QCItem interface
          const transformedItems: QCItem[] = data.data.map((inspection: unknown) => {
            const qc = inspection as Record<string, unknown>
            const order = qc.orders as Record<string, unknown> | null
            const item = qc.items as Record<string, unknown> | null

            return {
              id: (qc.id as string) || `qc-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
              order_id: (qc.order_id as string) || '',
              order_number: (order?.order_number as string) || `ORD-${qc.order_id}`,
              item_name: (item?.name as string) || 'Unknown Item',
              batch_id: (qc.batch_id as string) || 'Unknown Batch',
              qc_stage: (qc.inspection_type as QCItem['qc_stage']) || 'initial_check',
              status: (qc.status as QCItem['status']) || 'pending',
              assigned_inspector: (qc.inspector_name as string) || 'Unassigned',
              priority: (qc.priority as QCItem['priority']) || 'normal',
              defects_found: (qc.defects_found as number) || 0,
              customer_name: 'Unknown Customer', // Would need customer join
              started_at: (qc.created_at as string) || new Date().toISOString(),
              due_date: (qc.inspection_date as string) || new Date().toISOString(),
              completed_at: qc.status === 'completed' ? (qc.updated_at as string) : undefined,
              notes: (qc.notes as string) || undefined
            }
          })

          setItems(transformedItems)
          console.log('QC Tracking: Successfully loaded', transformedItems.length, 'inspections from API')
        } else {
          throw new Error('Invalid API response format')
        }
      } else {
        // Fallback to empty array if API not available yet
        console.log('QC Inspections API not available, showing empty state')
        setItems([])
      }
    } catch (error) {
      console.error('Error loading QC items:', error)
      setItems([]) // Empty array instead of mock data
    } finally {
      setLoading(false)
    }
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'passed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'incoming_inspection': return 'bg-blue-100 text-blue-800'
      case 'in_process_check': return 'bg-yellow-100 text-yellow-800'
      case 'final_inspection': return 'bg-orange-100 text-orange-800'
      case 'packaging_check': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const updateItemStage = async (itemId: string, newStage: 'incoming_inspection' | 'in_process_check' | 'final_inspection' | 'packaging_check') => {
    try {
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, qc_stage: newStage } : item
        )
      )
      setEditingStage(null)
    } catch (error) {
      console.error('Error updating stage:', error)
      alert('Failed to update stage')
    }
  }

  const updateItemStatus = async (itemId: string, newStatus: 'pending' | 'in_progress' | 'passed' | 'failed' | 'on_hold') => {
    try {
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      )
      setEditingStatus(null)
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const updateItemPriority = async (itemId: string, newPriority: 'urgent' | 'high' | 'normal' | 'low') => {
    try {
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, priority: newPriority } : item
        )
      )
      setEditingPriority(null)
    } catch (error) {
      console.error('Error updating priority:', error)
      alert('Failed to update priority')
    }
  }

  const formatStageDisplay = (stage: string) => {
    return stage.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">QC Tracking</h1>
          <p className="text-slate-700 text-lg font-medium mt-1">Track quality control inspections and defects</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            QC Report
          </Button>
          <Button size="sm">
            <CheckSquare className="h-4 w-4 mr-2" />
            New Inspection
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsGrid statsCount={4}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {items.filter(i => i.status === 'in_progress').length}
            </div>
            <div className="text-sm text-blue-600">Active inspections</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Passed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {items.filter(i => i.status === 'passed').length}
            </div>
            <div className="text-sm text-green-600">Quality approved</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {items.filter(i => i.status === 'failed').length}
            </div>
            <div className="text-sm text-red-600">Needs rework</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <XCircle className="w-4 h-4 mr-2" />
              Total Defects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {items.reduce((sum, item) => sum + item.defects_found, 0)}
            </div>
            <div className="text-sm text-orange-600">Across all items</div>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items, orders, batches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">QC Stage</label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="incoming_inspection">Incoming Inspection</SelectItem>
                  <SelectItem value="in_process_check">In-Process Check</SelectItem>
                  <SelectItem value="final_inspection">Final Inspection</SelectItem>
                  <SelectItem value="packaging_check">Packaging Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QC Items Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(filteredItems.map(item => item.id))
                        } else {
                          setSelectedItems([])
                        }
                      }}
                      className="rounded border-stone-300 text-primary focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>QC Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Defects</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(prev => [...prev, item.id])
                          } else {
                            setSelectedItems(prev => prev.filter(id => id !== item.id))
                          }
                        }}
                        className="rounded border-stone-300 text-primary focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{item.item_name}</div>
                        <div className="text-sm text-slate-600">{item.order_number}</div>
                        <div className="text-xs text-slate-500">Batch: {item.batch_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingStage === item.id ? (
                        <Select
                          value={item.qc_stage}
                          onValueChange={(value) => updateItemStage(item.id, value as QCItem['qc_stage'])}
                        >
                          <SelectTrigger className="text-xs border border-stone-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white min-w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="incoming_inspection">Incoming Inspection</SelectItem>
                            <SelectItem value="in_process_check">In-Process Check</SelectItem>
                            <SelectItem value="final_inspection">Final Inspection</SelectItem>
                            <SelectItem value="packaging_check">Packaging Check</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          className={`${getStageColor(item.qc_stage)} cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => setEditingStage(item.id)}
                          title="Click to change QC stage"
                        >
                          {formatStageDisplay(item.qc_stage)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingStatus === item.id ? (
                        <Select
                          value={item.status}
                          onValueChange={(value) => updateItemStatus(item.id, value as QCItem['status'])}
                        >
                          <SelectTrigger className="text-xs border border-stone-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white min-w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          className={`${getStatusColor(item.status)} cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => setEditingStatus(item.id)}
                          title="Click to change status"
                        >
                          {safeFormatString(item.status, 'pending')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-slate-500" />
                        <span className="text-sm">{item.assigned_inspector}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingPriority === item.id ? (
                        <Select
                          value={item.priority}
                          onValueChange={(value) => updateItemPriority(item.id, value as QCItem['priority'])}
                        >
                          <SelectTrigger className="text-xs border border-stone-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white min-w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urgent">URGENT</SelectItem>
                            <SelectItem value="high">HIGH</SelectItem>
                            <SelectItem value="normal">NORMAL</SelectItem>
                            <SelectItem value="low">LOW</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className={`${getPriorityColor(item.priority)} cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => setEditingPriority(item.id)}
                          title="Click to change priority"
                        >
                          {(item.priority || "").toUpperCase()}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${item.defects_found > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.defects_found}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(item.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/dashboard/orders/${item.order_id}`, '_blank')}
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <div className="relative">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                            title="More Actions"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                          {openDropdown === item.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-stone-200 z-50">
                              <div className="py-1">
                                <button
                                  className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 w-full text-left"
                                  onClick={() => {
                                    alert(`Recording QC results for: ${item.item_name}`)
                                    setOpenDropdown(null)
                                  }}
                                >
                                  <CheckSquare className="w-4 h-4 mr-2" />
                                  Record Results
                                </button>
                                <button
                                  className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 w-full text-left"
                                  onClick={() => {
                                    alert(`Taking photos for: ${item.item_name}`)
                                    setOpenDropdown(null)
                                  }}
                                >
                                  <Camera className="w-4 h-4 mr-2" />
                                  Add Photos
                                </button>
                                <button
                                  className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 w-full text-left"
                                  onClick={() => {
                                    alert(`Adding notes for: ${item.item_name}`)
                                    setOpenDropdown(null)
                                  }}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Add Notes
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredItems.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No QC items found</h3>
            <p className="text-slate-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'QC items will appear here when production items are ready for inspection'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}