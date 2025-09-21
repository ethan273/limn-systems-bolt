'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Paperclip, 
  Smile, 
  Hash, 
  Users, 
  MoreVertical,
  Reply,
  Edit3
} from 'lucide-react'
import { formatDistance } from 'date-fns'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { createRealTimeClient, MessageData } from '@/lib/services/real-time'

interface ChatInterfaceProps {
  channelId: string
  tenantId: string
  userId: string
  token: string
  className?: string
}


interface Channel {
  id: string
  name: string
  type: 'channel' | 'direct' | 'group'
  is_private: boolean
  member_count?: number
}

export function ChatInterface({ channelId, tenantId, userId, token, className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [channel, setChannel] = useState<Channel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const realTimeClient = useRef<unknown>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadChannelData = useCallback(async () => {
    try {
      const response = await fetch(`/api/channels/${channelId}`, {
        headers: {
          'x-tenant-id': tenantId
        }
      })
      if (response.ok) {
        const data = await response.json()
        setChannel(data)
      }
    } catch (error) {
      console.error('Error loading channel:', error)
    }
  }, [channelId, tenantId])

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/channels/${channelId}/messages`, {
        headers: {
          'x-tenant-id': tenantId
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [channelId, tenantId])

  // Initialize real-time connection
  useEffect(() => {
    const client = createRealTimeClient({ tenantId, userId, token })
    if (!client) return

    realTimeClient.current = client
    const { socket } = client

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true)
      client.joinChannel(channelId)
      loadChannelData()
      loadMessages()
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // Message events
    client.onMessage((message: MessageData) => {
      if (message.channel_id === channelId) {
        setMessages(prev => [...prev, message])
      }
    })

    // Typing events
    client.onTyping((data: unknown) => {
      const channelIdFromData = safeGet(data, ['channel_id']);
      const userIdFromData = safeGet(data, ['user_id']);
      const typingStatus = safeGet(data, ['typing']);
      
      if (channelIdFromData === channelId && userIdFromData !== userId) {
        setTypingUsers(prev => {
          if (typingStatus) {
            return prev.includes(String(userIdFromData)) ? prev : [...prev, String(userIdFromData)]
          } else {
            return prev.filter(id => id !== String(userIdFromData))
          }
        })
      }
    })

    return () => {
      client.disconnect()
    }
  }, [channelId, tenantId, userId, token, loadChannelData, loadMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !realTimeClient.current) return

    (realTimeClient.current as any)?.sendMessage?.(channelId, newMessage.trim())
    setNewMessage('')
    
    // Stop typing
    if (isTyping) {
      (realTimeClient.current as any)?.stopTyping?.(channelId)
      setIsTyping(false)
    }
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)

    if (!realTimeClient.current) return

    // Start typing indicator
    if (!isTyping && value.trim()) {
      (realTimeClient.current as any)?.startTyping?.(channelId)
      setIsTyping(true)
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        (realTimeClient.current as any)?.stopTyping(channelId)
        setIsTyping(false)
      }
    }, 3000)

    // Stop typing if message is empty
    if (!value.trim() && isTyping) {
      (realTimeClient.current as any)?.stopTyping?.(channelId)
      setIsTyping(false)
    }
  }

  const formatMessageTime = (timestamp: string) => {
    return formatDistance(new Date(timestamp), new Date(), { addSuffix: true })
  }

  const renderMessage = (message: MessageData) => {
    const isCurrentUser = message.user_id === userId
    
    return (
      <div
        key={message.id}
        className={`flex gap-3 p-2 hover:bg-muted/50 group ${isCurrentUser ? 'ml-12' : ''}`}
      >
        {!isCurrentUser && (
          <Avatar className="w-8 h-8 mt-1">
            <AvatarImage src={String(safeGet(message, ['users', 'avatar_url']) || '')} />
            <AvatarFallback>
              {String(safeGet(message, ['users', 'full_name']) || safeGet(message, ['users', 'email']) || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {String(safeGet(message, ['users', 'full_name']) || safeGet(message, ['users', 'email']) || 'Unknown User')}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatMessageTime(message.created_at)}
            </span>
            {isCurrentUser && (
              <Badge variant="secondary" className="text-xs">You</Badge>
            )}
          </div>
          
          <div className="text-sm text-foreground break-words">
            {message.content}
          </div>
          
          {message.attachments && (message.attachments || []).length > 0 && (
            <div className="mt-2 space-y-1">
              {(message.attachments || []).map((attachment, index) => (
                <div key={index} className="text-xs text-muted-foreground">
                  📎 {attachment.filename}
                </div>
              ))}
            </div>
          )}
          
          {/* Message actions (visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <Reply className="w-3 h-3" />
            </Button>
            {isCurrentUser && (
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Edit3 className="w-3 h-3" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {channel?.type === 'channel' ? (
            <Hash className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Users className="w-5 h-5 text-muted-foreground" />
          )}
          <h3 className="font-semibold">{channel?.name || 'Loading...'}</h3>
          {channel?.member_count && (
            <Badge variant="secondary">{channel.member_count} members</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Hash className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse delay-75"></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse delay-150"></div>
            </div>
            <span>
              {typingUsers.length === 1 ? '1 person is' : `${typingUsers.length} people are`} typing...
            </span>
          </div>
        )}
      </ScrollArea>

      {/* Message input */}
      <div className="p-4 border-t">
        <form onSubmit={sendMessage} className="flex items-end gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 p-3 border rounded-lg focus-within:border-primary">
              <Input
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder={`Message ${channel?.name || 'channel'}...`}
                className="border-0 focus-visible:ring-0 p-0 h-auto resize-none"
                disabled={!isConnected}
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <Button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}