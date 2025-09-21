'use client'

import { useState } from 'react'
import { Send, Plus, MessageCircle, Clock, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMessages } from '@/hooks/useMessages'

interface CreateThreadDialogProps {
  onCreateThread: (subject: string, message: string, orderId?: string) => Promise<void>
  loading: boolean
}

function CreateThreadDialog({ onCreateThread, loading }: CreateThreadDialogProps) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [orderId, setOrderId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return

    try {
      await onCreateThread(subject, message, orderId || undefined)
      setSubject('')
      setMessage('')
      setOrderId('')
      setOpen(false)
    } catch (error) {
      console.error('Error creating thread:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="orderId">Related Order (Optional)</Label>
            <Input
              id="orderId"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Order ID"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !subject.trim() || !message.trim()}
              className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ThreadListProps {
  threads: unknown[]
  currentThread: unknown
  onSelectThread: (thread: unknown) => void
  searchTerm: string
  statusFilter: string
}

function ThreadList({ threads, currentThread, onSelectThread, searchTerm, statusFilter }: ThreadListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-blue-100 text-blue-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <MessageCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      case 'archived':
        return <XCircle className="w-4 h-4 text-gray-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

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

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = !searchTerm || 
      String(safeGet(thread, ['subject']) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(safeGet(thread, ['last_message']) || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !statusFilter || statusFilter === 'all' || safeGet(thread, ['status']) === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 p-1">
        {filteredThreads.map((thread) => (
          <div
            key={String(safeGet(thread, ['id']) || Math.random())}
            onClick={() => onSelectThread(thread)}
            className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
              safeGet(currentThread, ['id']) === safeGet(thread, ['id']) 
                ? 'border-[#91bdbd] bg-[#91bdbd]/5' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  {getStatusIcon(String(safeGet(thread, ['status']) || 'open'))}
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {String(safeGet(thread, ['subject']) || 'No Subject')}
                  </h4>
                  {Number(safeGet(thread, ['unread_count']) || 0) > 0 && (
                    <Badge className="bg-red-500 text-white text-xs h-5 min-w-[20px] rounded-full">
                      {Number(safeGet(thread, ['unread_count']) || 0)}
                    </Badge>
                  )}
                </div>
                
                {String(safeGet(thread, ['order', 'order_number']) || '') && (
                  <div className="text-xs text-[#91bdbd] mb-1">
                    Order: {String(safeGet(thread, ['order', 'order_number']))}
                  </div>
                )}
                
                {String(safeGet(thread, ['last_message']) || '') && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {String(safeGet(thread, ['last_message']))}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className={`text-xs ${getStatusColor(String(safeGet(thread, ['status']) || 'open'))}`}>
                {String(safeGet(thread, ['status']) || 'Open')}
              </Badge>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(String(safeGet(thread, ['last_message_at']) || Date.now()))}
              </span>
            </div>
          </div>
        ))}
        
        {filteredThreads.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <div className="text-sm text-gray-500 mb-2">No conversations found</div>
            <div className="text-xs text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Start a conversation with our team'
              }
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

interface MessageListProps {
  messages: unknown[]
  onSendMessage: (content: string) => Promise<void>
  sendingMessage: boolean
}

function MessageList({ messages, onSendMessage, sendingMessage }: MessageListProps) {
  const [newMessage, setNewMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      await onSendMessage(newMessage)
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={String(safeGet(message, ['id']) || Math.random())}
              className={`flex ${safeGet(message, ['sender_type']) === 'customer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                  safeGet(message, ['sender_type']) === 'customer'
                    ? 'bg-[#91bdbd] text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm mb-1">
                  {String(safeGet(message, ['content']) || '')}
                </div>
                <div className={`text-xs ${
                  safeGet(message, ['sender_type']) === 'customer' 
                    ? 'text-white/70' 
                    : 'text-gray-500'
                }`}>
                  {String(safeGet(message, ['sender_name']) || 'Unknown')} • {formatMessageTime(String(safeGet(message, ['created_at']) || Date.now()))}
                </div>
              </div>
            </div>
          ))}
          
          {messages.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <div className="text-sm text-gray-500 mb-2">No messages yet</div>
              <div className="text-xs text-gray-400">
                Start the conversation by sending a message below
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sendingMessage}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={sendingMessage || !newMessage.trim()}
            className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

export function MessageCenter() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  const {
    threads,
    currentThread,
    messages,
    loading,
    sendingMessage,
    error,
    selectThread,
    createThread,
    sendMessage
  } = useMessages()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <div className="text-sm text-gray-500">Loading conversations...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <div className="text-sm text-red-600">Error loading conversations: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[600px] border border-gray-200 rounded-lg bg-white">
      <div className="flex h-full">
        {/* Thread List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#4b4949]">Messages</h3>
              <CreateThreadDialog onCreateThread={createThread} loading={sendingMessage} />
            </div>
            
            {/* Search and Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Thread List */}
          <ThreadList
            threads={threads}
            currentThread={currentThread}
            onSelectThread={selectThread as (thread: unknown) => void}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
          />
        </div>

        {/* Message Area */}
        <div className="flex-1 flex flex-col">
          {currentThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#4b4949]">
                      {currentThread.subject}
                    </h3>
                    {currentThread.order?.order_number && (
                      <div className="text-sm text-[#91bdbd]">
                        Order: {currentThread.order.order_number}
                      </div>
                    )}
                  </div>
                  
                  <Badge variant="secondary" className={`${
                    currentThread.status === 'open' ? 'bg-green-100 text-green-800' :
                    currentThread.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    currentThread.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentThread.status}
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <MessageList
                messages={messages}
                onSendMessage={(content) => sendMessage(currentThread.id, content)}
                sendingMessage={sendingMessage}
              />
            </>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-lg text-gray-500 mb-2">Select a conversation</div>
                <div className="text-sm text-gray-400 mb-4">
                  Choose a conversation from the list to view messages
                </div>
                <CreateThreadDialog onCreateThread={createThread} loading={sendingMessage} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}