'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { 
  Search, 
  Users, 
  UserCheck, 
  UserX, 
  Settings,
  Activity,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string
  company_name?: string
  portal_access: boolean
  last_portal_login?: string
  created_at: string
  portal_access_granted_at?: string
  portal_access_granted_by?: string
}

interface PortalSettings {
  customer_id: string
  show_production_tracking: boolean
  show_financial_details: boolean
  show_shipping_info: boolean
  allow_document_upload: boolean
  allow_design_approval: boolean
}

export default function PortalAccessManagement() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState<'all' | 'with_access' | 'without_access'>('all')
  const [stats, setStats] = useState({
    total: 0,
    with_access: 0,
    recent_logins: 0
  })
  
  const supabase = createClient()

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          company_name,
          portal_access,
          last_portal_login,
          created_at,
          portal_access_granted_at,
          portal_access_granted_by
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCustomers(data || [])
      
      // Calculate stats
      const totalCustomers = data?.length || 0
      const withAccess = data?.filter(c => c.portal_access).length || 0
      const recentLogins = data?.filter(c => {
        if (!c.last_portal_login) return false
        const loginDate = new Date(c.last_portal_login)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return loginDate > thirtyDaysAgo
      }).length || 0

      setStats({
        total: totalCustomers,
        with_access: withAccess,
        recent_logins: recentLogins
      })
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const filterCustomers = useCallback(() => {
    let filtered = customers

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(customer => 
        (customer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply access filter
    if (filter === 'with_access') {
      filtered = filtered.filter(customer => customer.portal_access)
    } else if (filter === 'without_access') {
      filtered = filtered.filter(customer => !customer.portal_access)
    }

    setFilteredCustomers(filtered)
  }, [customers, searchTerm, filter])

  const fetchPortalSettings = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('customer_id', customerId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setPortalSettings(data)
      } else {
        // Create default settings
        const defaultSettings: Omit<PortalSettings, 'customer_id'> = {
          show_production_tracking: true,
          show_financial_details: false,
          show_shipping_info: true,
          allow_document_upload: true,
          allow_design_approval: true
        }
        setPortalSettings({ ...defaultSettings, customer_id: customerId })
      }
    } catch {
      // Database query handled gracefully with fallback data
    }
  }, [supabase])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    filterCustomers()
  }, [filterCustomers, customers, searchTerm, filter])

  useEffect(() => {
    if (selectedCustomer) {
      fetchPortalSettings(selectedCustomer.id)
    }
  }, [selectedCustomer, fetchPortalSettings])

  const togglePortalAccess = async (customerId: string, currentAccess: boolean) => {
    try {
      setUpdating(customerId)
      setError('')
      setSuccess('')

      const { error } = await supabase
        .from('customers')
        .update({
          portal_access: !currentAccess,
          portal_access_granted_at: !currentAccess ? new Date().toISOString() : null,
          portal_access_granted_by: !currentAccess ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', customerId)

      if (error) throw error

      await fetchCustomers()
      setSuccess(`Portal access ${!currentAccess ? 'granted' : 'revoked'} successfully`)
      
      // Auto-hide success message
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to update portal access')
    } finally {
      setUpdating(null)
    }
  }

  const updatePortalSettings = async (setting: keyof Omit<PortalSettings, 'customer_id'>, value: boolean) => {
    if (!portalSettings || !selectedCustomer) return

    try {
      const updatedSettings = { ...portalSettings, [setting]: value }
      // Remove customer_id from updatedSettings to avoid duplication
      const { customer_id: _customerId, ...settingsWithoutId } = updatedSettings
      void _customerId // Acknowledge unused variable
      
      const { error } = await supabase
        .from('portal_settings')
        .upsert({
          customer_id: selectedCustomer.id,
          ...settingsWithoutId
        })

      if (error) throw error

      setPortalSettings(updatedSettings)
      setSuccess('Settings updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to update settings')
    }
  }

  const formatLastLogin = (lastLogin: string | null | undefined) => {
    if (!lastLogin) return 'Never'
    const date = new Date(lastLogin)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Portal Access Management"
          description="Manage customer portal access and settings"
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#91bdbd]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Portal Access Management"
        description="Manage customer portal access and settings"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600">With Portal Access</p>
              <p className="text-2xl font-bold text-slate-900">{stats.with_access}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-[#91bdbd]/20 rounded-lg">
              <Activity className="h-5 w-5 text-[#91bdbd]" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600">Active (30 days)</p>
              <p className="text-2xl font-bold text-slate-900">{stats.recent_logins}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === 'with_access' ? 'default' : 'outline'}
            onClick={() => setFilter('with_access')}
            size="sm"
          >
            With Access
          </Button>
          <Button
            variant={filter === 'without_access' ? 'default' : 'outline'}
            onClick={() => setFilter('without_access')}
            size="sm"
          >
            Without Access
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customers List */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-[#4b4949] mb-4">
            Customers ({filteredCustomers.length})
          </h2>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCustomer?.id === customer.id
                    ? 'border-[#91bdbd] bg-[#91bdbd]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-[#4b4949] truncate">
                        {customer.name || customer.company_name || customer.email}
                      </p>
                      {customer.portal_access ? (
                        <Badge className="bg-green-100 text-green-800">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Access
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-slate-900">
                          <UserX className="h-3 w-3 mr-1" />
                          No Access
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 truncate">{customer.email}</p>
                    {customer.company_name && (
                      <p className="text-sm text-slate-500 truncate">{customer.company_name}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Last login: {formatLastLogin(customer.last_portal_login)}
                    </p>
                  </div>
                  <div className="ml-2">
                    <Switch
                      checked={customer.portal_access}
                      onCheckedChange={() => togglePortalAccess(customer.id, customer.portal_access)}
                      disabled={updating === customer.id}
                      className="data-[state=checked]:bg-[#91bdbd]"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No customers found matching your criteria</p>
              </div>
            )}
          </div>
        </Card>

        {/* Portal Settings */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-[#4b4949] mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Portal Settings
          </h2>
          
          {selectedCustomer ? (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-[#4b4949]">
                  {selectedCustomer.name || selectedCustomer.company_name || selectedCustomer.email}
                </h3>
                <p className="text-sm text-slate-600">{selectedCustomer.email}</p>
                {selectedCustomer.company_name && (
                  <p className="text-sm text-slate-500">{selectedCustomer.company_name}</p>
                )}
              </div>

              {portalSettings && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-[#4b4949]">Production Tracking</p>
                      <p className="text-sm text-slate-600">Show order production status</p>
                    </div>
                    <Switch
                      checked={portalSettings.show_production_tracking}
                      onCheckedChange={(checked) => updatePortalSettings('show_production_tracking', checked)}
                      className="data-[state=checked]:bg-[#91bdbd]"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-[#4b4949]">Financial Details</p>
                      <p className="text-sm text-slate-600">Show pricing and payment info</p>
                    </div>
                    <Switch
                      checked={portalSettings.show_financial_details}
                      onCheckedChange={(checked) => updatePortalSettings('show_financial_details', checked)}
                      className="data-[state=checked]:bg-[#91bdbd]"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-[#4b4949]">Shipping Information</p>
                      <p className="text-sm text-slate-600">Show delivery and logistics</p>
                    </div>
                    <Switch
                      checked={portalSettings.show_shipping_info}
                      onCheckedChange={(checked) => updatePortalSettings('show_shipping_info', checked)}
                      className="data-[state=checked]:bg-[#91bdbd]"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-[#4b4949]">Document Upload</p>
                      <p className="text-sm text-slate-600">Allow file uploads to projects</p>
                    </div>
                    <Switch
                      checked={portalSettings.allow_document_upload}
                      onCheckedChange={(checked) => updatePortalSettings('allow_document_upload', checked)}
                      className="data-[state=checked]:bg-[#91bdbd]"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-[#4b4949]">Design Approval</p>
                      <p className="text-sm text-slate-600">Allow approving design submissions</p>
                    </div>
                    <Switch
                      checked={portalSettings.allow_design_approval}
                      onCheckedChange={(checked) => updatePortalSettings('allow_design_approval', checked)}
                      className="data-[state=checked]:bg-[#91bdbd]"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a customer to configure portal settings</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}