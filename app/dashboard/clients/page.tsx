'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layouts/page-wrapper'
import { Building2, MapPin, Phone, Mail, Calendar, Edit, List, LayoutGrid, ExternalLink } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { safeRender, formatAddress } from '@/lib/utils/safe-render'

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  company_name?: string
  type?: string
  status?: string
  portal_access?: boolean
  address?: string
  city?: string
  state?: string
  zip?: string
  created_at: string
}

export default function ClientsPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTab, setSelectedTab] = useState('kanban')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Project creation modal state
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  
  // Portal creation modal state
  const [showCreatePortalModal, setShowCreatePortalModal] = useState(false)

  // Listen for URL parameters to trigger refresh after edit
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('updated')) {
      // Remove the URL parameter and trigger refresh
      window.history.replaceState({}, '', window.location.pathname)
      setRefreshTrigger(prev => prev + 1)
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // Add cache busting parameter to ensure fresh data
      const cacheBust = refreshTrigger > 0 ? `?_refresh=${Date.now()}` : ''
      const response = await fetch(`/api/customers${cacheBust}`, {
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setCustomers(result.data || [])
        console.log('Loaded', result.data?.length || 0, 'customers from database')
      } else {
        throw new Error(result.error || 'Failed to load customers')
      }
    } catch (err) {
      setError('Failed to load customers')
      console.error('Error loading customers:', err)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [refreshTrigger])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleCreateProject = (customer: Customer) => {
    // Redirect directly to projects page with client info prepopulated
    const clientParams = new URLSearchParams({
      clientId: customer.id,
      clientName: customer.company_name || '',
      clientEmail: String((customer as unknown as Record<string, unknown>).primary_contact_email || '').trim(),
      clientPhone: customer.phone || '',
      clientAddress: [customer.address, customer.city, customer.state, String((customer as unknown as Record<string, unknown>).postal_code || '')].filter(Boolean).join(' '),
      action: 'create'
    })
    router.push(`/dashboard/projects?${clientParams.toString()}`)
  }
  
  const handleCreatePortal = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowCreatePortalModal(true)
  }
  
  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'prospect': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-slate-900'
    }
  }

  const submitCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCustomer || !projectName.trim()) {
      return
    }

    setCreatingProject(true)
    
    try {
      
      const projectData = {
        name: projectName.trim(),
        clientId: selectedCustomer.id, // This will be a proper UUID now
        description: projectDescription.trim(),
        projectType: 'furniture',
        startDate: new Date().toISOString().split('T')[0],
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
        status: 'planning'
      }

      console.log('Creating project with data:', projectData)

      const response = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        console.log('Project created successfully:', result.data)
        setShowCreateProjectModal(false)
        setSelectedCustomer(null)
        setProjectName('')
        setProjectDescription('')
        // Could add success notification here
        alert(`Project "${result.data.name}" created successfully!`)
      } else {
        throw new Error(result.error || 'Failed to create project')
      }
    } catch (err) {
      console.error('Error creating project:', err)
      alert(`Failed to create project: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setCreatingProject(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper title="Clients">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading customers...</p>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageWrapper 
          title="Clients"
          description="Manage your customer relationships and projects"
        >

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {customers.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">No customers found</h3>
            <p className="mt-1 text-sm text-slate-500">Get started by adding your first customer.</p>
          </div>
        )}

        {customers.length > 0 && (
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Card View
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Table View
              </TabsTrigger>
            </TabsList>

            {/* Card/Kanban View */}
            <TabsContent value="kanban" className="space-y-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {customers.map((customer) => (
                  <div key={customer.id} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Building2 className="h-6 w-6 text-slate-500 mr-3" />
                          <h3 className="text-lg font-medium text-slate-900 truncate">
                            {safeRender(customer.company_name) || safeRender(customer.name) || 'Unknown Company'}
                          </h3>
                        </div>
                        <Badge className={getStatusColor(customer.status || 'prospect')} variant="secondary">
                          {customer.status || 'prospect'}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm text-slate-600">
                        {customer.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            <span className="truncate">{safeRender(customer.email)}</span>
                          </div>
                        )}
                        
                        {customer.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            <span>{safeRender(customer.phone)}</span>
                          </div>
                        )}
                        
                        {(customer.address || customer.city || customer.state) && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span className="truncate">
                              {formatAddress({
                                street: safeRender(customer.address),
                                city: safeRender(customer.city), 
                                state: safeRender(customer.state),
                                zip: safeRender(customer.zip)
                              })}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Added {new Date(customer.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="mt-6 flex space-x-2">
                        <button
                          onClick={() => handleCreateProject(customer)}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                          Create Project
                        </button>
                        
                        {!customer.portal_access ? (
                          <button
                            onClick={() => handleCreatePortal(customer)}
                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                          >
                            Create Portal
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push(`/dashboard/portal-management/${customer.id}`)}
                            className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Manage Portal
                          </button>
                        )}
                        
                        <button
                          onClick={() => router.push(`/dashboard/clients/${customer.id}/edit`)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-slate-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Table/List View */}
            <TabsContent value="list" className="space-y-4">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Portal</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 text-slate-500 mr-2" />
                            {safeRender(customer.company_name) || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>{safeRender(customer.name)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {safeRender(customer.email)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.phone ? (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {safeRender(customer.phone)}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          {(customer.city || customer.state) ? (
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {[customer.city, customer.state].filter(Boolean).join(', ')}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(customer.status || 'prospect')} variant="secondary">
                            {customer.status || 'prospect'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {customer.portal_access ? (
                            <Badge className="bg-green-100 text-green-800" variant="secondary">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-slate-900" variant="secondary">
                              None
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleCreateProject(customer)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                              title="Create Project"
                            >
                              Project
                            </button>
                            
                            {!customer.portal_access ? (
                              <button
                                onClick={() => handleCreatePortal(customer)}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                title="Create Portal"
                              >
                                Portal
                              </button>
                            ) : (
                              <button
                                onClick={() => router.push(`/dashboard/portal-management/${customer.id}`)}
                                className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                                title="Manage Portal"
                              >
                                Manage
                              </button>
                            )}
                            
                            <button
                              onClick={() => router.push(`/dashboard/clients/${customer.id}/edit`)}
                              className="px-2 py-1 border border-gray-300 text-slate-600 rounded text-xs hover:bg-gray-50 transition-colors"
                              title="Edit Customer"
                            >
                              Edit
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Create Project Modal */}
        {showCreateProjectModal && selectedCustomer && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-slate-900 mb-4">
                  Create New Project
                </h3>
                
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-slate-600">
                    <strong>Client:</strong> {selectedCustomer.company_name || selectedCustomer.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    ID: {selectedCustomer.id}
                  </p>
                </div>

                <form onSubmit={submitCreateProject} className="space-y-4">
                  <div>
                    <label htmlFor="projectName" className="block text-sm font-medium text-slate-600 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter project name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="projectDescription" className="block text-sm font-medium text-slate-600 mb-1">
                      Description
                    </label>
                    <textarea
                      id="projectDescription"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional project description"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={creatingProject || !projectName.trim()}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creatingProject ? 'Creating...' : 'Create Project'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateProjectModal(false)
                        setSelectedCustomer(null)
                        setProjectName('')
                        setProjectDescription('')
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-slate-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Create Portal Modal */}
        {showCreatePortalModal && selectedCustomer && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-slate-900 mb-4">
                  Create Client Portal
                </h3>
                
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-slate-600">
                    <strong>Client:</strong> {selectedCustomer.company_name || selectedCustomer.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Email: {selectedCustomer.email}
                  </p>
                </div>

                <div className="mb-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">
                        Portal Features
                      </h4>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Order tracking and status updates</li>
                          <li>Document sharing and approvals</li>
                          <li>Production progress monitoring</li>
                          <li>Direct communication with your team</li>
                          <li>Delivery scheduling and coordination</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-6">
                  Creating a portal will enable your client to access their project information,
                  track progress, and collaborate more effectively. You&apos;ll be able to manage
                  permissions and customize what they can see.
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      // Navigate to portal creation form
                      router.push(`/dashboard/portal-management/create/${selectedCustomer.id}`)
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    Create Portal
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreatePortalModal(false)
                      setSelectedCustomer(null)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-slate-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </PageWrapper>
      </div>
    </div>
  )
}