'use client'
 

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layouts/page-wrapper'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Building2, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Save,
  ArrowLeft,
  Eye,
  EyeOff,
  ExternalLink,
  Clock,
  Activity,
  BarChart3,
  UserCheck,
  AlertTriangle,
  MessageSquare,
  Send,
  Mail
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
  portal_created_at?: string
  created_at: string
}

interface PortalUser {
  id: string
  email: string
  full_name: string
  title?: string
  phone?: string
  portal_role: 'admin' | 'manager' | 'viewer'
  is_active: boolean
  is_primary_contact: boolean
  last_login?: string
  login_count: number
  password_reset_required: boolean
  created_at: string
}

interface PortalConfiguration {
  id: string
  customer_id: string
  portal_name: string
  welcome_message?: string
  primary_color: string
  
  // Feature toggles
  show_dashboard: boolean
  show_orders: boolean
  show_shipping: boolean
  show_financials: boolean
  show_documents: boolean
  show_approvals: boolean
  show_production_tracking: boolean
  show_design_center: boolean
  show_support_tickets: boolean
  
  // Financial settings
  show_invoice_details: boolean
  show_payment_history: boolean
  show_outstanding_balance: boolean
  allow_online_payments: boolean
  
  // Document settings
  allow_document_upload: boolean
  allowed_file_types: string[]
  max_file_size_mb: number
  require_approval_for_uploads: boolean
  
  // Communication settings
  enable_notifications: boolean
  enable_email_notifications: boolean
  notification_frequency: 'immediate' | 'daily' | 'weekly'
  
  // Session settings
  session_timeout_minutes: number
  require_mfa: boolean
  
  created_at: string
  updated_at?: string
}

interface PortalSession {
  id: string
  portal_user_id: string
  user_name: string
  ip_address: string
  started_at: string
  last_activity: string
  is_active: boolean
  pages_visited: string[]
  device_info: unknown
}

interface PortalStats {
  total_users: number
  active_users: number
  active_sessions: number
  total_logins: number
  last_activity: string
}

export default function PortalManagementPage({ params }: { params: Promise<{ customerId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [configuration, setConfiguration] = useState<PortalConfiguration | null>(null)
  const [users, setUsers] = useState<PortalUser[]>([])
  const [sessions, setSessions] = useState<PortalSession[]>([])
  const [stats, setStats] = useState<PortalStats | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedTab, setSelectedTab] = useState('overview')
  
  const [newUser, setNewUser] = useState<Partial<PortalUser>>({
    email: '',
    full_name: '',
    title: '',
    phone: '',
    portal_role: 'viewer',
    is_primary_contact: false
  })
  
  // Invitation modal state
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [invitationType, setInvitationType] = useState<'email' | 'sms'>('email')
  const [selectedUser, setSelectedUser] = useState<PortalUser | null>(null)
  const [invitationMessage, setInvitationMessage] = useState('')
  const [sendingInvitation, setSendingInvitation] = useState(false)

  useEffect(() => {
    loadPortalData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPortalData = async () => {
    try {
      setLoading(true)
      
      // Load customer data
      console.log('🔍 [MANAGE PORTAL] Loading customer with ID:', resolvedParams.customerId)
      console.log('🔍 [MANAGE PORTAL] Making request to:', `/api/customer-by-id?id=${resolvedParams.customerId}`)
      
      const customerResponse = await fetch(`/api/customer-by-id?id=${resolvedParams.customerId}`, {
        credentials: 'include'
      })
      
      console.log('🔍 [MANAGE PORTAL] Response status:', customerResponse.status)
      
      if (customerResponse.ok) {
        const customerData = await customerResponse.json()
        console.log('🔍 [MANAGE PORTAL] Response data:', customerData)
        if (customerData.success) {
          setCustomer(customerData.data)
          console.log('✅ [MANAGE PORTAL] Customer loaded successfully:', customerData.data.name)
        } else {
          console.log('❌ [MANAGE PORTAL] Customer data unsuccessful:', customerData)
        }
      } else {
        const errorData = await customerResponse.text()
        console.log('❌ [MANAGE PORTAL] API error response:', errorData)
      }
      
      // TODO: Implement real API calls for portal management
      // For now, show empty states until APIs are implemented

      setConfiguration(null)
      setUsers([])
      setSessions([])
      setStats({
        total_users: 0,
        active_users: 0,
        active_sessions: 0,
        total_logins: 0,
        last_activity: new Date().toISOString()
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portal data')
    } finally {
      setLoading(false)
    }
  }

  const togglePortalAccess = async () => {
    if (!customer) return
    
    const newStatus = !customer.portal_access
    setSaving(true)
    
    try {
      // Here you would make an API call to toggle portal access
      // For now, just update local state
      setCustomer({ ...customer, portal_access: newStatus })
      
      alert(newStatus ? 'Portal activated successfully' : 'Portal deactivated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update portal status')
    } finally {
      setSaving(false)
    }
  }

  const addUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      alert('Please fill in email and full name')
      return
    }

    // Check for duplicate emails
    if (users.some(u => u.email === newUser.email)) {
      alert('A user with this email already exists')
      return
    }

    // Here you would make an API call to add the user
    // For now, just add to local state
    const user: PortalUser = {
      id: `user-${Date.now()}`,
      email: newUser.email,
      full_name: newUser.full_name,
      title: newUser.title || '',
      phone: newUser.phone || '',
      portal_role: newUser.portal_role || 'viewer',
      is_active: true,
      is_primary_contact: false,
      login_count: 0,
      password_reset_required: true,
      created_at: new Date().toISOString()
    }

    setUsers([...users, user])
    setNewUser({
      email: '',
      full_name: '',
      title: '',
      phone: '',
      portal_role: 'viewer',
      is_primary_contact: false
    })
    
    alert('User added successfully. Use the Send Login buttons to invite them.')
  }

  const removeUser = async (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user?.is_primary_contact) {
      alert('Cannot remove primary contact')
      return
    }
    
    if (confirm('Are you sure you want to remove this user?')) {
      setUsers(users.filter(u => u.id !== userId))
      alert('User removed successfully')
    }
  }

  const updateUserStatus = async (userId: string, isActive: boolean) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, is_active: isActive } : u
    ))
    alert(`User ${isActive ? 'activated' : 'deactivated'} successfully`)
  }

  const openInvitationModal = (user: PortalUser, type: 'email' | 'sms') => {
    setSelectedUser(user)
    setInvitationType(type)
    
    // Set default message based on type
    const portalName = configuration?.portal_name || 'Client Portal'
    const defaultMessage = type === 'email' 
      ? `Hi ${user.full_name}!\n\nYou've been invited to access your ${portalName}. This portal allows you to:\n\n• Track your project progress\n• Review and approve designs\n• Access important documents\n• Communicate with our team\n\nClick the link below to get started:\n{{PORTAL_LINK}}\n\nIf you have any questions, feel free to contact us.\n\nBest regards,\nThe Limn Team`
      : `Hi ${user.full_name}! You've been invited to access your ${portalName}. Click here to get started: {{PORTAL_LINK}}`
    
    setInvitationMessage(defaultMessage)
    setShowInvitationModal(true)
  }
  
  const sendInvitation = async () => {
    if (!selectedUser || !invitationMessage.trim()) {
      alert('Please enter a message')
      return
    }
    
    setSendingInvitation(true)
    
    try {
      // Call the appropriate API endpoint
      const endpoint = invitationType === 'email' ? '/api/invitations/email' : '/api/invitations/sms'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedUser.id,
          customerId: resolvedParams.customerId,
          portalId: configuration?.id,
          message: invitationMessage,
          recipientInfo: {
            email: selectedUser.email,
            phone: selectedUser.phone,
            fullName: selectedUser.full_name,
            role: selectedUser.portal_role
          }
        })
      })
      
      if (response.ok) {
        await response.json()
        alert(`${invitationType.toUpperCase()} invitation sent successfully!`)
        setShowInvitationModal(false)
        setSelectedUser(null)
        setInvitationMessage('')
      } else {
        const error = await response.json()
        alert(`Failed to send ${invitationType} invitation: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert(`Failed to send ${invitationType} invitation. Please try again.`)
    } finally {
      setSendingInvitation(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-yellow-100 text-yellow-800'
      case 'viewer': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-slate-900'
    }
  }


  if (loading) {
    return (
      <PageWrapper title="Portal Management">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading portal data...</p>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (!customer) {
    return (
      <PageWrapper title="Portal Management">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageWrapper 
          title="Portal Management"
          description="Manage client portal access, users, and settings"
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
              <div className="flex items-center space-x-4">
                {customer.portal_access ? (
                  <Badge className="bg-green-100 text-green-800" variant="secondary">
                    Portal Active
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800" variant="secondary">
                    Portal Inactive
                  </Badge>
                )}
                <Button
                  onClick={togglePortalAccess}
                  disabled={saving}
                  variant={customer.portal_access ? "outline" : "default"}
                  size="sm"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : customer.portal_access ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {customer.portal_access ? 'Deactivate Portal' : 'Activate Portal'}
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Total Users</p>
                      <p className="text-2xl font-semibold text-slate-900">{stats?.total_users || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <UserCheck className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Active Users</p>
                      <p className="text-2xl font-semibold text-slate-900">{stats?.active_users || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Active Sessions</p>
                      <p className="text-2xl font-semibold text-slate-900">{stats?.active_sessions || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Total Logins</p>
                      <p className="text-2xl font-semibold text-slate-900">{stats?.total_logins || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setSelectedTab('users')}
                    variant="outline" 
                    className="flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Portal User
                  </Button>
                  <Button 
                    onClick={() => window.open('/portal', '_blank')}
                    variant="outline" 
                    className="flex items-center justify-center"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Client Portal
                  </Button>
                  <Button 
                    onClick={() => setSelectedTab('settings')}
                    variant="outline" 
                    className="flex items-center justify-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Portal
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-slate-900">Portal Users</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Manage users who have access to this client portal
                  </p>
                </div>

                <div className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Logins</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.full_name}</div>
                              <div className="text-sm text-slate-500">{user.email}</div>
                              {user.title && (
                                <div className="text-xs text-slate-500">{user.title}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(user.portal_role)} variant="secondary">
                              {user.portal_role}
                            </Badge>
                            {user.is_primary_contact && (
                              <Badge className="bg-blue-100 text-blue-800 ml-1" variant="secondary">
                                Primary
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.is_active ? (
                              <Badge className="bg-green-100 text-green-800" variant="secondary">
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800" variant="secondary">
                                Inactive
                              </Badge>
                            )}
                            {user.password_reset_required && (
                              <Badge className="bg-yellow-100 text-yellow-800 ml-1" variant="secondary">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Reset Required
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.last_login ? (
                              <div className="text-sm">
                                {new Date(user.last_login).toLocaleDateString()}
                                <div className="text-xs text-slate-500">
                                  {new Date(user.last_login).toLocaleTimeString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">Never</span>
                            )}
                          </TableCell>
                          <TableCell>{user.login_count}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                onClick={() => updateUserStatus(user.id, !user.is_active)}
                                variant="outline"
                                size="sm"
                                title={user.is_active ? 'Deactivate User' : 'Activate User'}
                              >
                                {user.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              
                              <Button
                                onClick={() => openInvitationModal(user, 'email')}
                                variant="outline"
                                size="sm"
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                                title="Send Login by Email"
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                              
                              {user.phone && (
                                <Button
                                  onClick={() => openInvitationModal(user, 'sms')}
                                  variant="outline" 
                                  size="sm"
                                  className="bg-green-50 hover:bg-green-100 text-green-700"
                                  title="Send Login by SMS"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </Button>
                              )}
                              
                              {!user.is_primary_contact && (
                                <Button
                                  onClick={() => removeUser(user.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800"
                                  title="Remove User"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Add New User */}
                  <div className="mt-8 pt-6 border-t">
                    <h4 className="text-md font-medium text-slate-900 mb-4">Add New User</h4>
                    <div className="grid grid-cols-5 gap-4 mb-4">
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
                          value={newUser.full_name}
                          onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
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
                        <input
                          type="tel"
                          value={newUser.phone}
                          onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Phone (for SMS)"
                        />
                      </div>
                      <div>
                        <Select
                          value={newUser.portal_role}
                          onValueChange={(value) => setNewUser({ ...newUser, portal_role: value as PortalUser['portal_role'] })}
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

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-slate-900">Active Sessions</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Monitor current portal sessions and user activity
                  </p>
                </div>

                <div className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Device</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="font-medium">{session.user_name}</div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {session.ip_address}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(session.started_at).toLocaleDateString()}
                              <div className="text-xs text-slate-500">
                                {new Date(session.started_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(session.last_activity).toLocaleDateString()}
                              <div className="text-xs text-slate-500">
                                {new Date(session.last_activity).toLocaleTimeString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.is_active ? (
                              <Badge className="bg-green-100 text-green-800" variant="secondary">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-slate-900" variant="secondary">
                                Ended
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {((session.device_info as { browser?: string }) || {}).browser || 'Unknown'}
                              <div className="text-xs text-slate-500">
                                {((session.device_info as { os?: string }) || {}).os || 'Unknown OS'}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Portal Settings</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Configure portal features, permissions, and security settings
                </p>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Portal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Portal Name
                        </label>
                        <input
                          type="text"
                          value={configuration?.portal_name || ''}
                          onChange={(e) => configuration && setConfiguration({ ...configuration, portal_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Primary Color
                        </label>
                        <input
                          type="color"
                          value={configuration?.primary_color || '#91bdbd'}
                          onChange={(e) => configuration && setConfiguration({ ...configuration, primary_color: e.target.value })}
                          className="w-full h-10 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Feature Access</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {configuration && Object.entries({
                        'Dashboard': 'show_dashboard',
                        'Orders': 'show_orders',
                        'Shipping': 'show_shipping',
                        'Financials': 'show_financials',
                        'Documents': 'show_documents',
                        'Approvals': 'show_approvals'
                      }).map(([label, key]) => (
                        <label key={key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={configuration[key as keyof PortalConfiguration] as boolean}
                            onChange={(e) => setConfiguration({ ...configuration, [key]: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-slate-600">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </PageWrapper>
      </div>
      
      {/* Invitation Modal */}
      {showInvitationModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Send Login {invitationType === 'email' ? 'Email' : 'SMS'} - {selectedUser.full_name}
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-slate-600">
                  <strong>To:</strong> {invitationType === 'email' ? selectedUser.email : selectedUser.phone}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>User:</strong> {selectedUser.full_name} ({selectedUser.portal_role})
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  {invitationType === 'email' ? 'Email' : 'SMS'} Message
                </label>
                <textarea
                  value={invitationMessage}
                  onChange={(e) => setInvitationMessage(e.target.value)}
                  rows={invitationType === 'email' ? 12 : 4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Enter your ${invitationType} message...`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Use <code>{'{{PORTAL_LINK}}'}</code> as a placeholder for the portal login link.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={sendInvitation}
                  disabled={sendingInvitation || !invitationMessage.trim()}
                  className={`flex-1 ${invitationType === 'email' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {sendingInvitation ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending {invitationType === 'email' ? 'Email' : 'SMS'}...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send {invitationType === 'email' ? 'Email' : 'SMS'} Login
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => {
                    setShowInvitationModal(false)
                    setSelectedUser(null)
                    setInvitationMessage('')
                  }}
                  variant="outline"
                  disabled={sendingInvitation}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}