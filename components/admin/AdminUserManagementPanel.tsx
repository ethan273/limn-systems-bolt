'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Shield, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Edit2, 
  X,
  Users,
  UserPlus,
  Settings,
  Package,
  PaintBucket,
  Factory,
  DollarSign,
  BarChart3,
  UserCog
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

interface UserProfile {
  id: string
  email: string
  title?: string
  user_type: 'Employee' | 'Contractor' | 'Designer' | 'Manufacturer' | 'Finance' | 'Super Admin'
  department?: string
  is_active: boolean
  created_at: string
  last_sign_in_at?: string
  hire_date?: string
  permissions: Record<string, boolean>
}

interface PermissionCategory {
  name: string
  icon: React.ComponentType<any>
  color: string
  permissions: {
    key: string
    label: string
    description: string
  }[]
}

const USER_TYPES = ['Employee', 'Contractor', 'Designer', 'Manufacturer', 'Finance', 'Super Admin']

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: 'Orders',
    icon: Package,
    color: 'text-blue-600',
    permissions: [
      { key: 'orders_view', label: 'View Orders', description: 'Can view order listings and details' },
      { key: 'orders_create', label: 'Create Orders', description: 'Can create new orders' },
      { key: 'orders_edit', label: 'Edit Orders', description: 'Can modify existing orders' },
      { key: 'orders_delete', label: 'Delete Orders', description: 'Can delete orders' },
    ]
  },
  {
    name: 'Inventory',
    icon: Settings,
    color: 'text-green-600',
    permissions: [
      { key: 'inventory_view', label: 'View Inventory', description: 'Can view inventory and stock levels' },
      { key: 'inventory_edit', label: 'Edit Inventory', description: 'Can modify inventory items' },
      { key: 'inventory_create', label: 'Create Inventory', description: 'Can add new inventory items' },
      { key: 'inventory_delete', label: 'Delete Inventory', description: 'Can remove inventory items' },
    ]
  },
  {
    name: 'Customers',
    icon: Users,
    color: 'text-purple-600',
    permissions: [
      { key: 'customers_view', label: 'View Customers', description: 'Can view customer listings and details' },
      { key: 'customers_edit', label: 'Edit Customers', description: 'Can modify customer information' },
      { key: 'customers_create', label: 'Create Customers', description: 'Can add new customers' },
      { key: 'customers_delete', label: 'Delete Customers', description: 'Can remove customers' },
    ]
  },
  {
    name: 'Design',
    icon: PaintBucket,
    color: 'text-pink-600',
    permissions: [
      { key: 'design_manage', label: 'Design Management', description: 'Full access to design tools and collections' },
    ]
  },
  {
    name: 'Production',
    icon: Factory,
    color: 'text-orange-600',
    permissions: [
      { key: 'production_manage', label: 'Production Management', description: 'Can manage production workflows and schedules' },
      { key: 'qc_manage', label: 'Quality Control', description: 'Can perform QC inspections and approvals' },
    ]
  },
  {
    name: 'Finance',
    icon: DollarSign,
    color: 'text-yellow-600',
    permissions: [
      { key: 'finance_manage', label: 'Financial Management', description: 'Can manage invoicing, payments, and financial reports' },
    ]
  },
  {
    name: 'Reports',
    icon: BarChart3,
    color: 'text-indigo-600',
    permissions: [
      { key: 'reports_view', label: 'View Reports', description: 'Can view reports and analytics' },
      { key: 'reports_create', label: 'Create Reports', description: 'Can generate custom reports' },
      { key: 'reports_edit', label: 'Edit Reports', description: 'Can modify existing reports' },
    ]
  },
  {
    name: 'Admin',
    icon: Shield,
    color: 'text-red-600',
    permissions: [
      { key: 'admin_users', label: 'User Management', description: 'Can manage users and permissions' },
      { key: 'admin_system', label: 'System Administration', description: 'Full system administration access' },
    ]
  },
]

export default function AdminUserManagementPanel() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Orders', 'Inventory', 'Customers']))
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [savingChanges, setSavingChanges] = useState(false)
  const [defaultPermissions, setDefaultPermissions] = useState<Record<string, boolean>>({})

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users?type=all`)
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.data || [])
      } else {
        console.error('Failed to fetch users:', data.error)
        if (response.status === 401) {
          toast({
            variant: 'destructive',
            title: 'Authentication required',
            description: 'Please log in to access admin features'
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Error loading users',
            description: data.error || 'Failed to load user data'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        variant: 'destructive',
        title: 'Network error',
        description: 'Unable to connect to server'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchDefaultPermissions = useCallback(async (userType: string) => {
    try {
      const response = await fetch(`/api/admin/permissions?userType=${userType}`)
      const data = await response.json()
      
      if (response.ok) {
        setDefaultPermissions(data.permissions)
      } else {
        console.error('Error fetching permissions:', data.error)
        if (response.status === 401) {
          toast({
            variant: 'destructive',
            title: 'Authentication required',
            description: 'Please log in to access admin features'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
    }
  }, [toast])

  // Fetch users on component mount only
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Fetch default permissions when tab changes
  useEffect(() => {
    if (activeTab !== 'all') {
      fetchDefaultPermissions(activeTab)
    }
  }, [activeTab, fetchDefaultPermissions])

  const saveUserChanges = async (userId: string, updates: unknown) => {
    setSavingChanges(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Update local state
        setUsers(users.map(u => u.id === userId ? { ...u, ...(updates as Record<string, unknown>) } : u))
        setEditingUser(null)
        // Show success message (you could add a toast here)
      } else {
        console.error('Failed to save changes:', data.error)
      }
    } catch (error) {
      console.error('Error saving changes:', error)
    } finally {
      setSavingChanges(false)
    }
  }

  const updatePermission = async (userId: string, feature: string, hasPermission: boolean) => {
    setSavingChanges(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, hasPermission })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Update local state to reflect the change
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({
            ...selectedUser,
            permissions: {
              ...selectedUser.permissions,
              [feature]: hasPermission
            }
          })
        }
        
        toast({
          title: 'Permission updated',
          description: `${feature.replace('_', ' ')} permission ${hasPermission ? 'granted' : 'revoked'} for user.`
        })
      } else {
        console.error('Failed to update permission:', data.error)
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: data.error || 'Failed to update permission'
        })
      }
    } catch (error) {
      console.error('Error updating permission:', error)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Network error occurred while updating permission'
      })
    } finally {
      setSavingChanges(false)
    }
  }

  const updateDefaultPermission = async (userType: string, feature: string, hasPermission: boolean) => {
    setSavingChanges(true)
    try {
      const newPermissions = { ...defaultPermissions, [feature]: hasPermission }
      
      const response = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType, permissions: newPermissions })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setDefaultPermissions(newPermissions)
        toast({
          title: 'Default permission updated',
          description: `${feature.replace('_', ' ')} default permission ${hasPermission ? 'enabled' : 'disabled'} for ${userType} users.`
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: data.error || 'Failed to update default permission'
        })
      }
    } catch (error) {
      console.error('Error updating default permissions:', error)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Network error occurred while updating default permission'
      })
    } finally {
      setSavingChanges(false)
    }
  }

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    setExpandedCategories(newExpanded)
  }

  const filteredUsers = users.filter(user => {
    // Filter by active tab (user type)
    const matchesTab = activeTab === 'all' || user.user_type?.toLowerCase() === activeTab.toLowerCase()
    
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesTab && matchesSearch
  })

  const getUserTypeCounts = () => {
    const counts: Record<string, number> = { all: users.length }
    USER_TYPES.forEach(type => {
      counts[type.toLowerCase()] = users.filter(u => u.user_type === type).length
    })
    return counts
  }

  const getUserTypeColor = (userType: string) => {
    const colors = {
      'Employee': 'bg-blue-100 text-blue-800',
      'Contractor': 'bg-orange-100 text-orange-800',
      'Designer': 'bg-pink-100 text-pink-800',
      'Manufacturer': 'bg-green-100 text-green-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'Super Admin': 'bg-red-100 text-red-800'
    }
    return colors[userType as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const counts = getUserTypeCounts()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User & Permission Management</h1>
        <p className="text-gray-600 mt-2">Manage system users, roles, and permissions</p>
      </div>

      {/* User Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveTab('all')}
          className="flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          All Users ({counts.all})
        </Button>
        {USER_TYPES.map(type => (
          <Button
            key={type}
            variant={activeTab === type.toLowerCase() ? 'default' : 'outline'}
            onClick={() => setActiveTab(type.toLowerCase())}
          >
            {type} ({counts[type.toLowerCase()] || 0})
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {activeTab === 'all' ? 'All Users' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Users`}
                </CardTitle>
                <Button size="sm" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add User
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No users found</div>
              ) : (
                <div className="space-y-0">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="border-b border-gray-100 p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.email}</div>
                            <div className="text-sm text-gray-600">
                              {editingUser === user.id ? (
                                <div className="flex gap-2 mt-1">
                                  <Input
                                    defaultValue={user.title || ''}
                                    placeholder="Job title"
                                    className="h-8 text-sm"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const title = (e.target as HTMLInputElement).value
                                        saveUserChanges(user.id, { title })
                                      }
                                    }}
                                  />
                                  <Select
                                    defaultValue={user.user_type}
                                    onValueChange={(newType) => {
                                      saveUserChanges(user.id, { user_type: newType })
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-32 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {USER_TYPES.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{user.title || 'No title'}</span>
                                  <Badge className={getUserTypeColor(user.user_type)}>
                                    {user.user_type}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.department} • Hired {formatDate(user.hire_date)} • Last active {formatDate(user.last_sign_in_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingUser === user.id ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditingUser(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingUser(user.id)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedUser(user)}
                              >
                                <UserCog className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Permissions Panel */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {selectedUser ? `Permissions - ${selectedUser.email}` : 
                   activeTab !== 'all' ? `Default ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Permissions` : 'Permissions'}
                </CardTitle>
                {(selectedUser || activeTab !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (expandedCategories.size === PERMISSION_CATEGORIES.length) {
                        setExpandedCategories(new Set())
                      } else {
                        setExpandedCategories(new Set(PERMISSION_CATEGORIES.map(c => c.name)))
                      }
                    }}
                    className="text-xs"
                  >
                    {expandedCategories.size === PERMISSION_CATEGORIES.length ? 'Collapse All' : 'Expand All'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedUser && activeTab === 'all' ? (
                <div className="text-center text-gray-500 py-8">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a user or user type to manage permissions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {PERMISSION_CATEGORIES.map((category) => (
                    <div key={category.name} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-t-lg transition-colors duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <category.icon className={`w-5 h-5 ${category.color}`} />
                          <span className="font-medium text-gray-900">{category.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {(category.permissions || []).filter(p => 
                              selectedUser ? selectedUser.permissions[p.key] : defaultPermissions[p.key]
                            ).length}/{(category.permissions || []).length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {savingChanges && <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>}
                          {expandedCategories.has(category.name) ? 
                            <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          }
                        </div>
                      </button>
                      
                      {expandedCategories.has(category.name) && (
                        <div className="border-t border-gray-200 p-3 space-y-4">
                          {(category.permissions || []).map((permission) => (
                            <div key={permission.key} className="flex items-start justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="text-sm font-medium text-gray-900 mb-1">{permission.label}</div>
                                <div className="text-xs text-gray-500 leading-relaxed">{permission.description}</div>
                              </div>
                              <div className="flex-shrink-0">
                                <Switch
                                  checked={selectedUser ? 
                                    selectedUser.permissions[permission.key] || false : 
                                    defaultPermissions[permission.key] || false
                                  }
                                  onCheckedChange={(checked) => {
                                    if (selectedUser) {
                                      updatePermission(selectedUser.id, permission.key, checked)
                                    } else if (activeTab !== 'all') {
                                      updateDefaultPermission(activeTab, permission.key, checked)
                                    }
                                  }}
                                  disabled={savingChanges}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {selectedUser && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedUser(null)}
                        className="w-full"
                      >
                        Back to Default Permissions
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}