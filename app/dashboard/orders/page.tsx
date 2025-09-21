 
'use client'

import { useEffect, useState, useMemo, useCallback, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { PageWrapper } from '@/components/layouts/page-wrapper'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Edit, Trash2, Bell } from 'lucide-react'
import OrdersFilters from '@/components/orders/OrdersFilters'
import OrdersStats from '@/components/orders/OrdersStats'
import { safeFormatString } from '@/lib/utils/string-helpers'
import { PageLoading } from '@/components/ui/enhanced-loading-states'

interface Project {
  id: string
  name: string
  client_name: string
}

interface Item {
  id: string
  name: string
  sku_base: string
  base_price: number
  lead_time_days: number
  collection_name?: string
  available_finishes?: string[]
  available_fabrics?: string[]
  dimension_units: 'inches' | 'cm'
  width?: number
  depth?: number
  height?: number
}

interface OrderLineItem {
  id: string
  item_id: string
  item?: Item
  quantity: number
  unit_price: number
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
  lead_time_days: number
  line_total: number
  production_status: 'pending' | 'in_production' | 'quality_check' | 'ready' | 'shipped' | 'delivered'
  estimated_completion?: string
  actual_completion?: string
  production_notes?: string
}

interface Order {
  id: string
  order_number: string
  project_id: string
  project?: Project
  category: 'furniture' | 'decking' | 'cladding' | 'fixtures' | 'custom_millwork'
  status: 'draft' | 'confirmed' | 'in_production' | 'ready_to_ship' | 'shipped' | 'delivered'
  line_items: OrderLineItem[]
  subtotal: number
  tax_amount: number
  total_amount: number
  deposit_percentage: number
  deposit_amount: number
  balance_amount: number
  deposit_paid_date?: string
  balance_paid_date?: string
  payment_status: 'pending' | 'deposit_paid' | 'fully_paid'
  po_number?: string
  po_file_url?: string
  estimated_delivery_date?: string
  actual_delivery_date?: string
  created_at: string
  updated_at?: string
  notes?: string
  client_notes?: string
}

interface OrderFormData {
  project_id: string
  category: 'furniture' | 'decking' | 'cladding' | 'fixtures' | 'custom_millwork'
  po_number: string
  estimated_delivery_date: string
  notes: string
  client_notes: string
}

interface LineItemFormData {
  item_id: string
  quantity: number
  unit_price: string
  customizations: {
    fabric: string
    finish: string
    width: string
    depth: string
    height: string
    notes: string
  }
  lead_time_days: number
}

export default function OrdersPage() {
  const router = useRouter()

  // Line item editing state (keeping separate for now)
  const [editingLineItem, setEditingLineItem] = useState<OrderLineItem | null>(null)
  const [showEditLineItemDialog, setShowEditLineItemDialog] = useState(false)
  const [editLineItemFormData, setEditLineItemFormData] = useState<Partial<OrderLineItem>>({})
  
  // Customer notification state
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationOrder, setNotificationOrder] = useState<Order | null>(null)

  function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
      case 'SET_ORDERS':
        return { ...state, orders: action.payload }
      case 'SET_PROJECTS':
        return { ...state, projects: action.payload }
      case 'SET_ITEMS':
        return { ...state, items: action.payload }
      case 'SET_LOADING':
        return { ...state, loading: action.payload }
      case 'SET_ERROR':
        return { ...state, error: action.payload, success: '' }
      case 'SET_SUCCESS':
        return { ...state, success: action.payload, error: '' }
      case 'SET_SHOW_CREATE_FORM':
        return { ...state, showCreateForm: action.payload }
      case 'SET_SHOW_LINE_ITEM_FORM':
        return { ...state, showLineItemForm: action.payload }
      case 'SET_EDITING_ORDER':
        return { ...state, _editingOrder: action.payload }
      case 'SET_SELECTED_ORDER':
        return { ...state, selectedOrder: action.payload }
      case 'SET_ACTIVE_TAB':
        return { ...state, activeTab: action.payload }
      case 'SET_ACTION_LOADING':
        return { ...state, actionLoading: action.payload }
      case 'SET_STATUS_FILTER':
        return { ...state, statusFilter: action.payload }
      case 'SET_CATEGORY_FILTER':
        return { ...state, categoryFilter: action.payload }
      case 'SET_PROJECT_FILTER':
        return { ...state, projectFilter: action.payload }
      case 'SET_ORDER_FORM_DATA':
        return { ...state, orderFormData: action.payload }
      case 'SET_LINE_ITEM_FORM_DATA':
        return { ...state, lineItemFormData: action.payload }
      case 'UPDATE_ORDER_FORM_FIELD':
        return {
          ...state,
          orderFormData: {
            ...state.orderFormData,
            [action.payload.field]: action.payload.value
          }
        }
      case 'UPDATE_LINE_ITEM_FORM_FIELD':
        return {
          ...state,
          lineItemFormData: {
            ...state.lineItemFormData,
            [action.payload.field]: action.payload.value === '' ? '' : action.payload.value
          }
        }
      case 'SET_FILTERS':
        return {
          ...state,
          statusFilter: action.payload.status,
          categoryFilter: action.payload.category,
          projectFilter: action.payload.project
        }
      case 'UPDATE_ORDER_FORM':
        return {
          ...state,
          orderFormData: {
            ...state.orderFormData,
            [action.payload.field]: action.payload.value
          }
        }
      case 'UPDATE_LINE_ITEM_FORM':
        return {
          ...state,
          lineItemFormData: {
            ...state.lineItemFormData,
            [action.payload.field]: action.payload.value
          }
        }
      case 'TOGGLE_CREATE_FORM':
        return { 
          ...state, 
          showCreateForm: !state.showCreateForm, 
          error: '',
          success: '',
          _editingOrder: null
        }
      case 'TOGGLE_LINE_ITEM_FORM':
        return { 
          ...state, 
          showLineItemForm: !state.showLineItemForm, 
          error: '',
          success: ''
        }
      case 'RESET_FORMS':
        return {
          ...state,
          showCreateForm: false,
          showLineItemForm: false,
          _editingOrder: null
        }
      default:
        return state
    }
  }

  // Initialize state reducer early to avoid hoisting issues
  const initialState: AppState = {
    orders: [],
    projects: [],
    items: [],
    loading: true,
    error: '',
    success: '',
    showCreateForm: false,
    showLineItemForm: false,
    _editingOrder: null,
    selectedOrder: null,
    activeTab: 'list',
    actionLoading: null,
    statusFilter: 'all',
    categoryFilter: 'all',
    projectFilter: 'all',
    orderFormData: {
      project_id: '',
      category: 'furniture',
      po_number: '',
      estimated_delivery_date: '',
      notes: '',
      client_notes: ''
    },
    lineItemFormData: {
      item_id: '',
      quantity: 1,
      unit_price: '',
      customizations: {
        fabric: '',
        finish: '',
        width: '',
        depth: '',
        height: '',
        notes: ''
      },
      lead_time_days: 30
    }
  }

  const [state, dispatch] = useReducer(appReducer, initialState)

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data && Array.isArray(data.data)) {
          // Transform API response to match Project interface
          const transformedProjects: Project[] = (data.data || []).map((project: unknown) => {
            const proj = project as Record<string, unknown>
            return {
              id: proj.id as string || '',
              name: proj.name as string || 'Unnamed Project',
              client_name: proj.client_name as string || 'No Client'
            }
          })
          dispatch({ type: 'SET_PROJECTS', payload: transformedProjects })
          console.log(`Loaded ${transformedProjects.length} projects from API`)
          return
        }
      }
      
      throw new Error('Failed to fetch projects')
    } catch (error) {
      console.error('Error fetching projects:', error)
      // Set empty array with error state - no mock data fallback
      dispatch({ type: 'SET_PROJECTS', payload: [] })
      dispatch({ type: 'SET_ERROR', payload: `Failed to load projects: ${error instanceof Error ? error.message : 'Unknown error'}. Check if projects table exists and API is working.` })
    }
  }, [dispatch])

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch('/api/items', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data && Array.isArray(data.data)) {
          // Transform API response to match Item interface
          const transformedItems: Item[] = (data.data || []).map((item: unknown) => {
            const itm = item as Record<string, unknown>
            return {
              id: itm.id as string || '',
              name: itm.name as string || 'Unnamed Item',
              sku_base: itm.sku_base as string || '',
              base_price: Number(itm.base_price) || 0,
              lead_time_days: Number(itm.lead_time_days) || 30,
              collection_name: itm.collection_name as string || undefined,
              available_finishes: itm.available_finishes as string[] || [],
              available_fabrics: itm.available_fabrics as string[] || [],
              dimension_units: (itm.dimension_units as 'inches' | 'cm') || 'inches',
              width: Number(itm.width) || undefined,
              depth: Number(itm.depth) || undefined,
              height: Number(itm.height) || undefined
            }
          })
          dispatch({ type: 'SET_ITEMS', payload: transformedItems })
          console.log(`Loaded ${transformedItems.length} items from API`)
          return
        }
      }
      
      throw new Error('Failed to fetch items')
    } catch (error) {
      console.error('Error fetching items:', error)
      // Set empty array with error state - no mock data fallback
      dispatch({ type: 'SET_ITEMS', payload: [] })
      dispatch({ type: 'SET_ERROR', payload: `Failed to load items: ${error instanceof Error ? error.message : 'Unknown error'}. Check if items table exists and API is working.` })
    }
  }, [dispatch])

  const fetchOrders = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // Fetch real orders from API
      const response = await fetch('/api/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch orders`)
      }
      
      const data = await response.json()
      console.log('Orders page: API response -', { hasData: !!data.data, ordersLength: data.data?.length, fullData: data })
      
      if (data.success && data.data) {
        // API returns orders in different format, transform to match interface
        const transformedOrders: Order[] = (data.data || []).map((order: unknown) => {
          const ord = order as Record<string, unknown>
          const customer = ord.customers as Record<string, unknown> | undefined
          return {
            id: ord.id as string || '',
            order_number: ord.order_number as string || '',
            project_id: ord.customer_id as string || '',
            project: customer ? {
              id: customer.id as string || '',
              name: customer.company_name as string || customer.name as string || 'Unnamed Project',
              client_name: customer.name as string || 'No Client'
            } : undefined,
            category: (ord.category as Order['category']) || 'furniture',
            status: (ord.status as Order['status']) || 'draft',
            line_items: (ord.line_items as OrderLineItem[]) || [],
            subtotal: Number(ord.subtotal) || 0,
            tax_amount: Number(ord.tax_amount) || 0,
            total_amount: Number(ord.total_amount) || 0,
            deposit_percentage: Number(ord.deposit_percentage) || 50,
            deposit_amount: Number(ord.deposit_amount) || 0,
            balance_amount: Number(ord.balance_amount) || 0,
            deposit_paid_date: ord.deposit_paid_date as string || undefined,
            balance_paid_date: ord.balance_paid_date as string || undefined,
            payment_status: (ord.payment_status as Order['payment_status']) || 'pending',
            po_number: ord.po_number as string || undefined,
            po_file_url: ord.po_file_url as string || undefined,
            estimated_delivery_date: ord.estimated_delivery_date as string || undefined,
            actual_delivery_date: ord.actual_delivery_date as string || undefined,
            created_at: ord.created_at as string || new Date().toISOString(),
            updated_at: ord.updated_at as string || undefined,
            notes: ord.notes as string || undefined,
            client_notes: ord.client_notes as string || undefined
          }
        })
        
        dispatch({ type: 'SET_ORDERS', payload:  transformedOrders })
        console.log(`Loaded ${transformedOrders.length} orders from API`)
        dispatch({ type: 'SET_LOADING', payload: false })
      } else {
        // Fallback to empty array if no orders
        dispatch({ type: 'SET_ORDERS', payload: [] })
        console.log('No orders found in API response')
        dispatch({ type: 'SET_LOADING', payload: false })
      }
      
      dispatch({ type: 'SET_ERROR', payload: '' })
    } catch (error) {
      console.error('Error fetching orders:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load orders' })
      
      // Set empty state - no mock data fallback
      dispatch({ type: 'SET_ORDERS', payload: [] })
      dispatch({ type: 'SET_LOADING', payload: false })

    }
  }, [])  // Empty dependency array since function doesn't depend on props/state

  useEffect(() => {
    fetchOrders()
    fetchProjects()
    fetchItems()
  }, [fetchOrders, fetchProjects, fetchItems])

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch({ type: 'SET_ACTION_LOADING', payload: 'create' })

    try {
      const orderData = {
        customer_id: orderFormData.project_id, // Map project_id to customer_id for API
        total_amount: 0, // Start with 0, will be updated as line items are added
        status: 'draft',
        order_number: `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`,
        estimated_delivery_date: orderFormData.estimated_delivery_date || null,
        notes: orderFormData.notes || null,
        po_number: orderFormData.po_number || null
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        // Refresh orders list to show the new order
        await fetchOrders()
        
        // Find and select the newly created order
        const newOrder = orders.find(o => o.id === result.data.id)
        if (newOrder) {
          dispatch({ type: 'SET_SELECTED_ORDER', payload: newOrder })
          dispatch({ type: 'SET_ACTIVE_TAB', payload: 'details' })
        }
        
        dispatch({ type: 'SET_SUCCESS', payload: 'Order created successfully' })
      } else {
        throw new Error('Failed to create order - invalid response')
      }

      dispatch({ type: 'SET_SHOW_CREATE_FORM', payload: false })
      dispatch({ type: 'RESET_FORMS' })
      dispatch({ type: 'SET_ERROR', payload: '' })
    } catch (error) {
      console.error('Error in createOrder:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create order' })
    } finally {
      dispatch({ type: 'SET_ACTION_LOADING', payload: null })
    }
  }

  const handleAddLineItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return

    dispatch({ type: 'SET_ACTION_LOADING', payload: 'add_line_item' })

    try {
      const selectedItem = items.find(i => i.id === lineItemFormData.item_id)
      if (!selectedItem) {
        dispatch({ type: 'SET_ERROR', payload: 'Selected item not found' })
        return
      }

      const unitPrice = parseFloat(lineItemFormData.unit_price) || selectedItem.base_price
      const lineTotal = unitPrice * lineItemFormData.quantity

      const newLineItem: OrderLineItem = {
        id: `line-${Date.now()}`,
        item_id: lineItemFormData.item_id,
        item: selectedItem,
        quantity: lineItemFormData.quantity,
        unit_price: unitPrice,
        customizations: {
          fabric: lineItemFormData.customizations.fabric || undefined,
          finish: lineItemFormData.customizations.finish || undefined,
          dimensions: {
            width: lineItemFormData.customizations.width ? parseFloat(lineItemFormData.customizations.width) : undefined,
            depth: lineItemFormData.customizations.depth ? parseFloat(lineItemFormData.customizations.depth) : undefined,
            height: lineItemFormData.customizations.height ? parseFloat(lineItemFormData.customizations.height) : undefined
          },
          notes: lineItemFormData.customizations.notes || undefined
        },
        lead_time_days: lineItemFormData.lead_time_days,
        line_total: lineTotal,
        production_status: 'pending'
      }

      const updatedOrder = {
        ...selectedOrder,
        line_items: [...selectedOrder.line_items, newLineItem]
      }

      // Recalculate totals
      updatedOrder.subtotal = updatedOrder.line_items.reduce((sum, item) => sum + item.line_total, 0)
      updatedOrder.tax_amount = updatedOrder.subtotal * 0.08 // 8% tax
      updatedOrder.total_amount = updatedOrder.subtotal + updatedOrder.tax_amount
      updatedOrder.deposit_amount = updatedOrder.total_amount * (updatedOrder.deposit_percentage / 100)
      updatedOrder.balance_amount = updatedOrder.total_amount - updatedOrder.deposit_amount

      // Update orders list and selected order
      dispatch({ type: 'SET_ORDERS', payload: orders.map(o => o.id === selectedOrder.id ? updatedOrder : o) })
      dispatch({ type: 'SET_SELECTED_ORDER', payload: updatedOrder })

      dispatch({ type: 'SET_SHOW_LINE_ITEM_FORM', payload: false })
      dispatch({ type: 'RESET_FORMS' })
      dispatch({ type: 'SET_ERROR', payload: '' })
    } catch (error) {
      console.error('Error in addLineItem:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add line item' })
    } finally {
      dispatch({ type: 'SET_ACTION_LOADING', payload: null })
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    dispatch({ type: 'SET_ACTION_LOADING', payload: `status-${orderId}` })

    try {
      console.log('Updating order status:', { orderId, newStatus })

      // Update status via API
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Response:', errorData)
        throw new Error(errorData.error || `Failed to update order status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Order status updated successfully:', result)

      // Update local state with new status
      const updatedOrders = orders.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      )

      dispatch({ type: 'SET_ORDERS', payload: updatedOrders })

      if (selectedOrder && selectedOrder.id === orderId) {
        dispatch({ type: 'SET_SELECTED_ORDER', payload: { ...selectedOrder, status: newStatus } })
      }

      dispatch({ type: 'SET_SUCCESS', payload: `Order status updated to ${safeFormatString(newStatus, 'unknown')}` })
    } catch (error) {
      console.error('Error in updateOrderStatus:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update order status' })
    } finally {
      dispatch({ type: 'SET_ACTION_LOADING', payload: null })
    }
  }

  // Reducer for complex state management
  type AppState = {
    orders: Order[]
    projects: Project[]
    items: Item[]
    loading: boolean
    error: string
    success: string
    showCreateForm: boolean
    showLineItemForm: boolean
    _editingOrder: Order | null
    selectedOrder: Order | null
    activeTab: 'list' | 'details'
    actionLoading: string | null
    statusFilter: string
    categoryFilter: string
    projectFilter: string
    orderFormData: OrderFormData
    lineItemFormData: LineItemFormData
  }

  type AppAction =
    | { type: 'SET_ORDERS'; payload: Order[] }
    | { type: 'SET_PROJECTS'; payload: Project[] }
    | { type: 'SET_ITEMS'; payload: Item[] }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string }
    | { type: 'SET_SUCCESS'; payload: string }
    | { type: 'SET_SHOW_CREATE_FORM'; payload: boolean }
    | { type: 'SET_SHOW_LINE_ITEM_FORM'; payload: boolean }
    | { type: 'SET_EDITING_ORDER'; payload: Order | null }
    | { type: 'SET_SELECTED_ORDER'; payload: Order | null }
    | { type: 'SET_ACTIVE_TAB'; payload: 'list' | 'details' }
    | { type: 'SET_ACTION_LOADING'; payload: string | null }
    | { type: 'SET_STATUS_FILTER'; payload: string }
    | { type: 'SET_CATEGORY_FILTER'; payload: string }
    | { type: 'SET_PROJECT_FILTER'; payload: string }
    | { type: 'SET_ORDER_FORM_DATA'; payload: OrderFormData }
    | { type: 'SET_LINE_ITEM_FORM_DATA'; payload: LineItemFormData }
    | { type: 'UPDATE_ORDER_FORM_FIELD'; payload: { field: keyof OrderFormData; value: unknown } }
    | { type: 'UPDATE_LINE_ITEM_FORM_FIELD'; payload: { field: keyof LineItemFormData; value: unknown } }
    | { type: 'SET_FILTERS'; payload: { status: string; category: string; project: string } }
    | { type: 'UPDATE_ORDER_FORM'; payload: { field: keyof OrderFormData; value: unknown } }
    | { type: 'UPDATE_LINE_ITEM_FORM'; payload: { field: keyof LineItemFormData; value: unknown } }
    | { type: 'TOGGLE_CREATE_FORM' }
    | { type: 'TOGGLE_LINE_ITEM_FORM' }
    | { type: 'RESET_FORMS' }
  


  // Destructure state for easier access
  const {
    orders,
    projects,
    items,
    loading,
    error,
    success,
    showCreateForm,
    showLineItemForm,
    selectedOrder,
    activeTab,
    actionLoading,
    statusFilter,
    categoryFilter,
    projectFilter,
    orderFormData,
    lineItemFormData
  } = state

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getProductionStatusColor = (status: string) => {
    switch (status) {
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const viewOrderDetails = (order: Order) => {
    dispatch({ type: 'SET_SELECTED_ORDER', payload: order })
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'details' })
  }

  const backToList = () => {
    dispatch({ type: 'SET_SELECTED_ORDER', payload: null })
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'list' })
  }

  // Line item editing functions
  const handleEditLineItem = (lineItem: OrderLineItem) => {
    setEditingLineItem(lineItem)
    setEditLineItemFormData({
      quantity: lineItem.quantity,
      unit_price: lineItem.unit_price,
      customizations: lineItem.customizations,
      lead_time_days: lineItem.lead_time_days,
      production_status: lineItem.production_status,
      production_notes: lineItem.production_notes || ''
    })
    setShowEditLineItemDialog(true)
  }

  const handleSaveLineItem = async () => {
    if (!editingLineItem || !selectedOrder) return
    
    dispatch({ type: 'SET_ACTION_LOADING', payload: `edit-${editingLineItem.id}` })
    
    try {
      const updatedLineItem = {
        ...editingLineItem,
        ...editLineItemFormData,
        line_total: (editLineItemFormData.quantity || editingLineItem.quantity) * (editLineItemFormData.unit_price || editingLineItem.unit_price)
      }

      const updatedOrder = {
        ...selectedOrder,
        line_items: (selectedOrder.line_items || []).map(item => 
          item.id === editingLineItem.id ? updatedLineItem : item
        )
      }

      // Recalculate totals
      updatedOrder.subtotal = updatedOrder.line_items.reduce((sum, item) => sum + item.line_total, 0)
      updatedOrder.tax_amount = updatedOrder.subtotal * 0.08
      updatedOrder.total_amount = updatedOrder.subtotal + updatedOrder.tax_amount
      updatedOrder.deposit_amount = updatedOrder.total_amount * (updatedOrder.deposit_percentage / 100)
      updatedOrder.balance_amount = updatedOrder.total_amount - updatedOrder.deposit_amount

      // Update state
      dispatch({ type: 'SET_ORDERS', payload: orders.map(o => o.id === selectedOrder.id ? updatedOrder : o) })
      dispatch({ type: 'SET_SELECTED_ORDER', payload: updatedOrder })
      
      setShowEditLineItemDialog(false)
      setEditingLineItem(null)
      setEditLineItemFormData({})
      dispatch({ type: 'SET_SUCCESS', payload: 'Line item updated successfully' })
    } catch (error) {
      console.error('Error in saveLineItem:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update line item' })
    } finally {
      dispatch({ type: 'SET_ACTION_LOADING', payload: null })
    }
  }

  const handleRemoveLineItem = async (lineItemId: string) => {
    if (!selectedOrder) return
    
    dispatch({ type: 'SET_ACTION_LOADING', payload: `remove-${lineItemId}` })
    
    try {
      const updatedOrder = {
        ...selectedOrder,
        line_items: (selectedOrder.line_items || []).filter(item => item.id !== lineItemId)
      }

      // Recalculate totals
      updatedOrder.subtotal = updatedOrder.line_items.reduce((sum, item) => sum + item.line_total, 0)
      updatedOrder.tax_amount = updatedOrder.subtotal * 0.08
      updatedOrder.total_amount = updatedOrder.subtotal + updatedOrder.tax_amount
      updatedOrder.deposit_amount = updatedOrder.total_amount * (updatedOrder.deposit_percentage / 100)
      updatedOrder.balance_amount = updatedOrder.total_amount - updatedOrder.deposit_amount

      dispatch({ type: 'SET_ORDERS', payload: orders.map(o => o.id === selectedOrder.id ? updatedOrder : o) })
      dispatch({ type: 'SET_SELECTED_ORDER', payload: updatedOrder })
      dispatch({ type: 'SET_SUCCESS', payload: 'Line item removed successfully' })
    } catch (error) {
      console.error('Error in removeLineItem:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove line item' })
    } finally {
      dispatch({ type: 'SET_ACTION_LOADING', payload: null })
    }
  }

  // Customer notification functions
  const handleNotifyCustomer = (order: Order) => {
    setNotificationOrder(order)
    setNotificationMessage(`Update on your order #${order.order_number}: `)
    setShowNotificationDialog(true)
  }

  const sendNotification = async () => {
    if (!notificationOrder || !notificationMessage.trim()) return
    
    dispatch({ type: 'SET_ACTION_LOADING', payload: 'notification' })
    
    try {
      const response = await fetch(`/api/orders/${notificationOrder.id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'email', // Default to email
          template: 'custom',
          subject: `Order Update - ${notificationOrder.order_number}`,
          message: notificationMessage
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification')
      }
      
      dispatch({ type: 'SET_SUCCESS', payload: 'Customer notification sent successfully' })
      setShowNotificationDialog(false)
      setNotificationMessage('')
      setNotificationOrder(null)
    } catch (err) {
      console.error('Notification error:', err)
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to send notification' })
    } finally {
      dispatch({ type: 'SET_ACTION_LOADING', payload: null })
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || order.category === categoryFilter
      const matchesProject = projectFilter === 'all' || order.project_id === projectFilter
      return matchesStatus && matchesCategory && matchesProject
    })
  }, [orders, statusFilter, categoryFilter, projectFilter])

  if (activeTab === 'details' && selectedOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={backToList} variant="outline">
              ← Back to Orders
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">{selectedOrder.order_number}</h1>
              <p className="text-slate-600 mt-1">
                {selectedOrder.project?.name} - {selectedOrder.project?.client_name}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              onClick={() => dispatch({ type: 'SET_SHOW_LINE_ITEM_FORM', payload: true })}
              disabled={selectedOrder.status === 'delivered'}
            >
              Add Line Item
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleNotifyCustomer(selectedOrder)}
              disabled={actionLoading === 'notification'}
            >
              <Bell className="h-4 w-4 mr-2" />
              {actionLoading === 'notification' ? 'Sending...' : 'Notify Customer'}
            </Button>
            <Button variant="outline">Generate PDF</Button>
            <Button onClick={() => router.push(`/dashboard/orders/${selectedOrder.id}/edit`)}>Edit Order</Button>
          </div>
        </div>

        {/* Order Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {safeFormatString(selectedOrder.status, 'unknown')}
                </span>
                {selectedOrder.status !== 'delivered' && (
                  <Select 
                    value={selectedOrder.status} 
                    onValueChange={(value) => updateOrderStatus(selectedOrder.id, value as Order['status'])}
                  >
                    <SelectTrigger className="text-xs border border-stone-200 rounded px-2 py-1 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_production">In Production</SelectItem>
                      <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {(selectedOrder.line_items || []).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Order Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(selectedOrder.total_amount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                {safeFormatString(selectedOrder.payment_status, 'unknown')}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Delivery Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {selectedOrder.actual_delivery_date 
                  ? formatDate(selectedOrder.actual_delivery_date)
                  : selectedOrder.estimated_delivery_date 
                    ? `Est: ${formatDate(selectedOrder.estimated_delivery_date)}`
                    : 'TBD'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-600">Category</Label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ml-2 ${getCategoryColor(selectedOrder.category)}`}>
                    {safeFormatString(selectedOrder.category, 'unknown')}
                  </span>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">PO Number</Label>
                  <p className="text-slate-900">{selectedOrder.po_number || '—'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Created Date</Label>
                  <p className="text-slate-900">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Last Updated</Label>
                  <p className="text-slate-900">
                    {selectedOrder.updated_at ? formatDate(selectedOrder.updated_at) : '—'}
                  </p>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <Label className="text-sm font-medium text-slate-600">Internal Notes</Label>
                  <p className="text-slate-900">{selectedOrder.notes}</p>
                </div>
              )}
              {selectedOrder.client_notes && (
                <div>
                  <Label className="text-sm font-medium text-slate-600">Client Notes</Label>
                  <p className="text-slate-900">{selectedOrder.client_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax:</span>
                <span className="font-medium">{formatCurrency(selectedOrder.tax_amount)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Deposit ({selectedOrder.deposit_percentage}%):</span>
                  <span className="font-medium">{formatCurrency(selectedOrder.deposit_amount)}</span>
                </div>
                {selectedOrder.deposit_paid_date && (
                  <div className="text-xs text-primary">
                    Paid: {formatDate(selectedOrder.deposit_paid_date)}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Balance:</span>
                  <span className="font-medium">{formatCurrency(selectedOrder.balance_amount)}</span>
                </div>
                {selectedOrder.balance_paid_date && (
                  <div className="text-xs text-primary">
                    Paid: {formatDate(selectedOrder.balance_paid_date)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Line Items ({(selectedOrder.line_items || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(selectedOrder.line_items || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No line items added yet</p>
                <Button onClick={() => dispatch({ type: 'SET_SHOW_LINE_ITEM_FORM', payload: true })}>
                  Add First Line Item
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Customizations</TableHead>
                    <TableHead>Line Total</TableHead>
                    <TableHead>Production Status</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedOrder.line_items || []).map((lineItem) => (
                    <TableRow key={lineItem.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lineItem.item?.name}</div>
                          <div className="text-sm text-slate-600 font-mono">{lineItem.item?.sku_base}</div>
                          <div className="text-xs text-slate-600">{lineItem.item?.collection_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{lineItem.quantity}</TableCell>
                      <TableCell>{formatCurrency(lineItem.unit_price)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {lineItem.customizations.fabric && (
                            <div><span className="font-medium">Fabric:</span> {lineItem.customizations.fabric}</div>
                          )}
                          {lineItem.customizations.finish && (
                            <div><span className="font-medium">Finish:</span> {lineItem.customizations.finish}</div>
                          )}
                          {lineItem.customizations.dimensions && (
                            <div>
                              <span className="font-medium">Size:</span> {' '}
                              {lineItem.customizations.dimensions.width && `${lineItem.customizations.dimensions.width}"`}
                              {lineItem.customizations.dimensions.depth && ` × ${lineItem.customizations.dimensions.depth}"`}
                              {lineItem.customizations.dimensions.height && ` × ${lineItem.customizations.dimensions.height}"`}
                            </div>
                          )}
                          {lineItem.customizations.notes && (
                            <div className="text-slate-600">{lineItem.customizations.notes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(lineItem.line_total)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getProductionStatusColor(lineItem.production_status)}`}>
                          {safeFormatString(lineItem.production_status, 'pending')}
                        </span>
                        {lineItem.production_notes && (
                          <div className="text-xs text-slate-600 mt-1">{lineItem.production_notes}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{lineItem.lead_time_days} days</div>
                        {lineItem.estimated_completion && (
                          <div className="text-xs text-slate-600">
                            Est: {formatDate(lineItem.estimated_completion)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditLineItem(lineItem)}
                            disabled={actionLoading === `edit-${lineItem.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {actionLoading === `edit-${lineItem.id}` ? 'Editing...' : 'Edit'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRemoveLineItem(lineItem.id)}
                            disabled={actionLoading === `remove-${lineItem.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {actionLoading === `remove-${lineItem.id}` ? 'Removing...' : 'Remove'}
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

        {/* Add Line Item Form */}
        {showLineItemForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add Line Item</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddLineItem} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium text-slate-900 mb-1">Item *</Label>
                    <Select
                      value={lineItemFormData.item_id}
                      onValueChange={(value) => {
                        const selectedItem = items.find(i => i.id === value)
                        dispatch({ 
                          type: 'SET_LINE_ITEM_FORM_DATA', 
                          payload: { 
                            ...lineItemFormData, 
                            item_id: value,
                            unit_price: selectedItem ? selectedItem.base_price.toString() : '',
                            lead_time_days: selectedItem ? selectedItem.lead_time_days : 30
                          }
                        })
                      }}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.sku_base}) - {formatCurrency(item.base_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-slate-900 mb-1">Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={lineItemFormData.quantity}
                      onChange={(e) => dispatch({ type: 'UPDATE_LINE_ITEM_FORM_FIELD', payload: { field: 'quantity', value: parseInt(e.target.value) || 0 } })}
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-slate-900 mb-1">Unit Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={lineItemFormData.unit_price}
                      onChange={(e) => dispatch({ type: 'UPDATE_LINE_ITEM_FORM_FIELD', payload: { field: 'unit_price', value: e.target.value } })}
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-slate-900 mb-1">Lead Time (days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={lineItemFormData.lead_time_days}
                      onChange={(e) => dispatch({ type: 'UPDATE_LINE_ITEM_FORM_FIELD', payload: { field: 'lead_time_days', value: parseInt(e.target.value) } })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Customizations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block text-sm font-medium text-slate-900 mb-1">Fabric</Label>
                      <Input
                        type="text"
                        value={lineItemFormData.customizations.fabric}
                        onChange={(e) => dispatch({ 
                          type: 'SET_LINE_ITEM_FORM_DATA', 
                          payload: { 
                            ...lineItemFormData, 
                            customizations: { ...lineItemFormData.customizations, fabric: e.target.value }
                          }
                        })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-medium text-slate-900 mb-1">Finish</Label>
                      <Input
                        type="text"
                        value={lineItemFormData.customizations.finish}
                        onChange={(e) => dispatch({ 
                          type: 'SET_LINE_ITEM_FORM_DATA', 
                          payload: { 
                            ...lineItemFormData, 
                            customizations: { ...lineItemFormData.customizations, finish: e.target.value }
                          }
                        })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-medium text-slate-900 mb-1">Custom Width</Label>
                      <Input
                        type="number"
                        step="0.25"
                        value={lineItemFormData.customizations.width}
                        onChange={(e) => dispatch({ 
                          type: 'SET_LINE_ITEM_FORM_DATA', 
                          payload: { 
                            ...lineItemFormData, 
                            customizations: { ...lineItemFormData.customizations, width: e.target.value }
                          }
                        })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-medium text-slate-900 mb-1">Custom Depth</Label>
                      <Input
                        type="number"
                        step="0.25"
                        value={lineItemFormData.customizations.depth}
                        onChange={(e) => dispatch({ 
                          type: 'SET_LINE_ITEM_FORM_DATA', 
                          payload: { 
                            ...lineItemFormData, 
                            customizations: { ...lineItemFormData.customizations, depth: e.target.value }
                          }
                        })}
                        className="w-full"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="block text-sm font-medium text-slate-900 mb-1">Customization Notes</Label>
                      <Textarea
                        value={lineItemFormData.customizations.notes}
                        onChange={(e) => dispatch({ 
                          type: 'SET_LINE_ITEM_FORM_DATA', 
                          payload: { 
                            ...lineItemFormData, 
                            customizations: { ...lineItemFormData.customizations, notes: e.target.value }
                          }
                        })}
                        rows={3}
                        className="w-full"
                        placeholder="Special instructions or customization details"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={actionLoading !== null}>
                    {actionLoading === 'add_line_item' ? 'Adding...' : 'Add Line Item'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => dispatch({ type: 'SET_SHOW_LINE_ITEM_FORM', payload: false })}
                    disabled={actionLoading !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <PageWrapper 
      title="Orders"
      description="Manage order fulfillment from confirmation to delivery"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between -mt-4">
          <div></div>
          <div className="flex space-x-2">
            <Button 
              onClick={fetchOrders} 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
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

        {/* Create Order Form */}
        {showCreateForm && (
          <Card>
          <CardHeader>
            <CardTitle>Create New Order</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-slate-900 mb-1">Project *</Label>
                  <Select
                    value={orderFormData.project_id}
                    onValueChange={(value) => dispatch({ type: 'UPDATE_ORDER_FORM_FIELD', payload: { field: 'project_id', value } })}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project, index) => (
                        <SelectItem key={`create-proj-${index}`} value={project.id || ''}>
                          {project.name || 'Unnamed Project'} - {project.client_name || 'No Client'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-slate-900 mb-1">Category *</Label>
                  <Select
                    value={orderFormData.category}
                    onValueChange={(value) => dispatch({ type: 'UPDATE_ORDER_FORM_FIELD', payload: { field: 'category', value: value as Order['category'] } })}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="decking">Decking</SelectItem>
                      <SelectItem value="cladding">Cladding</SelectItem>
                      <SelectItem value="fixtures">Fixtures</SelectItem>
                      <SelectItem value="custom_millwork">Custom Millwork</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-slate-900 mb-1">PO Number</Label>
                  <Input
                    type="text"
                    value={orderFormData.po_number}
                    onChange={(e) => dispatch({ type: 'UPDATE_ORDER_FORM_FIELD', payload: { field: 'po_number', value: e.target.value } })}
                    className="w-full"
                    placeholder="Purchase Order Number"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-slate-900 mb-1">Est. Delivery Date</Label>
                  <Input
                    type="date"
                    value={orderFormData.estimated_delivery_date}
                    onChange={(e) => dispatch({ type: 'UPDATE_ORDER_FORM_FIELD', payload: { field: 'estimated_delivery_date', value: e.target.value } })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-slate-900 mb-1">Internal Notes</Label>
                <Textarea
                  value={orderFormData.notes}
                  onChange={(e) => dispatch({ type: 'UPDATE_ORDER_FORM_FIELD', payload: { field: 'notes', value: e.target.value } })}
                  rows={3}
                  className="w-full"
                  placeholder="Internal notes and specifications"
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-slate-900 mb-1">Client Notes</Label>
                <Textarea
                  value={orderFormData.client_notes}
                  onChange={(e) => dispatch({ type: 'UPDATE_ORDER_FORM_FIELD', payload: { field: 'client_notes', value: e.target.value } })}
                  rows={3}
                  className="w-full"
                  placeholder="Special delivery instructions, client requirements"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={actionLoading !== null}>
                  {actionLoading === 'create' ? 'Creating...' : 'Create Order'}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => dispatch({ type: 'SET_SHOW_CREATE_FORM', payload: false })}
                  disabled={actionLoading !== null}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
          </Card>
        )}

        {/* Filters */}
        <OrdersFilters
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          projectFilter={projectFilter}
          projects={projects}
          onStatusChange={(value) => dispatch({ type: 'SET_STATUS_FILTER', payload: value })}
          onCategoryChange={(value) => dispatch({ type: 'SET_CATEGORY_FILTER', payload: value })}
          onProjectChange={(value) => dispatch({ type: 'SET_PROJECT_FILTER', payload: value })}
        />

        {/* Orders Summary Cards */}
        <OrdersStats 
          orders={filteredOrders}
          formatCurrency={formatCurrency}
        />

        {/* Orders Table */}
        <Card>
        <CardHeader>
          <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading />
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-600 mb-4">No orders found</div>
              <Button onClick={() => dispatch({ type: 'SET_SHOW_CREATE_FORM', payload: true })}>
                Create Your First Order
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Line Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{order.order_number}</div>
                        <div className="text-sm text-slate-600">{order.po_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.project?.name}</div>
                        <div className="text-sm text-slate-600">{order.project?.client_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getCategoryColor(order.category)}`}>
                        {safeFormatString(order.category, 'unknown')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getStatusColor(order.status)}`}>
                        {safeFormatString(order.status, 'unknown')}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {(order.line_items || []).length}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getPaymentStatusColor(order.payment_status)}`}>
                        {safeFormatString(order.payment_status, 'unknown')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.actual_delivery_date 
                          ? formatDate(order.actual_delivery_date)
                          : order.estimated_delivery_date 
                            ? `Est: ${formatDate(order.estimated_delivery_date)}`
                            : 'TBD'
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewOrderDetails(order)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/orders/${order.id}/edit`)}
                        >
                          Edit
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
      </div>

      {/* Line Item Edit Dialog */}
      <Dialog open={showEditLineItemDialog} onOpenChange={setShowEditLineItemDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Line Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={editLineItemFormData.quantity || ''}
                onChange={(e) => setEditLineItemFormData({
                  ...editLineItemFormData,
                  quantity: parseInt(e.target.value) || 0
                })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit_price" className="text-right">
                Unit Price
              </Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={editLineItemFormData.unit_price || ''}
                onChange={(e) => setEditLineItemFormData({
                  ...editLineItemFormData,
                  unit_price: parseFloat(e.target.value) || 0
                })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="production_status" className="text-right">
                Status
              </Label>
              <Select
                value={editLineItemFormData.production_status || ''}
                onValueChange={(value) => setEditLineItemFormData({
                  ...editLineItemFormData,
                  production_status: value as OrderLineItem['production_status']
                })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lead_time_days" className="text-right">
                Lead Time (Days)
              </Label>
              <Input
                id="lead_time_days"
                type="number"
                value={editLineItemFormData.lead_time_days || ''}
                onChange={(e) => setEditLineItemFormData({
                  ...editLineItemFormData,
                  lead_time_days: parseInt(e.target.value) || 0
                })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="production_notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="production_notes"
                value={editLineItemFormData.production_notes || ''}
                onChange={(e) => setEditLineItemFormData({
                  ...editLineItemFormData,
                  production_notes: e.target.value
                })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditLineItemDialog(false)
                setEditingLineItem(null)
                setEditLineItemFormData({})
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveLineItem}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Notification Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Notify Customer - Order #{notificationOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right">
                Message
              </Label>
              <Textarea
                id="message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter notification message for customer..."
                className="col-span-3"
                rows={4}
              />
            </div>
            <div className="col-span-4 text-sm text-slate-600">
              This notification will be sent to {notificationOrder?.project?.client_name}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNotificationDialog(false)
                setNotificationMessage('')
                setNotificationOrder(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={sendNotification}
              disabled={!notificationMessage.trim() || actionLoading === 'notification'}
            >
              {actionLoading === 'notification' ? 'Sending...' : 'Send Notification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}