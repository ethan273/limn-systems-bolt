'use client'

import React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/useNotifications'


export function NotificationCenter() {
  const {
    unreadCount,
    markAllAsRead
  } = useNotifications()


  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  const trigger = (
    <Button variant="ghost" size="sm" className="relative">
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  )

  const notificationItems = [
    {
      label: 'Mark All as Read',
      onClick: handleMarkAllAsRead
    }
  ]

  return (
    <DropdownMenu 
      trigger={trigger} 
      items={notificationItems} 
      align="right"
      className="w-96"
    />
  )
}
