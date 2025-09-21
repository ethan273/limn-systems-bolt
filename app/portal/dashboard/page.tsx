'use client'
 

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  FileText, 
  MessageSquare, 
  Download,
  Clock,
  CheckCircle,
  Truck
} from 'lucide-react'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { useRouter } from 'next/navigation'

export default function CustomerPortalDashboard() {
  const [customer, setCustomer] = useState<unknown>(null)
  const [orders, setOrders] = useState<unknown[]>([])
  const [documents, setDocuments] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0
  })
  const router = useRouter()
  const supabase = createClient()

  const loadOrders = useCallback(async (customerId: string) => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*), shipment(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10)

      setOrders(data || [])
      
      // Calculate stats
      const stats = {
        totalOrders: data?.length || 0,
        activeOrders: data?.filter(o => ['pending', 'processing', 'shipped'].includes(o.status)).length || 0,
        completedOrders: data?.filter(o => o.status === 'delivered').length || 0,
        totalSpent: data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      }
      setStats(stats)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }, [supabase])


  const loadDocuments = useCallback(async (customerId: string) => {
    try {
      const { data } = await supabase
        .from('client_files')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5)

      setDocuments(data || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }, [supabase])

  const logActivity = useCallback(async (type: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !customer) return

      await supabase
        .from('portal_activity_log')
        .insert({
          customer_id: String(safeGet(customer, ['id']) || ''),
          user_id: String(safeGet(user, ['id']) || ''),
          activity_type: type,
          description,
          ip_address: window.location.hostname,
          user_agent: navigator.userAgent
        })
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }, [supabase, customer])

  const checkPortalAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/portal/login')
        return
      }

      // Get customer portal access
      const { data: access } = await supabase
        .from('customer_portal_access')
        .select('*, customer:customers(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (!access) {
        router.push('/portal/no-access')
        return
      }

      setCustomer(access.customer)
      await Promise.all([
        loadOrders(access.customer_id),
        loadDocuments(access.customer_id),
        logActivity('portal_login', 'Customer logged into portal')
      ])

      // Update last login
      await supabase
        .from('customer_portal_access')
        .update({
          last_login: new Date().toISOString(),
          login_count: (access.login_count || 0) + 1
        })
        .eq('id', access.id)

    } catch (error) {
      console.error('Error checking portal access:', error)
      router.push('/portal/login')
    } finally {
      setLoading(false)
    }
  }, [router, loadDocuments, loadOrders, logActivity, supabase])

  useEffect(() => {
    checkPortalAccess()
  }, [checkPortalAccess])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'shipped': return <Truck className="h-4 w-4 text-blue-600" />
      case 'processing': return <Clock className="h-4 w-4 text-yellow-600" />
      default: return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.activeOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completedOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.totalSpent.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Recent Orders</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => router.push('/portal/orders')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={safeGet(order, ['id']) || 'unknown'} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(String(safeGet(order, ['status']) || 'pending'))}
                        <div>
                          <p className="font-medium">{String(safeGet(order, ['order_number']) || 'N/A')}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(String(safeGet(order, ['created_at']) || new Date().toISOString())).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${Number(safeGet(order, ['total_amount']) || 0).toFixed(2)}</p>
                        <Badge variant={safeGet(order, ['status']) === 'delivered' ? 'default' : 'secondary'}>
                          {String(safeGet(order, ['status']) || 'pending')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No orders yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Documents</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => router.push('/portal/documents')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={safeGet(doc, ['id']) || 'unknown'} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium">{String(safeGet(doc, ['title']) || 'Untitled Document')}</p>
                          <p className="text-sm text-gray-600">{String(safeGet(doc, ['document_type']) || 'Document')}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => window.open(String(safeGet(doc, ['file_url']) || '#'), '_blank')}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No documents yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No messages yet</p>
                  <Button className="mt-4" onClick={() => router.push('/portal/contact')}>
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}