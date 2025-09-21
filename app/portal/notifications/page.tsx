'use client'

import { useState } from 'react'
import { Bell, MessageCircle, Settings, Activity } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageCenter } from '@/components/portal/message-center'
import { NotificationPreferences } from '@/components/portal/notification-preferences'
import { ActivityDigest } from '@/components/portal/activity-digest'

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('notifications')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-[#4b4949]">
          Notifications & Communication
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your notifications, messages, and communication preferences.
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4" />
            <span>Messages</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Activity</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Preferences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#4b4949] mb-4">
              All Notifications
            </h2>
            <p className="text-gray-600 mb-6">
              View and manage all your notifications from Limn Systems.
            </p>
            
            {/* Extended Notification List */}
            <NotificationListView />
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#4b4949] mb-4">
              Message Center
            </h2>
            <p className="text-gray-600 mb-6">
              Communicate directly with our team about your orders and projects.
            </p>
            
            <MessageCenter />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityDigest />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <NotificationPreferences />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Extended notification list component for the full page
function NotificationListView() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Notifications
            </label>
            <div className="relative">
              <Bell className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notifications..."
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="order">Orders</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="approval">Approvals</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent">
                <SelectValue placeholder="All Notifications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="read">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#4b4949]">
              Recent Notifications
            </h3>
            <button className="text-[#91bdbd] hover:text-[#7da9a9] text-sm font-medium">
              Mark all as read
            </button>
          </div>
        </div>

        {/* Notification Items */}
        <div className="divide-y divide-gray-200">
          {/* Sample notification items - in real implementation, these would come from the useNotifications hook */}
          <SampleNotificationItem
            type="order_update"
            title="Order Status Update"
            message="Your order TEST-2025-001 has moved to the Assembly stage"
            category="production"
            time="2 hours ago"
            read={false}
          />
          <SampleNotificationItem
            type="payment_received"
            title="Payment Confirmation"
            message="We have received your payment of $7,700.00"
            category="financial"
            time="1 day ago"
            read={true}
          />
          <SampleNotificationItem
            type="document_uploaded"
            title="New Document Available"
            message="Production drawings have been uploaded to your portal"
            category="document"
            time="2 days ago"
            read={true}
          />
          <SampleNotificationItem
            type="design_approval"
            title="Design Approval Required"
            message="Please review and approve the design for Custom Cabinet Set"
            category="approval"
            time="3 days ago"
            read={false}
          />
        </div>

        {/* Load More */}
        <div className="p-6 border-t border-gray-200 text-center">
          <button className="text-[#91bdbd] hover:text-[#7da9a9] font-medium">
            Load More Notifications
          </button>
        </div>
      </div>
    </div>
  )
}

interface SampleNotificationProps {
  type: string
  title: string
  message: string
  category: string
  time: string
  read: boolean
}

function SampleNotificationItem({ 
  title, 
  message, 
  category, 
  time, 
  read 
}: SampleNotificationProps) {
  const getCategoryColor = () => {
    switch (category) {
      case 'order':
        return 'bg-blue-100 text-blue-800'
      case 'production':
        return 'bg-green-100 text-green-800'
      case 'financial':
        return 'bg-yellow-100 text-yellow-800'
      case 'document':
        return 'bg-purple-100 text-purple-800'
      case 'approval':
        return 'bg-orange-100 text-orange-800'
      case 'shipping':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`p-4 hover:bg-gray-50 transition-colors ${!read ? 'bg-blue-50/50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Bell className="w-4 h-4 text-[#91bdbd]" />
            <h4 className={`text-sm font-medium ${!read ? 'font-semibold' : ''}`}>
              {title}
            </h4>
            {!read && (
              <div className="w-2 h-2 bg-[#91bdbd] rounded-full" />
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-2">
            {message}
          </p>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor()}`}>
              {category}
            </span>
            <span className="text-xs text-gray-500">
              {time}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button className="text-gray-400 hover:text-[#91bdbd] transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}