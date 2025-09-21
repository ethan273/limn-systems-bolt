'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface MessageThread {
  id: string
  customer_id: string
  order_id?: string
  subject: string
  status: 'open' | 'pending' | 'resolved' | 'archived'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to?: string
  last_message_at: string
  created_at: string
  updated_at: string
  unread_count?: number
  last_message?: string
  order?: {
    order_number: string
  }
}

interface Message {
  id: string
  thread_id: string
  sender_type: 'customer' | 'staff' | 'system'
  sender_id: string
  sender_name: string
  sender_email?: string
  content: string
  attachments: { id: string; name: string; url: string; size: number }[]
  read_at?: string
  created_at: string
}

export function useMessages() {
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [currentThread, setCurrentThread] = useState<MessageThread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const loadThreads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        return
      }

      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!customer) {
        setError('Customer not found')
        return
      }

      // Load message threads with last message info
      const { data: threadsData, error: threadsError } = await supabase
        .from('message_threads')
        .select(`
          *,
          order:orders(order_number),
          messages!inner(
            id,
            content,
            created_at,
            read_at,
            sender_type,
            sender_name
          )
        `)
        .eq('customer_id', customer.id)
        .order('last_message_at', { ascending: false })

      if (threadsError) {
        setError(threadsError.message)
        return
      }

      // Process threads to add unread count and last message
      const processedThreads = threadsData?.map(thread => {
        const threadMessages = thread.messages || []
        const unreadCount = threadMessages.filter((m: unknown) => {
          const msg = m as Record<string, unknown>
          return !msg.read_at && msg.sender_type === 'staff'
        }).length
        const lastMessage = threadMessages
          .sort((a: unknown, b: unknown) => {
            const msgA = a as Record<string, unknown>
            const msgB = b as Record<string, unknown>
            return new Date(String(msgB.created_at)).getTime() - new Date(String(msgA.created_at)).getTime()
          })[0]

        return {
          ...thread,
          unread_count: unreadCount,
          last_message: lastMessage ? 
            String((lastMessage as Record<string, unknown>).content || '').substring(0, 100) + 
            (String((lastMessage as Record<string, unknown>).content || '').length > 100 ? '...' : '') : '',
          messages: undefined // Remove messages array to clean up data
        }
      }) || []

      setThreads(processedThreads)

    } catch (err) {
      console.error('Error loading threads:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const loadMessages = useCallback(async (threadId: string) => {
    try {
      setError(null)

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        setError(messagesError.message)
        return
      }

      setMessages(messagesData || [])

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .is('read_at', null)
        .eq('sender_type', 'staff')

    } catch (err) {
      console.error('Error loading messages:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [supabase])

  const selectThread = useCallback((thread: MessageThread) => {
    setCurrentThread(thread)
    loadMessages(thread.id)
  }, [loadMessages])

  const createThread = useCallback(async (subject: string, message: string, orderId?: string) => {
    try {
      setSendingMessage(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!customer) throw new Error('Customer not found')

      // Create thread
      const { data: threadData, error: threadError } = await supabase
        .from('message_threads')
        .insert({
          customer_id: customer.id,
          order_id: orderId || null,
          subject,
          status: 'open',
          priority: 'normal'
        })
        .select()
        .single()

      if (threadError) throw threadError

      // Create first message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadData.id,
          sender_type: 'customer',
          sender_id: customer.id,
          sender_name: user.email || 'Customer',
          sender_email: user.email,
          content: message
        })

      if (messageError) throw messageError

      // Refresh threads
      await loadThreads()

      return threadData

    } catch (err) {
      console.error('Error creating thread:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setSendingMessage(false)
    }
  }, [supabase, loadThreads])

  const sendMessage = useCallback(async (threadId: string, content: string) => {
    try {
      setSendingMessage(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!customer) throw new Error('Customer not found')

      // Send message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_type: 'customer',
          sender_id: customer.id,
          sender_name: user.email || 'Customer',
          sender_email: user.email,
          content
        })
        .select()
        .single()

      if (messageError) throw messageError

      // Add to local messages
      setMessages(prev => [...prev, messageData])

      // Update thread status to open if it was resolved
      await supabase
        .from('message_threads')
        .update({ status: 'open' })
        .eq('id', threadId)
        .eq('status', 'resolved')

    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setSendingMessage(false)
    }
  }, [supabase])

  const updateThreadStatus = useCallback(async (threadId: string, status: MessageThread['status']) => {
    try {
      const { error } = await supabase
        .from('message_threads')
        .update({ status })
        .eq('id', threadId)

      if (error) throw error

      // Update local state
      setThreads(prev => 
        prev.map(thread => 
          thread.id === threadId ? { ...thread, status } : thread
        )
      )

      if (currentThread?.id === threadId) {
        setCurrentThread(prev => prev ? { ...prev, status } : null)
      }

    } catch (err) {
      console.error('Error updating thread status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [supabase, currentThread])

  // Set up real-time subscriptions
  useEffect(() => {
    let threadsChannel: RealtimeChannel | null = null
    let messagesChannel: RealtimeChannel | null = null

    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!customer) return

      // Subscribe to thread changes
      threadsChannel = supabase
        .channel(`message_threads:${customer.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_threads',
            filter: `customer_id=eq.${customer.id}`
          },
          () => {
            // Reload threads on any change
            loadThreads()
          }
        )
        .subscribe()

      // Subscribe to new messages
      messagesChannel = supabase
        .channel(`messages:${customer.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            const newMessage = payload.new as Message
            // Only add if it's for the current thread
            if (currentThread && newMessage.thread_id === currentThread.id) {
              setMessages(prev => [...prev, newMessage])
            }
            // Refresh threads to update unread counts
            loadThreads()
          }
        )
        .subscribe()
    }

    setupRealtimeSubscriptions()

    return () => {
      if (threadsChannel) supabase.removeChannel(threadsChannel)
      if (messagesChannel) supabase.removeChannel(messagesChannel)
    }
  }, [supabase, currentThread, loadThreads])

  // Load threads on mount
  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  return {
    threads,
    currentThread,
    messages,
    loading,
    sendingMessage,
    error,
    loadThreads,
    selectThread,
    createThread,
    sendMessage,
    updateThreadStatus
  }
}