'use client'

import { useState, useCallback } from 'react'
import { apiRequest, formatErrorMessage } from '@/lib/error-handling'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  category: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  link?: string
  read: boolean
  starred?: boolean
  archived?: boolean
  metadata: Record<string, unknown>
  created_at: string
}

interface NotificationPreference {
  id: string
  customer_id: string
  channel: 'email' | 'portal' | 'sms'
  category: string
  enabled: boolean
  frequency: 'immediate' | 'daily' | 'weekly' | 'never'
  quiet_hours_start?: string
  quiet_hours_end?: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false) // Start false, only load when needed
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Use API route instead of direct Supabase calls
      const response = await apiRequest<{
        notifications: Notification[]
        preferences: NotificationPreference[]
        unreadCount: number
      }>('/api/notifications', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }, {
        context: 'Loading notifications',
        retryable: true,
        logError: false, // Handle errors gracefully
        fallbackData: { notifications: [], preferences: [], unreadCount: 0 }
      })

      setNotifications(response.notifications || [])
      setUnreadCount(response.unreadCount || 0)
      setPreferences(response.preferences || [])

    } catch (err) {
      console.log('Notifications not available (expected if not implemented):', formatErrorMessage(err))
      setError('Notifications temporarily unavailable')
      // Set empty states instead of throwing errors
      setNotifications([])
      setUnreadCount(0)
      setPreferences([])
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true })
      }, {
        context: 'Marking notification as read',
        retryable: true,
        logError: false
      })

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

    } catch (err) {
      console.log('Could not mark notification as read:', formatErrorMessage(err))
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await apiRequest('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }, {
        context: 'Marking all notifications as read',
        retryable: true,
        logError: false
      })

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
      setUnreadCount(0)

    } catch (err) {
      console.log('Could not mark all notifications as read:', formatErrorMessage(err))
    }
  }, [])

  const dismissNotification = useCallback(async (notificationId: string) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }, {
        context: 'Dismissing notification',
        retryable: true,
        logError: false
      })

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId)
        return notification && !notification.read ? prev - 1 : prev
      })

    } catch (err) {
      console.log('Could not dismiss notification:', formatErrorMessage(err))
    }
  }, [notifications])

  const updatePreferences = useCallback(async (updatedPreferences: NotificationPreference[]) => {
    try {
      await apiRequest('/api/notifications/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: updatedPreferences })
      }, {
        context: 'Updating notification preferences',
        retryable: true,
        logError: true
      })

      setPreferences(updatedPreferences)

    } catch (err) {
      console.error('Error updating preferences:', formatErrorMessage(err))
      throw err
    }
  }, [])

  // Only load notifications when explicitly called (lazy loading)
  // Remove automatic loading to prevent errors on every page
  
  return {
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    updatePreferences,
    refreshNotifications: loadNotifications
  }
}