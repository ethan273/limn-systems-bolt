'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layouts/page-wrapper'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Building2, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Save,
  ArrowLeft,
  Shield,
  CreditCard,
  FileText,
  Truck,
  BarChart3
} from 'lucide-react'
import { safeRender } from '@/lib/utils/safe-render'

interface Customer {
  id: string
  name: string
  company_name?: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  type?: string
  status: 'active' | 'inactive' | 'prospect'
  portal_access?: boolean
  created_at: string
}

interface PortalUser {
  id?: string
  email: string
  fullName: string
  title: string
  phone?: string
  role: 'admin' | 'manager' | 'viewer'
  isPrimaryContact: boolean
}

interface PortalConfiguration {
  portalName: string
  welcomeMessage: string
  primaryColor: string
  
  // Feature toggles
  showDashboard: boolean
  showOrders: boolean
  showShipping: boolean
  showFinancials: boolean
  showDocuments: boolean
  showApprovals: boolean
  showProductionTracking: boolean
  showDesignCenter: boolean
  showSupportTickets: boolean
  
  // Financial settings
  showInvoiceDetails: boolean
  showPaymentHistory: boolean
  showOutstandingBalance: boolean
  allowOnlinePayments: boolean
  
  // Document settings
  allowDocumentUpload: boolean
  allowedFileTypes: string[]
  maxFileSizeMB: number
  requireApprovalForUploads: boolean
  
  // Communication settings
  enableNotifications: boolean
  enableEmailNotifications: boolean
  notificationFrequency: 'immediate' | 'daily' | 'weekly'
  
  // Session settings
  sessionTimeoutMinutes: number
  requireMFA: boolean
}

const defaultConfiguration: PortalConfiguration = {
  portalName: '',
  welcomeMessage: '',
  primaryColor: '#91bdbd',
  
  showDashboard: true,
  showOrders: true,
  showShipping: true,
  showFinancials: false,
  showDocuments: true,
  showApprovals: true,
  showProductionTracking: true,
  showDesignCenter: false,
  showSupportTickets: true,
  
  showInvoiceDetails: false,
  showPaymentHistory: false,
  showOutstandingBalance: false,
  allowOnlinePayments: false,
  
  allowDocumentUpload: true,
  allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
  maxFileSizeMB: 10,
  requireApprovalForUploads: true,
  
  enableNotifications: true,
  enableEmailNotifications: true,
  notificationFrequency: 'immediate',
  
  sessionTimeoutMinutes: 480, // 8 hours
  requireMFA: false
}

export default function CreatePortalPage({ params }: { params: Promise<{ customerId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  
  // Very visible deployment test log
  console.log('🚀 CREATE PORTAL PAGE LOADED - DEPLOYMENT TEST - Customer ID:', resolvedParams.customerId)
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [selectedTab, setSelectedTab] = useState('users')
  const [configuration, setConfiguration] = useState<PortalConfiguration>(defaultConfiguration)
  const [users, setUsers] = useState<PortalUser[]>([])
  const [newUser, setNewUser] = useState<PortalUser>({
    email: '',
    fullName: '',
    title: '',
    phone: '',
    role: 'viewer',
    isPrimaryContact: false
  })

  useEffect(() => {
    loadCustomer()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCustomer = async () => {
    try {
      console.log('🔍 Loading customer with ID:', resolvedParams.customerId)
      console.log('🔍 Making request to:', `/api/customer-by-id?id=${resolvedParams.customerId}`)
      
      const response = await fetch(`/api/customer-by-id?id=${resolvedParams.customerId}`, {
        credentials: 'include'
      })
      
      console.log('🔍 Response status:', response.status)
      const data = await response.json()
      console.log('🔍 Response data:', data)
      
      if (!response.ok) {
        throw new Error(`Failed to load customer: ${response.status} - ${data.error || 'Unknown error'}`)
      }
      
      if (data.success) {
        setCustomer(data.data)
        // Initialize configuration with customer data
        setConfiguration(prev => ({
          ...prev,
          portalName: `${data.data.company_name || data.data.name} Portal`,
          welcomeMessage: `Welcome to your ${data.data.company_name || data.data.name} project portal. Here you can track orders, view documents, and stay updated on your projects.`
        }))
        // Add primary contact as initial user
        setUsers([{
          email: data.data.email,
          fullName: data.data.name,
          title: 'Primary Contact',
          phone: data.data.phone || '',
          role: 'admin',
          isPrimaryContact: true
        }])
      } else {
        throw new Error(data.error || 'Failed to load customer')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer')
    } finally {
      setLoading(false)
    }
  }

  const addUser = () => {
    if (!newUser.email || !newUser.fullName) {
      alert('Please fill in email and full name')
      return
    }

    // Check for duplicate emails
    if (users.some(u => u.email === newUser.email)) {
      alert('A user with this email already exists')
      return
    }

    setUsers([...users, { ...newUser }])
    setNewUser({
      email: '',
      fullName: '',
      title: '',
      phone: '',
      role: 'viewer',
      isPrimaryContact: false
    })
  }

  const removeUser = (index: number) => {
    if (users[index].isPrimaryContact) {
      alert('Cannot remove primary contact')
      return
    }
    setUsers(users.filter((_, i) => i !== index))
  }

  const updateUser = (index: number, field: keyof PortalUser, value: any) => {
    const updatedUsers = [...users]
    updatedUsers[index] = { ...updatedUsers[index], [field]: value }
    setUsers(updatedUsers)
  }

  const createPortal = async () => {
    if (users.length === 0) {
      alert('Please add at least one user')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Create portal configuration
      const portalResponse = await fetch('/api/portal-management/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: resolvedParams.customerId,
          configuration,
          users
        })
      })

      if (!portalResponse.ok) {
        const errorData = await portalResponse.json()
        throw new Error(errorData.error || 'Failed to create portal')
      }

      const portalData = await portalResponse.json()
      
      if (portalData.success) {
        alert('Portal created successfully! Users will receive invitation emails.')
        router.push('/dashboard/clients')
      } else {
        throw new Error(portalData.error || 'Failed to create portal')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portal')
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <PageWrapper title="Create Portal">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading customer details...</p>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (!customer) {
    return (
      <PageWrapper title="Create Portal">
        <div className="text-center py-12">
          <p className="text-red-600">Customer not found</p>
          <Button onClick={() => router.push('/dashboard/clients')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageWrapper 
          title="Create Client Portal"
          description="Set up portal access and permissions for your client"
                  >
          {/* Customer Info Header */}
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-slate-500 mr-4" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {safeRender(customer.company_name) || safeRender(customer.name)}
                  </h2>
                  <p className="text-slate-600">{safeRender(customer.email)}</p>
                  {customer.phone && (
                    <p className="text-sm text-slate-500">{safeRender(customer.phone)}</p>
                  )}
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800" variant="secondary">
                Creating Portal
              </Badge>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users & Access
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Features & Permissions
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Portal Settings
              </TabsTrigger>
            </TabsList>

            {/* Users & Access Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-slate-900">Portal Users</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Add users who will have access to this client portal
                  </p>
                </div>

                <div className="p-6">
                  {/* Existing Users */}
                  <div className="space-y-4 mb-6">
                    {users.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-4 gap-4">
                          <div>
                            <input
                              type="email"
                              value={user.email}
                              onChange={(e) => updateUser(index, 'email', e.target.value)}
                              disabled={user.isPrimaryContact}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                              placeholder="Email"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={user.fullName}
                              onChange={(e) => updateUser(index, 'fullName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              placeholder="Full Name"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={user.title}
                              onChange={(e) => updateUser(index, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              placeholder="Title"
                            />
                          </div>
                          <div>
                            <Select
                              value={user.role}
                              onValueChange={(value) => updateUser(index, 'role', value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="flex items-center ml-4 space-x-2">
                          {user.isPrimaryContact && (
                            <Badge className="bg-blue-100 text-blue-800" variant="secondary">
                              Primary
                            </Badge>
                          )}
                          {!user.isPrimaryContact && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeUser(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New User */}
                  <div className="border-t pt-6">
                    <h4 className="text-md font-medium text-slate-900 mb-4">Add New User</h4>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Email"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newUser.fullName}
                          onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Full Name"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newUser.title}
                          onChange={(e) => setNewUser({ ...newUser, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Title"
                        />
                      </div>
                      <div>
                        <Select
                          value={newUser.role}
                          onValueChange={(value) => setNewUser({ ...newUser, role: value as PortalUser['role'] })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={addUser} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Features & Permissions Tab */}
            <TabsContent value="features" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Features */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Core Features
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showDashboard}
                        onChange={(e) => setConfiguration({ ...configuration, showDashboard: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Dashboard Overview</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showOrders}
                        onChange={(e) => setConfiguration({ ...configuration, showOrders: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Order Tracking</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showProductionTracking}
                        onChange={(e) => setConfiguration({ ...configuration, showProductionTracking: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Production Tracking</span>
                    </label>
                  </div>
                </div>

                {/* Document Features */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Documents & Approvals
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showDocuments}
                        onChange={(e) => setConfiguration({ ...configuration, showDocuments: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Document Library</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showApprovals}
                        onChange={(e) => setConfiguration({ ...configuration, showApprovals: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Design Approvals</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.allowDocumentUpload}
                        onChange={(e) => setConfiguration({ ...configuration, allowDocumentUpload: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Allow Document Upload</span>
                    </label>
                  </div>
                </div>

                {/* Financial Features */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Financial Information
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showFinancials}
                        onChange={(e) => setConfiguration({ ...configuration, showFinancials: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Financial Summary</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showInvoiceDetails}
                        onChange={(e) => setConfiguration({ ...configuration, showInvoiceDetails: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Invoice Details</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.allowOnlinePayments}
                        onChange={(e) => setConfiguration({ ...configuration, allowOnlinePayments: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Online Payments</span>
                    </label>
                  </div>
                </div>

                {/* Shipping & Logistics */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Shipping & Logistics
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showShipping}
                        onChange={(e) => setConfiguration({ ...configuration, showShipping: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Shipping Tracking</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showDesignCenter}
                        onChange={(e) => setConfiguration({ ...configuration, showDesignCenter: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Design Center</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.showSupportTickets}
                        onChange={(e) => setConfiguration({ ...configuration, showSupportTickets: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Support Tickets</span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Portal Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Portal Branding */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Portal Branding</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Portal Name
                      </label>
                      <input
                        type="text"
                        value={configuration.portalName}
                        onChange={(e) => setConfiguration({ ...configuration, portalName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Client Portal Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Welcome Message
                      </label>
                      <textarea
                        value={configuration.welcomeMessage}
                        onChange={(e) => setConfiguration({ ...configuration, welcomeMessage: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Welcome message for portal users"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Primary Color
                      </label>
                      <input
                        type="color"
                        value={configuration.primaryColor}
                        onChange={(e) => setConfiguration({ ...configuration, primaryColor: e.target.value })}
                        className="w-full h-10 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        value={configuration.sessionTimeoutMinutes}
                        onChange={(e) => setConfiguration({ ...configuration, sessionTimeoutMinutes: parseInt(e.target.value) })}
                        min="30"
                        max="1440"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.requireMFA}
                        onChange={(e) => setConfiguration({ ...configuration, requireMFA: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Require Multi-Factor Authentication</span>
                    </label>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.enableNotifications}
                        onChange={(e) => setConfiguration({ ...configuration, enableNotifications: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Enable In-Portal Notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.enableEmailNotifications}
                        onChange={(e) => setConfiguration({ ...configuration, enableEmailNotifications: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Enable Email Notifications</span>
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Notification Frequency
                      </label>
                      <Select
                        value={configuration.notificationFrequency}
                        onValueChange={(value) => setConfiguration({ ...configuration, notificationFrequency: value as PortalConfiguration['notificationFrequency'] })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="daily">Daily Digest</SelectItem>
                          <SelectItem value="weekly">Weekly Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* File Upload Settings */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">File Upload Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Max File Size (MB)
                      </label>
                      <input
                        type="number"
                        value={configuration.maxFileSizeMB}
                        onChange={(e) => setConfiguration({ ...configuration, maxFileSizeMB: parseInt(e.target.value) })}
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={configuration.requireApprovalForUploads}
                        onChange={(e) => setConfiguration({ ...configuration, requireApprovalForUploads: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-600">Require Approval for Uploads</span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <Button
              onClick={() => router.push('/dashboard/clients')}
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <Button
              onClick={createPortal}
              disabled={saving || users.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Portal...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Portal
                </>
              )}
            </Button>
          </div>
        </PageWrapper>
      </div>
    </div>
  )
}