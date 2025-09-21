import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { io } from 'socket.io-client'
import { createClient } from '@/lib/supabase/service'
import { tenantService } from './tenant'

export interface MessageData {
  id: string
  channel_id: string
  user_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'system'
  thread_id?: string
  reply_to_id?: string
  mentions: string[]
  attachments: { id: string; url: string; filename: string; type: string; size: number }[]
  created_at: string
}

export interface ChannelData {
  id: string
  tenant_id: string
  name: string
  type: 'channel' | 'direct' | 'group'
  is_private: boolean
  created_by: string
  archived: boolean
}

export interface NotificationData {
  id: string
  tenant_id: string
  recipient_id: string
  type: string
  title: string
  message: string
  category: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  metadata: Record<string, unknown>
  created_at: string
}

class RealTimeService {
  private io: SocketIOServer | null = null
  private supabase = createClient()
  private connectedUsers = new Map<string, { socketId: string; tenantId: string; userId: string }>()

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    })

    this.io.use(async (socket, next) => {
      try {
        // Authenticate socket connection
        const token = socket.handshake.auth.token
        const tenantId = socket.handshake.auth.tenantId

        if (!token || !tenantId) {
          return next(new Error('Authentication required'))
        }

        // Verify user and tenant access
        // In production, you'd verify the JWT token here
        const userId = socket.handshake.auth.userId
        
        if (!userId) {
          return next(new Error('Invalid authentication'))
        }

        // Verify tenant access
        const tenantUser = await tenantService.checkUserAccess(userId, tenantId)
        if (!tenantUser) {
          return next(new Error('Access denied to tenant'))
        }

        // Store user connection info
        socket.data = {
          userId,
          tenantId,
          role: tenantUser.role
        }

        next()
      } catch (error) {
        console.error('Socket authentication error:', error)
        next(new Error('Authentication failed'))
      }
    })

    this.io.on('connection', (socket) => {
      const { userId, tenantId } = socket.data

      console.log(`User ${userId} connected to tenant ${tenantId}`)
      
      // Store connection
      this.connectedUsers.set(userId, {
        socketId: socket.id,
        tenantId,
        userId
      })

      // Join tenant room
      socket.join(`tenant:${tenantId}`)

      // Join user's channels
      this.joinUserChannels(socket, userId)

      // Handle channel operations
      socket.on('join_channel', async (data) => {
        await this.handleJoinChannel(socket, data)
      })

      socket.on('leave_channel', async (data) => {
        await this.handleLeaveChannel(socket, data)
      })

      // Handle messaging
      socket.on('send_message', async (data) => {
        await this.handleSendMessage(socket, data)
      })

      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data)
      })

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data)
      })

      // Handle presence
      socket.on('update_presence', (data) => {
        this.handlePresenceUpdate(socket, data)
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`)
        this.connectedUsers.delete(userId)
        this.broadcastPresenceUpdate(tenantId, userId, 'offline')
      })
    })
  }

  private async joinUserChannels(socket: Socket, userId: string) {
    try {
      // Get user's channels
      const { data: channels } = await this.supabase
        .from('channel_members')
        .select(`
          channel_id,
          channels (
            id,
            name,
            type,
            is_private
          )
        `)
        .eq('user_id', userId)

      if (channels) {
        for (const member of channels) {
          socket.join(`channel:${member.channel_id}`)
        }
      }
    } catch (error) {
      console.error('Error joining user channels:', error)
    }
  }

  private async handleJoinChannel(socket: Socket, data: { channel_id: string }) {
    const { userId } = socket.data
    
    try {
      // Verify user has access to channel
      const { data: membership } = await this.supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', data.channel_id)
        .eq('user_id', userId)
        .single()

      if (membership) {
        socket.join(`channel:${data.channel_id}`)
        
        // Broadcast user joined
        socket.to(`channel:${data.channel_id}`).emit('user_joined_channel', {
          channel_id: data.channel_id,
          user_id: userId
        })
      }
    } catch (error) {
      console.error('Error joining channel:', error)
      socket.emit('error', { message: 'Failed to join channel' })
    }
  }

  private async handleLeaveChannel(socket: Socket, data: { channel_id: string }) {
    const { userId } = socket.data
    
    socket.leave(`channel:${data.channel_id}`)
    
    // Broadcast user left
    socket.to(`channel:${data.channel_id}`).emit('user_left_channel', {
      channel_id: data.channel_id,
      user_id: userId
    })
  }

  private async handleSendMessage(socket: Socket, data: {
    channel_id: string
    content: string
    message_type?: 'text' | 'file' | 'image'
    reply_to_id?: string
    mentions?: string[]
    attachments?: { id: string; url: string; filename: string; type: string; size: number }[]
  }) {
    const { userId, tenantId } = socket.data

    try {
      // Save message to database
      const { data: message, error } = await this.supabase
        .from('messages')
        .insert([{
          channel_id: data.channel_id,
          user_id: userId,
          content: data.content,
          message_type: data.message_type || 'text',
          reply_to_id: data.reply_to_id,
          mentions: data.mentions || [],
          attachments: data.attachments || []
        }])
        .select(`
          *,
          users (
            id,
            email,
            full_name
          )
        `)
        .single()

      if (error) {
        console.error('Error saving message:', error)
        socket.emit('error', { message: 'Failed to send message' })
        return
      }

      // Broadcast message to channel
      this.io?.to(`channel:${data.channel_id}`).emit('new_message', message)

      // Handle mentions
      if (data.mentions && data.mentions.length > 0) {
        for (const mentionedUserId of data.mentions) {
          await this.sendNotification({
            tenant_id: tenantId,
            recipient_id: mentionedUserId,
            type: 'mention',
            title: 'You were mentioned',
            message: `${message.users?.full_name || 'Someone'} mentioned you in a message`,
            category: 'message',
            priority: 'normal',
            metadata: {
              channel_id: data.channel_id,
              message_id: message.id
            }
          })
        }
      }

    } catch (error) {
      console.error('Error sending message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  }

  private handleTypingStart(socket: Socket, data: { channel_id: string }) {
    const { userId } = socket.data
    
    socket.to(`channel:${data.channel_id}`).emit('user_typing', {
      channel_id: data.channel_id,
      user_id: userId,
      typing: true
    })
  }

  private handleTypingStop(socket: Socket, data: { channel_id: string }) {
    const { userId } = socket.data
    
    socket.to(`channel:${data.channel_id}`).emit('user_typing', {
      channel_id: data.channel_id,
      user_id: userId,
      typing: false
    })
  }

  private handlePresenceUpdate(socket: Socket, data: { status: 'online' | 'away' | 'busy' | 'offline' }) {
    const { userId, tenantId } = socket.data
    
    this.broadcastPresenceUpdate(tenantId, userId, data.status)
  }

  private broadcastPresenceUpdate(tenantId: string, userId: string, status: string) {
    this.io?.to(`tenant:${tenantId}`).emit('presence_update', {
      user_id: userId,
      status,
      updated_at: new Date().toISOString()
    })
  }

  // Public methods for sending notifications and updates

  async sendNotification(notification: Omit<NotificationData, 'id' | 'created_at'>) {
    try {
      // Save notification to database
      const { data: savedNotification, error } = await this.supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single()

      if (error) {
        console.error('Error saving notification:', error)
        return
      }

      // Send real-time notification
      const userConnection = this.connectedUsers.get(notification.recipient_id)
      if (userConnection) {
        this.io?.to(userConnection.socketId).emit('new_notification', savedNotification)
      }

      return savedNotification
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  async broadcastToTenant(tenantId: string, event: string, data: unknown) {
    this.io?.to(`tenant:${tenantId}`).emit(event, data)
  }

  async broadcastToChannel(channelId: string, event: string, data: unknown) {
    this.io?.to(`channel:${channelId}`).emit(event, data)
  }

  async sendToUser(userId: string, event: string, data: unknown) {
    const userConnection = this.connectedUsers.get(userId)
    if (userConnection) {
      this.io?.to(userConnection.socketId).emit(event, data)
    }
  }

  getConnectedUsers(): Array<{ userId: string; tenantId: string }> {
    return Array.from(this.connectedUsers.values()).map(conn => ({
      userId: conn.userId,
      tenantId: conn.tenantId
    }))
  }

  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId)
  }

  getUserConnectionInfo(userId: string) {
    return this.connectedUsers.get(userId)
  }
}

// Singleton instance
export const realTimeService = new RealTimeService()

// Client-side hook for React components
export interface UseRealTimeOptions {
  tenantId: string
  userId: string
  token: string
}

export function createRealTimeClient(options: UseRealTimeOptions) {
  if (typeof window === 'undefined') {
    return null // Server-side
  }

  // Import moved to top of file
  
  const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
    auth: {
      token: options.token,
      tenantId: options.tenantId,
      userId: options.userId
    },
    transports: ['websocket', 'polling']
  })

  return {
    socket,
    
    // Channel operations
    joinChannel: (channelId: string) => socket.emit('join_channel', { channel_id: channelId }),
    leaveChannel: (channelId: string) => socket.emit('leave_channel', { channel_id: channelId }),
    
    // Messaging
    sendMessage: (channelId: string, content: string, options?: { message_type?: 'text' | 'file' | 'image'; reply_to_id?: string; mentions?: string[]; attachments?: { id: string; url: string; filename: string; type: string; size: number }[] }) => {
      socket.emit('send_message', {
        channel_id: channelId,
        content,
        ...options
      })
    },
    
    // Typing indicators
    startTyping: (channelId: string) => socket.emit('typing_start', { channel_id: channelId }),
    stopTyping: (channelId: string) => socket.emit('typing_stop', { channel_id: channelId }),
    
    // Presence
    updatePresence: (status: string) => socket.emit('update_presence', { status }),
    
    // Event listeners
    onMessage: (callback: (message: MessageData) => void) => socket.on('new_message', callback),
    onNotification: (callback: (notification: NotificationData) => void) => socket.on('new_notification', callback),
    onTyping: (callback: (data: unknown) => void) => socket.on('user_typing', callback),
    onPresence: (callback: (data: unknown) => void) => socket.on('presence_update', callback),
    
    // Cleanup
    disconnect: () => socket.disconnect()
  }
}