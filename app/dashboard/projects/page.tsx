'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageWrapper } from '@/components/layouts/page-wrapper'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface Client {
  id: string
  company_name: string
}

interface Order {
  id: string
  order_number: string
  category: 'furniture' | 'decking' | 'cladding' | 'fixtures' | 'custom_millwork'
  description: string
  estimated_value: number
  actual_value?: number
  status: 'pending' | 'approved' | 'in_production' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  deposit_amount: number
  balance_amount: number
  deposit_paid_date?: string
  balance_paid_date?: string
  payment_status: 'pending' | 'deposit_paid' | 'fully_paid'
  estimated_delivery?: string
  actual_delivery?: string
  po_number?: string
  created_at: string
  updated_at?: string
  notes?: string
}

interface Milestone {
  id: string
  name: string
  description?: string
  due_date: string
  completed_date?: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  responsible_person?: string
}

interface ProjectDocument {
  id: string
  name: string
  type: 'contract' | 'drawing' | 'specification' | 'photo' | 'other'
  file_url: string
  uploaded_date: string
  uploaded_by: string
  size?: string
}

interface Project {
  id: string
  name: string
  client_id: string
  client_name: string
  description?: string
  status: 'planning' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  start_date: string
  estimated_end_date?: string
  actual_end_date?: string
  room_assignments?: string[]
  space_details?: string
  project_manager: string
  estimated_budget: number
  actual_budget: number
  orders: Order[]
  milestones: Milestone[]
  documents: ProjectDocument[]
  created_at: string
  updated_at?: string
  notes?: string
}

interface ProjectFormData {
  name: string
  client_id: string
  description: string
  status: 'planning' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  start_date: string
  estimated_end_date: string
  room_assignments: string
  space_details: string
  project_manager: string
  estimated_budget: string
  notes: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  // editingProject and setEditingProject removed as they are unused
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'details'>('list')
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    client_id: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    start_date: '',
    estimated_end_date: '',
    room_assignments: '',
    space_details: '',
    project_manager: '',
    estimated_budget: '',
    notes: ''
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/customers', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to access clients.')
        }
        throw new Error(`Failed to fetch clients: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const customers = data.data || []
      
      // Map customers to client interface
      const clients = customers
        .filter((customer: unknown) => (customer as { is_active?: boolean }).is_active !== false)
        .map((customer: unknown) => {
          const cust = customer as { id: string; company_name?: string; name?: string }
          return {
            id: cust.id,
            company_name: cust.company_name || cust.name || 'Unknown Company'
          }
        })

      setClients(clients)
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    }
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      
      // Fetch projects from database
      const response = await fetch('/api/projects', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to access projects.')
        }
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const projects = data.data || []
      
      // Map projects to the expected interface
      const mappedProjects = projects
        .filter((project: unknown) => (project as { is_active?: boolean }).is_active !== false)
        .map((project: unknown) => {
          const proj = project as {
            id: string
            name?: string
            project_name?: string
            client_id?: string
            customer_id?: string
            client_name?: string
            customer_name?: string
            description?: string
            project_description?: string
            status?: string
            priority?: string
            start_date?: string
            estimated_end_date?: string
            target_completion_date?: string
            actual_end_date?: string
            actual_completion_date?: string
            room_assignments?: string[]
            space_details?: string
            scope_of_work?: string
            project_manager?: string
            assigned_pm?: string
            estimated_budget?: number
            budget_estimate?: number
            actual_budget?: number
            actual_cost?: number
            created_at?: string
            updated_at?: string
            last_modified?: string
            notes?: string
            additional_notes?: string
          }
          return {
            id: proj.id,
            name: proj.name || proj.project_name || 'Unnamed Project',
            client_id: proj.client_id || proj.customer_id || '',
            client_name: proj.client_name || proj.customer_name || 'Unknown Client',
            description: proj.description || proj.project_description || '',
            status: (proj.status || 'planning') as Project['status'],
            priority: (proj.priority || 'medium') as Project['priority'],
            start_date: proj.start_date || new Date().toISOString().split('T')[0],
            estimated_end_date: proj.estimated_end_date || proj.target_completion_date,
            actual_end_date: proj.actual_end_date || proj.actual_completion_date,
            room_assignments: proj.room_assignments || [],
            space_details: proj.space_details || proj.scope_of_work || '',
            project_manager: proj.project_manager || proj.assigned_pm || '',
            estimated_budget: proj.estimated_budget || proj.budget_estimate || 0,
            actual_budget: proj.actual_budget || proj.actual_cost || 0,
            orders: [], // Orders will be loaded separately when viewing project details
            milestones: [], // Milestones will be loaded separately when viewing project details
            documents: [], // Documents will be loaded separately when viewing project details
            created_at: proj.created_at || new Date().toISOString(),
            updated_at: proj.updated_at || proj.last_modified,
            notes: proj.notes || proj.additional_notes || ''
          }
        })

      setProjects(mappedProjects)
      setError('')
      console.log('Projects: Successfully loaded', mappedProjects.length, 'projects')
    } catch (err) {
      setError('Failed to load projects')
      console.error('Projects: Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
    fetchClients()
  }, [])

  // Handle URL parameters for auto-population from Clients page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const clientId = urlParams.get('clientId')
    const clientName = urlParams.get('clientName')
    const action = urlParams.get('action')
    
    if (action === 'create' && clientId) {
      // Auto-populate form with client data
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        name: `${clientName} Project` || 'New Project',
        project_manager: 'ethan@limn.us.com',
        start_date: new Date().toISOString().split('T')[0],
        estimated_end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days from now
      }))
      
      // Open the create form
      setShowCreateForm(true)
      
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading('create')

    try {
      console.log('Creating project with data:', formData)

      // Prepare data for API based on database schema
      const projectData = {
        project_name: formData.name,
        customer_id: formData.client_id, // Use customer_id to match DB schema
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        start_date: formData.start_date,
        estimated_completion_date: formData.estimated_end_date || null,
        budget_estimate: parseFloat(formData.estimated_budget) || 0,
        project_manager: formData.project_manager || null,
        scope_of_work: formData.space_details || null,
        additional_notes: formData.notes || null
      }

      console.log('Sending project data to API:', projectData)

      // Create project via API
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(projectData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Response:', errorData)
        throw new Error(errorData.error || `Failed to create project: ${response.status}`)
      }

      const result = await response.json()
      console.log('Project created successfully:', result)

      // Reset form and refresh data
      setShowCreateForm(false)
      setFormData({
        name: '',
        client_id: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        start_date: '',
        estimated_end_date: '',
        room_assignments: '',
        space_details: '',
        project_manager: '',
        estimated_budget: '',
        notes: ''
      })
      setError('')

      // Refresh projects list from database
      await fetchProjects()
    } catch (error) {
      console.error('Error creating project:', error)
      setError(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setActionLoading(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const createOrder = (project: Project, event?: React.MouseEvent) => {
    console.log('CreateOrder function called!')
    console.log('Creating order for project:', project.id)
    console.log('Project details:', project)
    
    // Prevent any default behavior
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    const targetUrl = `/dashboard/orders/create?project_id=${project.id}`
    console.log('Navigating to:', targetUrl)
    
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
      try {
        console.log('Attempting router.push...')
        router.push(targetUrl)
        console.log('Router.push executed successfully')
      } catch (error) {
        console.error('Router.push failed:', error)
        console.log('Falling back to window.location.href')
        // Fallback to window.location
        window.location.href = targetUrl
      }
    }, 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-stone-100 text-stone-700'
      case 'approved': return 'bg-blue-100 text-blue-700'
      case 'in_progress': return 'bg-amber-100 text-amber-700'
      case 'on_hold': return 'bg-orange-100 text-orange-700'
      case 'completed': return 'bg-primary/10 text-primary'
      case 'cancelled': return 'bg-red-100 text-red-700'
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'furniture': return 'bg-blue-100 text-blue-700'
      case 'decking': return 'bg-emerald-100 text-emerald-700'
      case 'cladding': return 'bg-purple-100 text-purple-700'
      case 'fixtures': return 'bg-amber-100 text-amber-700'
      case 'custom_millwork': return 'bg-rose-100 text-rose-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-stone-100 text-stone-700'
      case 'approved': return 'bg-blue-100 text-blue-700'
      case 'in_production': return 'bg-amber-100 text-amber-700'
      case 'shipped': return 'bg-purple-100 text-purple-700'
      case 'delivered': return 'bg-emerald-100 text-emerald-700'
      case 'completed': return 'bg-primary/10 text-primary'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-stone-100 text-stone-700'
      case 'deposit_paid': return 'bg-amber-100 text-amber-700'
      case 'fully_paid': return 'bg-primary/10 text-primary'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-stone-100 text-stone-700'
      case 'in_progress': return 'bg-amber-100 text-amber-700'
      case 'completed': return 'bg-primary/10 text-primary'
      case 'overdue': return 'bg-red-100 text-red-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const viewProjectDetails = (project: Project) => {
    setSelectedProject(project)
    setActiveTab('details')
  }

  const backToList = () => {
    setSelectedProject(null)
    setActiveTab('list')
  }

  const calculateProjectTotals = (project: Project) => {
    const totalEstimated = project.orders.reduce((sum, order) => sum + order.estimated_value, 0)
    const totalActual = project.orders.reduce((sum, order) => sum + (order.actual_value || order.estimated_value), 0)
    const totalPaid = project.orders.reduce((sum, order) => {
      if (order.payment_status === 'fully_paid') return sum + (order.actual_value || order.estimated_value)
      if (order.payment_status === 'deposit_paid') return sum + order.deposit_amount
      return sum
    }, 0)
    
    return { totalEstimated, totalActual, totalPaid }
  }

  if (activeTab === 'details' && selectedProject) {
    const { totalEstimated, totalActual, totalPaid } = calculateProjectTotals(selectedProject)

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={backToList} variant="outline">
              ← Back to Projects
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">{selectedProject.name}</h1>
              <p className="text-slate-600 mt-1">{selectedProject.client_name}</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              onClick={() => router.push(`/dashboard/projects/${selectedProject.id}/edit`)}
            >
              Edit Project
            </Button>
            <Button>New Order</Button>
          </div>
        </div>

        {/* Project Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(selectedProject.status)}`}>
                {safeFormatString(selectedProject.status, 'planning')}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {(selectedProject.orders || []).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Estimated Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(totalEstimated)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Actual Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(totalActual)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Amount Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary mb-1">
                {formatCurrency(totalPaid)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Project Manager</label>
                  <p className="text-slate-900">{selectedProject.project_manager}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Priority</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getPriorityColor(selectedProject.priority)}`}>
                    {(selectedProject.priority || "").charAt(0).toUpperCase() + (selectedProject.priority || "").slice(1)}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Start Date</label>
                  <p className="text-slate-900">{formatDate(selectedProject.start_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">End Date</label>
                  <p className="text-slate-900">
                    {selectedProject.actual_end_date 
                      ? formatDate(selectedProject.actual_end_date)
                      : selectedProject.estimated_end_date 
                        ? `Est. ${formatDate(selectedProject.estimated_end_date)}`
                        : '—'
                    }
                  </p>
                </div>
              </div>
              {selectedProject.description && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Description</label>
                  <p className="text-slate-900">{selectedProject.description}</p>
                </div>
              )}
              {selectedProject.space_details && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Space Details</label>
                  <p className="text-slate-900">{selectedProject.space_details}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Estimated Budget:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(selectedProject.estimated_budget)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Actual Budget:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(selectedProject.actual_budget)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Order Total (Est.):</span>
                  <span className="font-medium text-slate-900">{formatCurrency(totalEstimated)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Order Total (Actual):</span>
                  <span className="font-medium text-slate-900">{formatCurrency(totalActual)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Amount Paid:</span>
                    <span className="font-bold text-primary">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Remaining:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalActual - totalPaid)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Assignments */}
        {selectedProject.room_assignments && (selectedProject.room_assignments || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Room Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(selectedProject.room_assignments || []).map((room, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-md bg-stone-100 text-stone-700 text-sm">
                    {room}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Orders - CRITICAL FEATURE */}
        <Card>
          <CardHeader>
            <CardTitle>Project Orders ({(selectedProject.orders || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(selectedProject.orders || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No orders for this project yet</p>
                <Button>Create First Order</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedProject.orders || []).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getCategoryColor(order.category)}`}>
                          {safeFormatString(order.category, 'furniture')}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={order.description}>
                          {order.description}
                        </div>
                        {order.po_number && (
                          <div className="text-xs text-slate-600">PO: {order.po_number}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {formatCurrency(order.actual_value || order.estimated_value)}
                          </div>
                          {order.actual_value && order.actual_value !== order.estimated_value && (
                            <div className="text-xs text-slate-600">
                              Est: {formatCurrency(order.estimated_value)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getOrderStatusColor(order.status)}`}>
                          {safeFormatString(order.status, 'pending')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getPaymentStatusColor(order.payment_status)}`}>
                            {safeFormatString(order.payment_status, 'pending')}
                          </span>
                          <div className="text-xs text-slate-600">
                            Deposit: {formatCurrency(order.deposit_amount)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.actual_delivery 
                            ? formatDate(order.actual_delivery)
                            : order.estimated_delivery 
                              ? `Est: ${formatDate(order.estimated_delivery)}`
                              : '—'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm">View</Button>
                          <Button 
                            variant="outline" 
                            size="sm"
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

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Project Milestones ({(selectedProject.milestones || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(selectedProject.milestones || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No milestones defined</p>
                <Button variant="outline">Add Milestone</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {(selectedProject.milestones || []).map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-medium text-slate-900">{milestone.name}</h3>
                          {milestone.description && (
                            <p className="text-sm text-slate-600">{milestone.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-slate-600">
                              Due: {formatDate(milestone.due_date)}
                            </span>
                            {milestone.completed_date && (
                              <span className="text-xs text-slate-600">
                                Completed: {formatDate(milestone.completed_date)}
                              </span>
                            )}
                            {milestone.responsible_person && (
                              <span className="text-xs text-slate-600">
                                Assigned: {milestone.responsible_person}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getMilestoneStatusColor(milestone.status)}`}>
                        {safeFormatString(milestone.status, 'pending')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Project Documents ({(selectedProject.documents || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(selectedProject.documents || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No documents uploaded</p>
                <Button variant="outline">Upload Document</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {(selectedProject.documents || []).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-stone-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`px-2 py-1 rounded text-xs ${
                        doc.type === 'contract' ? 'bg-red-100 text-red-700' :
                        doc.type === 'drawing' ? 'bg-blue-100 text-blue-700' :
                        doc.type === 'specification' ? 'bg-amber-100 text-amber-700' :
                        doc.type === 'photo' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {doc.type}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{doc.name}</p>
                        <p className="text-xs text-slate-600">
                          Uploaded by {doc.uploaded_by} on {formatDate(doc.uploaded_date)}
                          {doc.size && ` • ${doc.size}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Download</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {selectedProject.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Project Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-900">{selectedProject.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <PageWrapper 
      title="Projects"
      description="Manage projects with multiple orders and track progress"
    >
      {/* Header Actions */}
      <div className="flex items-center justify-between -mt-4 mb-8">
        <div></div>
        <div className="flex gap-3">
          <Button 
            onClick={fetchProjects} 
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={() => {
              setShowCreateForm(true)
            }}
            disabled={actionLoading !== null}
          >
            New Project
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

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProject} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-1">
                    Project Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label htmlFor="client_id" className="block text-sm font-medium text-slate-900 mb-1">
                    Client *
                  </label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-slate-900 mb-1">
                    Status *
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as Project['status'] })}
                  >
                    <SelectTrigger className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-slate-900 mb-1">
                    Priority *
                  </label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value as Project['priority'] })}
                  >
                    <SelectTrigger className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-slate-900 mb-1">
                    Start Date *
                  </label>
                  <input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="estimated_end_date" className="block text-sm font-medium text-slate-900 mb-1">
                    Estimated End Date
                  </label>
                  <input
                    id="estimated_end_date"
                    type="date"
                    value={formData.estimated_end_date}
                    onChange={(e) => setFormData({ ...formData, estimated_end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="project_manager" className="block text-sm font-medium text-slate-900 mb-1">
                    Project Manager
                  </label>
                  <input
                    id="project_manager"
                    type="text"
                    value={formData.project_manager}
                    onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Assign project manager"
                  />
                </div>

                <div>
                  <label htmlFor="estimated_budget" className="block text-sm font-medium text-slate-900 mb-1">
                    Estimated Budget
                  </label>
                  <input
                    id="estimated_budget"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimated_budget}
                    onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-900 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Project description"
                />
              </div>

              <div>
                <label htmlFor="room_assignments" className="block text-sm font-medium text-slate-900 mb-1">
                  Room Assignments
                </label>
                <input
                  id="room_assignments"
                  type="text"
                  value={formData.room_assignments}
                  onChange={(e) => setFormData({ ...formData, room_assignments: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Comma-separated room names"
                />
              </div>

              <div>
                <label htmlFor="space_details" className="block text-sm font-medium text-slate-900 mb-1">
                  Space Details
                </label>
                <textarea
                  id="space_details"
                  value={formData.space_details}
                  onChange={(e) => setFormData({ ...formData, space_details: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Square footage, special requirements, etc."
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-slate-900 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Additional project notes"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit"
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'create' ? 'Creating...' : 'Create Project'}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  disabled={actionLoading !== null}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Projects Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {projects.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary mb-1">
              {projects.filter(p => ['approved', 'in_progress'].includes(p.status)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {projects.reduce((sum, p) => sum + (p.orders || []).length, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(projects.reduce((sum, p) => {
                const projectTotal = p.orders.reduce((orderSum, order) => orderSum + (order.actual_value || order.estimated_value), 0)
                return sum + projectTotal
              }, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <div className="text-slate-600">Loading projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-600 mb-4">No projects found</div>
              <Button onClick={() => setShowCreateForm(true)}>
                Create Your First Project
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project, index) => {
                  const { totalEstimated, totalActual } = calculateProjectTotals(project)
                  return (
                    <TableRow key={`project-table-row-${index}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">{project.name}</div>
                          <div className="text-sm text-slate-600">{project.project_manager}</div>
                        </div>
                      </TableCell>
                      <TableCell>{project.client_name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getStatusColor(project.status)}`}>
                          {safeFormatString(project.status, 'planning')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getPriorityColor(project.priority)}`}>
                          {(project.priority || "").charAt(0).toUpperCase() + (project.priority || "").slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{(project.orders || []).length}</div>
                        <div className="text-xs text-slate-600">
                          {(project.orders || []).filter(o => o.status === 'completed').length} completed
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(totalActual)}</div>
                        {totalEstimated !== totalActual && (
                          <div className="text-xs text-slate-600">Est: {formatCurrency(totalEstimated)}</div>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(project.start_date)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewProjectDetails(project)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => createOrder(project, e)}
                          >
                            + Create Order
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  )
}