'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
} from '@/components/ui/dropdown-menu';
import {
  Send,
  Paperclip,
  Smile,
  MoreHorizontal,
  Reply,
  Edit3,
  Trash2,
  Pin,
  Search,
  Filter,
  AtSign,
  Image as ImageIcon,
  File
} from 'lucide-react';

interface ProjectMessage {
  id: string;
  senderId: string;
  message: string;
  attachments: Array<{
    id: string;
    name: string;
    type: 'image' | 'file';
    url: string;
    size: number;
  }>;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  parentMessageId?: string;
  mentions: string[];
  createdAt: string;
}

interface ProjectMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  status: 'online' | 'offline' | 'away';
}

// Note: These will be replaced with API calls when project messaging backend is implemented

export default function ProjectMessages({ projectId = 'proj-1' }: { projectId?: string }) {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      // For now, return empty arrays since project messaging API isn't implemented yet
      // When implemented, these would be:
      // const [messagesResponse, membersResponse] = await Promise.all([
      //   fetch(`/api/projects/${projectId}/messages`),
      //   fetch(`/api/projects/${projectId}/members`)
      // ]);
      
      setMessages([]);
      setMembers([]);
    } catch (error) {
      console.error('Error loading project data:', error);
      setMessages([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Here you would send the message to your API
    console.log('Sending message:', { 
      message: newMessage, 
      projectId,
      parentMessageId: replyingTo 
    });
    
    setNewMessage('');
    setReplyingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getMemberById = (id: string) => {
    return members.find(member => member.id === id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredMessages = messages.filter(message => 
    !message.isDeleted &&
    (!searchQuery || (message.message || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedMessages = filteredMessages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ProjectMessage[]>);

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">Project Messages</h3>
          <Badge variant="secondary" className="text-xs">
            {messages.filter(m => !m.isDeleted).length} messages
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-4 border-b bg-gray-50">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Divider */}
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gray-100 px-3 py-1 rounded-full">
                <span className="text-xs font-medium text-gray-600">{date}</span>
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-4">
              {dateMessages.map((message) => {
                const sender = getMemberById(message.senderId);
                const isReply = !!message.parentMessageId;
                
                return (
                  <div key={message.id} className={`flex gap-3 ${isReply ? 'ml-8' : ''}`}>
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={sender?.avatar} />
                        <AvatarFallback className="text-sm">
                          {sender?.name.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {sender && (
                        <div 
                          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(sender.status)}`}
                        />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">
                          {sender?.name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {sender?.role}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.createdAt)}
                        </span>
                        {message.isEdited && (
                          <Badge variant="secondary" className="text-xs">
                            edited
                          </Badge>
                        )}
                        {isReply && (
                          <Badge variant="outline" className="text-xs">
                            <Reply className="h-3 w-3 mr-1" />
                            reply
                          </Badge>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 max-w-2xl">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {message.message}
                        </p>

                        {/* Attachments */}
                        {(message.attachments || []).length > 0 && (
                          <div className="mt-3 space-y-2">
                            {(message.attachments || []).map((attachment) => (
                              <div 
                                key={attachment.id} 
                                className="flex items-center gap-3 p-2 bg-white rounded border"
                              >
                                <div className="p-2 bg-gray-100 rounded">
                                  {attachment.type === 'image' ? (
                                    <ImageIcon className="h-4 w-4 text-gray-600" />
                                  ) : (
                                    <File className="h-4 w-4 text-gray-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {attachment.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(attachment.size)}
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm">
                                  Download
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(message.id)}
                          className="text-xs"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>

                        <DropdownMenu
                          trigger={
                            <Button variant="ghost" size="sm" className="h-6 w-6">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          }
                          items={[
                            {
                              label: "Edit",
                              icon: Edit3,
                              onClick: () => {}
                            },
                            {
                              label: "Pin",
                              icon: Pin,
                              onClick: () => {}
                            },
                            {
                              label: "Delete",
                              icon: Trash2,
                              onClick: () => {},
                              destructive: true
                            }
                          ]}
                          align="left"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Context */}
      {replyingTo && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700">
                Replying to {getMemberById(messages.find(m => m.id === replyingTo)?.senderId || '')?.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="text-blue-600"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              ref={messageInputRef}
              placeholder={replyingTo ? "Reply to message..." : "Type your message..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8">
              <AtSign className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}