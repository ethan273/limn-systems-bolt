'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePermissions } from '@/hooks/usePermissions'
import { Package, Truck, Factory, ShoppingCart, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { getDashboardMetrics, getRecentActivity, formatCurrency } from '@/lib/data-helpers'
import { DashboardLoadingState } from '@/components/ui/enhanced-loading-states'

interface User {
  email: string
  user_metadata?: {
    full_name?: string
    name?: string
  }
}

interface Collection {
  id: string
  name: string
  created_at: string
}

interface ActivityItem {
  id: string
  action: string
  item: string
  timestamp: string
  user: string
}

interface DashboardMetrics {
  revenue: number
  orders: number
  production: number
  customers: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics>({ revenue: 0, orders: 0, production: 0, customers: 0 })
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { loading: permissionsLoading, canView } = usePermissions()

  const loadDashboardData = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user as User)
        
        // Load all data in parallel
        const [collectionsResponse, dashboardMetrics, activityData] = await Promise.all([
          fetch('/api/collections', { credentials: 'include' }),
          getDashboardMetrics(),
          getRecentActivity(5)
        ])
        
        if (collectionsResponse.ok) {
          const data = await collectionsResponse.json()
          setCollections(data.data || [])
        }
        
        setMetrics(dashboardMetrics)
        setRecentActivity(activityData)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])  // loadDashboardData is defined in this component, no need to add as dependency

  const refreshDashboard = async () => {
    setRefreshing(true)
    try {
      const [dashboardMetrics, activityData] = await Promise.all([
        getDashboardMetrics(),
        getRecentActivity(5)
      ])
      
      setMetrics(dashboardMetrics)
      setRecentActivity(activityData)
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name
    if (user?.user_metadata?.name) return user.user_metadata.name
    if (user?.email) return (user.email || "").split('@')[0]
    return 'User'
  }

  // Real metrics from database
  const metricsDisplay = [
    { 
      title: 'Total Revenue', 
      value: formatCurrency(metrics.revenue), 
      change: '+12.5%', 
      positive: true,
      icon: TrendingUp
    },
    { 
      title: 'Active Orders', 
      value: metrics.orders.toString(), 
      change: '+8.7%', 
      positive: true,
      icon: ShoppingCart
    },
    { 
      title: 'Production Queue', 
      value: metrics.production.toString(), 
      change: '-2.3%', 
      positive: false,
      icon: Factory
    },
    { 
      title: 'Total Customers', 
      value: metrics.customers.toString(), 
      change: '+15.2%', 
      positive: true,
      icon: Package
    }
  ]

  const quickActions = [
    { 
      title: 'New Collection', 
      description: 'Create a new product collection', 
      color: 'primary',
      onClick: () => router.push('/dashboard/collections?create=true')
    },
    { 
      title: 'Add Product', 
      description: 'Add a product to existing collection', 
      color: 'outline',
      onClick: () => router.push('/dashboard/items?create=true')
    },
    { 
      title: 'View Reports', 
      description: 'Access analytics and reports', 
      color: 'outline',
      onClick: () => router.push('/dashboard/analytics')
    },
    { 
      title: 'Manage Users', 
      description: 'User management and permissions', 
      color: 'outline',
      onClick: () => router.push('/dashboard/admin/users')
    }
  ]

  // Production Overview Component
  const ProductionOverview = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Factory className="w-5 h-5 mr-2" />
          Production Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">24</div>
            <div className="text-sm font-medium text-slate-600">Active Orders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">8</div>
            <div className="text-sm font-medium text-slate-600">In Production</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">12</div>
            <div className="text-sm font-medium text-slate-600">Quality Control</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">4</div>
            <div className="text-sm font-medium text-slate-600">Ready to Ship</div>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/production')}>
            <Package className="w-4 h-4 mr-2" />
            View Production
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Shipping Overview Component
  const ShippingOverview = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Truck className="w-5 h-5 mr-2" />
          Shipping Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">18</div>
            <div className="text-sm font-medium text-slate-600">Active Shipments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">6</div>
            <div className="text-sm font-medium text-slate-600">In Transit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">3</div>
            <div className="text-sm font-medium text-slate-600">Out for Delivery</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">9</div>
            <div className="text-sm font-medium text-slate-600">Delivered Today</div>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/shipping')}>
            <Truck className="w-4 h-4 mr-2" />
            View Shipping
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (loading || permissionsLoading) {
    return <DashboardLoadingState />
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          {getGreeting()}, {getUserDisplayName()}!
        </h1>
        <p className="text-slate-700 text-lg font-medium">
          Welcome back to your Limn Systems dashboard. Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Key Metrics</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshDashboard}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsDisplay.map((metric, index) => {
          const IconComponent = metric.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 flex items-center">
                  <IconComponent className="w-4 h-4 mr-2" />
                  {metric.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {metric.value}
                </div>
                <div className={`text-sm flex items-center ${
                  metric.positive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.positive ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {metric.change} from last month
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Operations Overview - Conditional based on permissions */}
      {(canView('production') || canView('shipping')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {canView('production') && <ProductionOverview />}
          {canView('shipping') && <ShippingOverview />}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs rounded-md ${
                          activity.action === 'Created' ? 'bg-primary/10 text-primary' :
                          activity.action === 'Updated' ? 'bg-slate-100 text-slate-700' :
                          'bg-amber/10 text-amber'
                        }`}>
                          {activity.action}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">{activity.item}</TableCell>
                      <TableCell className="font-medium text-slate-700">{activity.user}</TableCell>
                      <TableCell className="text-slate-600 font-medium">{activity.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quickActions.map((action, index) => (
                <div key={index} className="space-y-2">
                  <Button 
                    variant={action.color as 'default' | 'outline'} 
                    className="w-full justify-start h-auto p-4"
                    onClick={action.onClick}
                  >
                    <div className="text-left">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-sm opacity-70">{action.description}</div>
                    </div>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">API Status</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                    ● Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Database</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                    ● Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Last Backup</span>
                  <span className="text-slate-600 text-sm font-medium">2 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Collections Overview */}
      {collections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.slice(0, 6).map((collection, index) => (
                <div key={`dashboard-collection-${index}-${collection.id || 'no-id'}`} className="p-4 border border-stone-200 rounded-lg hover:bg-glacier-50 transition-colors">
                  <h3 className="font-semibold text-slate-900 mb-1">{collection.name || 'Unnamed Collection'}</h3>
                  <p className="text-sm text-slate-600 font-medium">
                    Created {collection.created_at ? new Date(collection.created_at).toLocaleDateString() : 'Unknown date'}
                  </p>
                </div>
              ))}
            </div>
            {collections.length > 6 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => router.push('/dashboard/collections')}>
                  View All Collections
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}