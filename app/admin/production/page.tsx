'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import ProductionStageManager from '@/components/admin/ProductionStageManager'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { 
  Factory, 
  Package, 
  Clock, 
  AlertTriangle, 
  MoreHorizontal,
  Eye,
  Edit,
  MessageSquare,
  FileText,
  X,
  Search
} from 'lucide-react'

interface ProductionItem {
  id: string
  order_id: string
  order_number: string
  item_name: string
  current_stage_name: string
  current_stage_id: string
  progress: number
  priority: 'urgent' | 'high' | 'normal' | 'low'
  assigned_to: string
  started_at: string
  estimated_completion: string
  customer_name: string
  status: string
}

export default function AdminProductionPage() {
  const router = useRouter()
  const [items, setItems] = useState<ProductionItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ProductionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('all')

  useEffect(() => {
    loadProductionItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFilters = useCallback(() => {
    let filtered = items

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(item => 
        (item.item_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.order_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.assigned_to || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredItems(filtered)
  }, [items, statusFilter, priorityFilter, searchTerm])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const loadProductionItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (dateRange !== 'all') params.set('dateRange', dateRange)

      const response = await fetch(`/api/production?${params}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data)
      }
    } catch (error) {
      console.error('Failed to load production items:', error)
      // Mock data fallback
      setItems([
        {
          id: '1',
          order_id: 'ord-1',
          order_number: 'ORD-2025-001',
          item_name: 'Ragusa Sofa',
          current_stage_name: 'In Production',
          current_stage_id: '4',
          progress: 65,
          priority: 'high',
          assigned_to: 'Production Team A',
          started_at: '2025-01-15T09:00:00Z',
          estimated_completion: '2025-02-01T17:00:00Z',
          customer_name: 'Acme Corp',
          status: 'active'
        },
        {
          id: '2',
          order_id: 'ord-2',
          order_number: 'ORD-2025-002',
          item_name: 'Ukiah Chair',
          current_stage_name: 'Quality Control',
          current_stage_id: '5',
          progress: 85,
          priority: 'normal',
          assigned_to: 'QC Team',
          started_at: '2025-01-10T08:00:00Z',
          estimated_completion: '2025-01-30T16:00:00Z',
          customer_name: 'Design Studio',
          status: 'active'
        },
        {
          id: '3',
          order_id: 'ord-3',
          order_number: 'ORD-2025-003',
          item_name: 'Pacifica Table',
          current_stage_name: 'Materials Sourcing',
          current_stage_id: '2',
          progress: 25,
          priority: 'urgent',
          assigned_to: 'Procurement',
          started_at: '2025-01-20T10:00:00Z',
          estimated_completion: '2025-02-10T15:00:00Z',
          customer_name: 'Luxury Hotels Inc',
          status: 'delayed'
        }
      ])
    } finally {
      setLoading(false)
    }
  }


  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      normal: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[priority] || colors.normal
  }

  const getProductionActionItems = (item: ProductionItem) => [
    {
      label: 'View Order Details',
      icon: FileText,
      onClick: () => router.push(`/admin/orders/${item.order_id}`)
    },
    {
      label: 'Edit Production Item',
      icon: Edit,
      onClick: () => toast.info(`Edit production item feature coming soon for ${item.item_name}`)
    },
    {
      label: 'Add Production Note',
      icon: MessageSquare,
      onClick: () => toast.info(`Add note feature coming soon for ${item.item_name}`)
    },
    {
      label: 'Change Priority',
      icon: AlertTriangle,
      onClick: () => toast.info(`Change priority feature coming soon for ${item.item_name}`)
    },
    {
      label: 'Cancel Item',
      icon: X,
      destructive: true,
      onClick: () => {
        if (confirm(`Are you sure you want to cancel production for ${item.item_name}?`)) {
          toast.info(`Cancel feature coming soon for ${item.item_name}`)
        }
      }
    }
  ]

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      delayed: 'bg-red-100 text-red-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800'
    }
    return colors[status] || colors.active
  }

  const handleBulkUpdate = async (stageId: string) => {
    if (selectedItems.length === 0) return

    try {
      const response = await fetch('/api/production/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItems,
          stageId,
          notes: 'Bulk stage update'
        })
      })

      if (response.ok) {
        await loadProductionItems()
        setSelectedItems([])
      }
    } catch (error) {
      console.error('Bulk update failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Production Tracking</h1>
        <p className="text-gray-600 mt-1">Monitor and manage all production items</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Factory className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">In Production</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter(i => ['4', '5', '6'].includes(i.current_stage_id)).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Ready to Ship</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter(i => i.current_stage_id === '9').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Delayed</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter(i => i.status === 'delayed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Urgent Priority</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter(i => i.priority === 'urgent').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders, items, customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="delayed">Delayed</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedItems.length} items selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkUpdate('5')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Move to QC
              </button>
              <button
                onClick={() => handleBulkUpdate('8')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Move to Packaging
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Items Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-6 py-3">
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
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Est. Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                      <div className="text-sm text-gray-500">{item.order_number}</div>
                      <div className="text-xs text-gray-400">{item.customer_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.current_stage_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">{item.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(item.priority)}`}>
                      {(item.priority || "").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.assigned_to}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(item.estimated_completion).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedItem(item.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <DropdownMenu
                      trigger={
                        <button className="text-gray-600 hover:text-gray-900">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      }
                      items={getProductionActionItems(item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Stage Manager Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-white rounded-lg">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-semibold">Manage Production Stage</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <ProductionStageManager
                orderItemId={selectedItem}
                onUpdate={() => {
                  loadProductionItems()
                  setSelectedItem(null)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}