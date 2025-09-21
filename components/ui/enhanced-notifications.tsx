'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  Check, 
  X, 
  Settings, 
  Filter,
  Archive,
  Star,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  Eye,
  ChevronDown,
  Search
} from 'lucide-react'
import {
  DropdownMenuRoot,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'

// Enhanced Notification Types
export type NotificationCategory = 'all' | 'order' | 'production' | 'financial' | 'document' | 'approval' | 'shipping' | 'system'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type NotificationFilter = 'all' | 'unread' | 'starred' | 'archived'

interface EnhancedNotification {
  id: string
  type: string
  title: string
  message: string
  category: string
  priority: NotificationPriority
  link?: string
  read: boolean
  starred?: boolean
  archived?: boolean
  metadata: Record<string, unknown>
  created_at: string
  actions?: NotificationAction[]
}

interface NotificationAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'danger'
  action: string
  metadata?: Record<string, unknown>
}

// Enhanced Notification Center Component
interface EnhancedNotificationCenterProps {
  className?: string
  maxHeight?: number
  showCategories?: boolean
  showFilters?: boolean
  showSearch?: boolean
  enableSound?: boolean
  enableDesktop?: boolean
}

export function EnhancedNotificationCenter({
  className = '',
  maxHeight = 600,
  showFilters = true,
  showSearch = true,
  enableSound = true,
  enableDesktop = true
}: EnhancedNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all')
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(enableSound)
  const [desktopEnabled, setDesktopEnabled] = useState(enableDesktop)
  const [lastNotificationCount, setLastNotificationCount] = useState(0)

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications
  } = useNotifications()

  // Load notifications when dropdown is opened
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && notifications.length === 0) {
      refreshNotifications()
    }
  }

  // Request desktop notification permission
  useEffect(() => {
    if (desktopEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [desktopEnabled])

  // Play notification sound and show desktop notification for new notifications
  useEffect(() => {
    if (notifications.length > lastNotificationCount && lastNotificationCount > 0) {
      const newNotifications = notifications.slice(0, notifications.length - lastNotificationCount)
      
      newNotifications.forEach(notification => {
        // Play sound
        if (soundEnabled && !notification.read) {
          playNotificationSound(notification.priority)
        }

        // Show desktop notification
        if (desktopEnabled && 'Notification' in window && Notification.permission === 'granted') {
          showDesktopNotification(notification)
        }
      })
    }
    setLastNotificationCount(notifications.length)
  }, [notifications, lastNotificationCount, soundEnabled, desktopEnabled])

  const playNotificationSound = (priority: NotificationPriority) => {
    const audio = new Audio()
    switch (priority) {
      case 'urgent':
        audio.src = '/sounds/notification-urgent.mp3'
        break
      case 'high':
        audio.src = '/sounds/notification-high.mp3'
        break
      default:
        audio.src = '/sounds/notification-default.mp3'
    }
    audio.volume = 0.5
    audio.play().catch(() => {
      // Ignore audio play errors (browser restrictions)
    })
  }

  const showDesktopNotification = (notification: EnhancedNotification) => {
    const desktopNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/icons/notification-icon.png',
      badge: '/icons/notification-badge.png',
      tag: notification.id,
      requireInteraction: notification.priority === 'urgent',
      silent: false
    })

    desktopNotification.onclick = () => {
      if (notification.link) {
        window.open(notification.link, '_blank')
      }
      desktopNotification.close()
    }

    // Auto-close after 5 seconds for non-urgent notifications
    if (notification.priority !== 'urgent') {
      setTimeout(() => {
        desktopNotification.close()
      }, 5000)
    }
  }

  // Filter and search notifications
  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications

    // Filter by category
    if (activeTab !== 'all') {
      filtered = filtered.filter(n => n.category === activeTab)
    }

    // Filter by read status
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read)
        break
      case 'starred':
        filtered = filtered.filter(n => n.starred)
        break
      case 'archived':
        filtered = filtered.filter(n => n.archived)
        break
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(n => 
        (n.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.message || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [notifications, activeTab, filter, searchQuery])

  const categoryCount = (category: NotificationCategory) => {
    if (category === 'all') return notifications.length
    return notifications.filter(n => n.category === category).length
  }

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'normal':
        return <Info className="w-4 h-4 text-blue-500" />
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'order':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'production':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'financial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'document':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'approval':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'shipping':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'system':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleActionClick = (notification: EnhancedNotification, action: NotificationAction) => {
    // Handle notification actions
    switch (action.action) {
      case 'approve':
        // Handle approval action
        console.log('Approve action for notification:', notification.id)
        break
      case 'reject':
        // Handle rejection action
        console.log('Reject action for notification:', notification.id)
        break
      case 'view':
        // Navigate to the notification link
        if (notification.link) {
          window.open(notification.link, '_blank')
        }
        break
      default:
        console.log('Unknown action:', action.action)
    }

    // Mark as read after action
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  const toggleStar = (notificationId: string) => {
    // Toggle starred status
    console.log('Toggle star for notification:', notificationId)
  }

  const toggleArchive = (notificationId: string) => {
    // Toggle archived status
    console.log('Toggle archive for notification:', notificationId)
  }

  return (
    <div className={cn('relative', className)}>
      <DropdownMenuRoot open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0 animate-pulse"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-[420px] p-0" 
          sideOffset={5}
          style={{ maxHeight: maxHeight }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <Check className="w-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-b bg-gray-50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Sound notifications</Label>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Desktop notifications</Label>
                  <Switch
                    checked={desktopEnabled}
                    onCheckedChange={setDesktopEnabled}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          {showSearch && (
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8"
                />
              </div>
            </div>
          )}

          {/* Tabs and Filters */}
          <div className="border-b">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NotificationCategory)}>
              <div className="flex items-center justify-between px-3 py-2">
                <TabsList className="grid grid-cols-4 w-fit">
                  <TabsTrigger value="all" className="text-xs">
                    All ({categoryCount('all')})
                  </TabsTrigger>
                  <TabsTrigger value="order" className="text-xs">
                    Orders ({categoryCount('order')})
                  </TabsTrigger>
                  <TabsTrigger value="production" className="text-xs">
                    Production ({categoryCount('production')})
                  </TabsTrigger>
                  <TabsTrigger value="system" className="text-xs">
                    System ({categoryCount('system')})
                  </TabsTrigger>
                </TabsList>

                {showFilters && (
                  <DropdownMenuRoot>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Filter className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Filter</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setFilter('all')}>
                        All notifications
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilter('unread')}>
                        <Eye className="w-4 h-4 mr-2" />
                        Unread only
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilter('starred')}>
                        <Star className="w-4 h-4 mr-2" />
                        Starred
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilter('archived')}>
                        <Archive className="w-4 h-4 mr-2" />
                        Archived
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenuRoot>
                )}
              </div>
            </Tabs>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-sm text-gray-500">Loading notifications...</div>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                <div className="text-sm text-red-600 mb-2">Error loading notifications</div>
                <div className="text-xs text-gray-500">{error}</div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <div className="text-sm text-gray-500 mb-2">
                  {searchQuery ? 'No notifications match your search' : 'No notifications'}
                </div>
                <div className="text-xs text-gray-400">
                  {searchQuery ? 'Try adjusting your search terms' : "You'll see notifications about your orders and more here."}
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => markAsRead(notification.id)}
                    onDismiss={() => dismissNotification(notification.id)}
                    onToggleStar={() => toggleStar(notification.id)}
                    onToggleArchive={() => toggleArchive(notification.id)}
                    onActionClick={(action) => handleActionClick(notification, action)}
                    getPriorityIcon={getPriorityIcon}
                    getCategoryColor={getCategoryColor}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  setIsOpen(false)
                  // Navigate to full notifications page
                }}
              >
                View all notifications
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenuRoot>
    </div>
  )
}

// Enhanced Notification Item Component
interface NotificationItemProps {
  notification: EnhancedNotification
  onMarkAsRead: () => void
  onDismiss: () => void
  onToggleStar: () => void
  onToggleArchive: () => void
  onActionClick: (action: NotificationAction) => void
  getPriorityIcon: (priority: NotificationPriority) => React.ReactNode
  getCategoryColor: (category: string) => string
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onToggleStar,
  onToggleArchive,
  onActionClick,
  getPriorityIcon,
  getCategoryColor
}: NotificationItemProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString()
  }

  return (
    <div className={cn(
      'p-4 hover:bg-gray-50 transition-colors',
      !notification.read && 'bg-blue-50 border-l-4 border-l-blue-400'
    )}>
      <div className="flex items-start gap-3">
        {/* Priority Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getPriorityIcon(notification.priority)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h4 className={cn(
              'text-sm font-medium text-gray-900 truncate pr-2',
              !notification.read && 'font-semibold'
            )}>
              {notification.title}
            </h4>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={onToggleStar}
              >
                <Star 
                  className={cn(
                    'w-3 h-3',
                    notification.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                  )} 
                />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={cn('text-xs border', getCategoryColor(notification.category))}
              >
                {notification.category}
              </Badge>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(notification.created_at)}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Actions */}
              {notification.actions?.map((action) => (
                <Button
                  key={action.id}
                  variant={action.type === 'primary' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => onActionClick(action)}
                >
                  {action.label}
                </Button>
              ))}
              
              {/* Mark as read */}
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onMarkAsRead}
                  title="Mark as read"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              
              {/* Archive */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onToggleArchive}
                title="Archive"
              >
                <Archive className="w-3 h-3" />
              </Button>
              
              {/* Dismiss */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                onClick={onDismiss}
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Toast Notification System
interface ToastNotification {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  actions?: { label: string; onClick: () => void }[]
}

class ToastManager {
  private toasts: ToastNotification[] = []
  private listeners: ((toasts: ToastNotification[]) => void)[] = []

  show(toast: Omit<ToastNotification, 'id'>) {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastNotification = { id, ...toast }
    
    this.toasts.push(newToast)
    this.notify()

    // Auto dismiss after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id)
      }, duration)
    }

    return id
  }

  dismiss(id: string) {
    this.toasts = (this.toasts || []).filter(toast => toast.id !== id)
    this.notify()
  }

  dismissAll() {
    this.toasts = []
    this.notify()
  }

  subscribe(listener: (toasts: ToastNotification[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = (this.listeners || []).filter(l => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]))
  }
}

export const toastManager = new ToastManager()

// Toast Container Component
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  useEffect(() => {
    return toastManager.subscribe(setToasts)
  }, [])

  if (typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onDismiss={() => toastManager.dismiss(toast.id)}
        />
      ))}
    </div>,
    document.body
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastNotification; onDismiss: () => void }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 150)
  }

  const getToastIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getToastColors = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div
      className={cn(
        'max-w-sm w-full p-4 border rounded-lg shadow-lg transition-all duration-150',
        getToastColors(),
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getToastIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {toast.title}
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            {toast.message}
          </p>
          
          {toast.actions && (toast.actions || []).length > 0 && (
            <div className="flex gap-2">
              {(toast.actions || []).map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

// Utility functions for showing toasts
export const toast = {
  success: (title: string, message: string, options?: Partial<ToastNotification>) =>
    toastManager.show({ title, message, type: 'success', ...options }),
  
  error: (title: string, message: string, options?: Partial<ToastNotification>) =>
    toastManager.show({ title, message, type: 'error', ...options }),
  
  warning: (title: string, message: string, options?: Partial<ToastNotification>) =>
    toastManager.show({ title, message, type: 'warning', ...options }),
  
  info: (title: string, message: string, options?: Partial<ToastNotification>) =>
    toastManager.show({ title, message, type: 'info', ...options })
}