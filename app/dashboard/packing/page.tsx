'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Package, 
  Box, 
  Truck, 
  Search, 
  Eye,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Printer,
  QrCode,
  FileText,
  Scale
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface PackingItem {
  id: string
  order_id: string
  order_number: string
  item_name: string
  quantity: number
  packed_quantity: number
  box_count: number
  total_weight: number
  weight_lbs: number
  weight_kg: number
  unit_weight_lbs: number
  unit_weight_kg: number
  dimensions: string
  packing_status: 'pending' | 'in_progress' | 'packed' | 'shipped'
  packer_assigned: string
  customer_name: string
  shipping_method: string
  special_instructions?: string
  packed_date?: string
  tracking_number?: string
  created_at: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
}

interface PackingStats {
  pending: number
  inProgress: number
  packed: number
  shipped: number
  totalWeightLbs: number
  totalWeightKg: number
  totalBoxes: number
}

export default function PackingPage() {
  const [items, setItems] = useState<PackingItem[]>([])
  const [filteredItems, setFilteredItems] = useState<PackingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [editingStatus, setEditingStatus] = useState<string | null>(null)  
  const [editingPriority, setEditingPriority] = useState<string | null>(null)
  const [showCreateJobModal, setShowCreateJobModal] = useState(false)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadPackingItems()
  }, [])

  const applyFilters = useCallback(() => {
    let filtered = [...items]
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.packing_status === statusFilter)
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(item =>
        (item.item_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.order_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tracking_number && (item.tracking_number || "").toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Sort by priority (high -> medium -> low) then by due date
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    
    setFilteredItems(filtered)
  }, [items, statusFilter, priorityFilter, searchTerm])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Close editing states when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingStatus && !(event.target as Element)?.closest('.relative')) {
        setEditingStatus(null)
      }
      if (editingPriority && !(event.target as Element)?.closest('.relative')) {
        setEditingPriority(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingStatus, editingPriority])

  const loadPackingItems = async () => {
    setLoading(true)
    try {
      // Fetch packing jobs from the dedicated packing API
      const response = await fetch('/api/packing', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store' // Ensure fresh data on every request
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.data && Array.isArray(data.data)) {
        setItems(data.data as PackingItem[])
      } else {
        console.warn('No packing data found in API response:', data)
        setItems([])
      }
    } catch (error) {
      console.error('Error loading packing items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (): PackingStats => {
    return {
      pending: items.filter(i => i.packing_status === 'pending').length,
      inProgress: items.filter(i => i.packing_status === 'in_progress').length,
      packed: items.filter(i => i.packing_status === 'packed').length,
      shipped: items.filter(i => i.packing_status === 'shipped').length,
      totalWeightLbs: items.reduce((sum, item) => sum + (item.weight_lbs || 0), 0),
      totalWeightKg: items.reduce((sum, item) => sum + (item.weight_kg || 0), 0),
      totalBoxes: items.reduce((sum, item) => sum + item.box_count, 0)
    }
  }

  const getStatusVariant = (status: string): 'success' | 'error' | 'warning' | 'info' | 'neutral' => {
    switch (status) {
      case 'pending': return 'warning'
      case 'in_progress': return 'info'
      case 'packed': return 'success'
      case 'shipped': return 'success'
      default: return 'neutral'
    }
  }

  const updateItemStatus = async (itemId: string, newStatus: 'pending' | 'in_progress' | 'packed' | 'shipped') => {
    try {
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, packing_status: newStatus } : item
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

  const getPriorityVariant = (priority: string): 'success' | 'error' | 'warning' | 'info' | 'neutral' => {
    switch (priority) {
      case 'urgent': return 'error'
      case 'high': return 'warning'
      case 'normal': return 'info'
      case 'low': return 'neutral'
      default: return 'neutral'
    }
  }

  const getPackingActionItems = (item: PackingItem) => [
    {
      label: 'Start Packing',
      icon: Package,
      onClick: () => updateItemStatus(item.id, 'in_progress')
    },
    {
      label: 'Print Labels',
      icon: Printer,
      onClick: () => {
        // In a real implementation, this would trigger label printing
        console.log(`Printing labels for: ${item.item_name}`)
        // Show user feedback without intrusive alert
        if (typeof window !== 'undefined') {
          const button = document.activeElement
          if (button) {
            button.textContent = 'Printing...'
            setTimeout(() => {
              button.textContent = 'Print Labels'
            }, 2000)
          }
        }
      }
    },
    {
      label: 'Record Weight',
      icon: Scale,
      onClick: () => {
        const weight = prompt(`Enter weight for ${item.item_name} (in lbs):`)
        if (weight && !isNaN(parseFloat(weight))) {
          // Update item weight
          setItems(prevItems =>
            prevItems.map(i => 
              i.id === item.id 
                ? { ...i, total_weight: parseFloat(weight) }
                : i
            )
          )
          console.log(`Weight recorded: ${weight} lbs for ${item.item_name}`)
        }
      }
    },
    {
      label: 'Add Notes',
      icon: FileText,
      onClick: () => {
        const notes = prompt(`Add notes for ${item.item_name}:`, item.special_instructions || '')
        if (notes !== null) {
          // Update item notes
          setItems(prevItems =>
            prevItems.map(i => 
              i.id === item.id 
                ? { ...i, special_instructions: notes }
                : i
            )
          )
          console.log(`Notes updated for ${item.item_name}:`, notes)
        }
      }
    }
  ]

  const stats = calculateStats()

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-stone-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      <PageHeader 
        title="Packing & Fulfillment"
        description="Manage packaging operations and shipping preparation"
        actions={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (filteredItems.length === 0) {
                  alert('No items to print labels for')
                  return
                }
                console.log('Printing labels for all items')
                alert(`Printing labels for ${filteredItems.length} items`)
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Labels
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log('Opening barcode scanner')
                alert('Barcode scanner functionality would be implemented here')
              }}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan Items
            </Button>
            <Button 
              size="sm"
              onClick={() => setShowCreateJobModal(true)}
            >
              <Package className="h-4 w-4 mr-2" />
              New Packing Job
          </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.pending}
            </div>
            <div className="text-sm text-yellow-600">Awaiting packing</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.inProgress}
            </div>
            <div className="text-sm text-blue-600">Being packed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Packed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.packed}
            </div>
            <div className="text-sm text-green-600">Ready to ship</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Truck className="w-4 h-4 mr-2" />
              Shipped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.shipped}
            </div>
            <div className="text-sm text-purple-600">In transit</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Scale className="w-4 h-4 mr-2" />
              Total Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats.totalWeightLbs.toFixed(1)} lbs
            </div>
            <div className="text-sm text-slate-600">{stats.totalWeightKg.toFixed(1)} kg</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Box className="w-4 h-4 mr-2" />
              Total Boxes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.totalBoxes}
            </div>
            <div className="text-sm text-slate-600">packages</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items, orders, tracking..."
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
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
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

      {/* Packing Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Packing Items</CardTitle>
            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log(`Bulk packing ${selectedItems.length} items`)
                    selectedItems.forEach(itemId => {
                      updateItemStatus(itemId, 'in_progress')
                    })
                    alert(`Started packing ${selectedItems.length} items`)
                    setSelectedItems([])
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Bulk Pack
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log(`Printing labels for ${selectedItems.length} selected items`)
                    const selectedItemsData = filteredItems.filter(item => selectedItems.includes(item.id))
                    alert(`Printing labels for ${selectedItemsData.length} selected items:\n${selectedItemsData.map(item => item.item_name).join(', ')}`)
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">
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
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Shipping</TableHead>
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
                        <div className="text-xs text-slate-500">{item.customer_name}</div>
                        {item.dimensions && (
                          <div className="text-xs text-slate-500 mt-1">{item.dimensions}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{item.packed_quantity} / {item.quantity}</div>
                        <div className="text-slate-500">{item.quantity > 1 ? 'items' : 'item'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {editingStatus === item.id ? (
                          <Select
                            value={item.packing_status}
                            onValueChange={(value) => updateItemStatus(item.id, value as PackingItem['packing_status'])}
                          >
                            <SelectTrigger className="text-xs border border-stone-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white min-w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="packed">Packed</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <StatusBadge 
                            variant={getStatusVariant(item.packing_status)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setEditingStatus(item.id)}
                            title="Click to change status"
                          >
                            {safeFormatString(item.packing_status, 'Unknown')}
                          </StatusBadge>
                        )}
                        <div className="text-xs text-slate-500 mt-1">{item.packer_assigned}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingPriority === item.id ? (
                        <Select
                          value={item.priority}
                          onValueChange={(value) => updateItemPriority(item.id, value as PackingItem['priority'])}
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
                        <StatusBadge 
                          variant={getPriorityVariant(item.priority)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setEditingPriority(item.id)}
                          title="Click to change priority"
                          size="sm"
                        >
                          {(item.priority || "").toUpperCase()}
                        </StatusBadge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.weight_lbs > 0 ? (
                        <div className="text-sm">
                          <div className="font-medium">{item.weight_lbs} lbs</div>
                          <div className="text-slate-500">{item.weight_kg} kg</div>
                          <div className="text-xs text-slate-500 mt-1">{item.box_count} boxes</div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">TBD</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm text-slate-600">{item.shipping_method}</div>
                        {item.tracking_number && (
                          <div className="text-blue-600 font-mono text-xs mt-1">
                            {item.tracking_number}
                          </div>
                        )}
                      </div>
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
                        <DropdownMenu
                          trigger={
                            <Button 
                              variant="outline" 
                              size="sm"
                              title="More Actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          }
                          items={getPackingActionItems(item)}
                        />
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
            <Package className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No packing items found</h3>
            <p className="text-slate-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : items.length === 0 
                  ? 'Database is empty - no orders available for packing. Create orders first.'
                  : 'All items are filtered out by current criteria'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Packing Job Modal */}
      {showCreateJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Packing Job</h2>
              <button onClick={() => setShowCreateJobModal(false)}>
                <Box className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const newItem: PackingItem = {
                id: `job-${Date.now()}`,
                order_id: 'manual-' + Date.now(),
                order_number: formData.get('orderNumber') as string || 'MANUAL-' + Date.now(),
                item_name: formData.get('itemName') as string,
                quantity: Number(formData.get('quantity')) || 1,
                packed_quantity: 0,
                box_count: 0,
                total_weight: 0,
                weight_lbs: 0,
                weight_kg: 0,
                unit_weight_lbs: 0,
                unit_weight_kg: 0,
                dimensions: formData.get('dimensions') as string || 'Unknown',
                packing_status: 'pending',
                packer_assigned: formData.get('packer') as string || 'Production Team',
                customer_name: formData.get('customer') as string,
                shipping_method: formData.get('shippingMethod') as string || 'Standard',
                special_instructions: formData.get('instructions') as string || '',
                priority: (formData.get('priority') as 'urgent' | 'high' | 'normal' | 'low') || 'normal',
                created_at: new Date().toISOString()
              }
              setItems(prev => [newItem, ...prev])
              setShowCreateJobModal(false)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Order Number</label>
                  <input 
                    name="orderNumber"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Manual entry order number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Item Name *</label>
                  <input 
                    name="itemName"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Item to be packed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Quantity *</label>
                    <input 
                      name="quantity"
                      type="number"
                      min="1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Priority</label>
                    <Select name="priority" defaultValue="normal">
                      <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Customer Name *</label>
                  <input 
                    name="customer"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Assigned Packer</label>
                  <input 
                    name="packer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Production Team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Special Instructions</label>
                  <textarea 
                    name="instructions"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Special handling instructions..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowCreateJobModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Packing Job
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}