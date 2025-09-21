'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Users, FileText, Shield, Activity } from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalAuditLogs: number
  recentActivity: number
  systemHealth: 'good' | 'warning' | 'critical'
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalAuditLogs: 0,
    recentActivity: 0,
    systemHealth: 'good'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdminStats()
  }, [])

  const loadAdminStats = async () => {
    try {
      // Get user count (if you have a users table or use auth.users)
      // For now using mock data
      setStats({
        totalUsers: 25,
        totalAuditLogs: 1247,
        recentActivity: 18,
        systemHealth: 'good'
      })
    } catch (error) {
      console.error('Failed to load admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Audit Logs',
      value: stats.totalAuditLogs,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Recent Activity',
      value: stats.recentActivity,
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'System Health',
      value: stats.systemHealth,
      icon: Shield,
      color: stats.systemHealth === 'good' ? 'text-green-600' : 'text-red-600',
      bgColor: stats.systemHealth === 'good' ? 'bg-green-50' : 'bg-red-50'
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Admin Dashboard"
        description="System overview and management"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={typeof stat.value === 'string' 
              ? (stat.value || "").charAt(0).toUpperCase() + (stat.value || []).slice(1)
              : stat.value
            }
            icon={stat.icon}
            iconColor={stat.color}
            iconBgColor={stat.bgColor}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium">Manage Users</div>
                  <div className="text-sm text-slate-700">Add, remove, or modify user accounts</div>
                </div>
              </div>
            </button>
            
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium">View Audit Logs</div>
                  <div className="text-sm text-slate-700">Review system activity and user actions</div>
                </div>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Operational
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Services</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Operational
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Authentication</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Operational
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-slate-700">System backup completed successfully</span>
              <span className="text-slate-600">2 hours ago</span>
            </div>
            
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-slate-700">New user registration: admin@example.com</span>
              <span className="text-slate-600">4 hours ago</span>
            </div>
            
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-slate-700">Database optimization completed</span>
              <span className="text-slate-600">6 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}