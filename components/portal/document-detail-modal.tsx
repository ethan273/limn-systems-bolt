'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { X, Download, Share2, FileText, File, Image as ImageIcon, FileSpreadsheet, Calendar, User, Tag, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentVersionHistory } from './document-version-history'
import { cn } from '@/lib/utils'

interface Document {
  id: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  category: string
  version: number
  created_at: string
  uploaded_by?: string
  notes?: string
  thumbnail_url?: string
}

interface DocumentDetailModalProps {
  document: Document | null
  onClose: () => void
  onDownload?: (document: Document) => void
  onShare?: (document: Document) => void
}

export function DocumentDetailModal({ document, onClose, onDownload, onShare }: DocumentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'versions' | 'activity'>('details')

  if (!document) return null

  const getFileIcon = (fileType: string) => {
    const iconMap = {
      'pdf': FileText,
      'doc': FileText,
      'docx': FileText,
      'xls': FileSpreadsheet,
      'xlsx': FileSpreadsheet,
      'jpg': ImageIcon,
      'jpeg': ImageIcon,
      'png': ImageIcon,
      'default': File
    }
    
    const ext = fileType.split('.').pop()?.toLowerCase() || 'default'
    const Icon = iconMap[ext as keyof typeof iconMap] || iconMap.default
    return Icon
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'general': 'bg-gray-100 text-gray-800',
      'design': 'bg-purple-100 text-purple-800',
      'specifications': 'bg-blue-100 text-blue-800',
      'approvals': 'bg-green-100 text-green-800',
      'photos': 'bg-yellow-100 text-yellow-800'
    }
    return colors[category as keyof typeof colors] || colors.general
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(document)
    } else {
      window.open(`/api/portal/documents/${document.id}/download`, '_blank')
    }
  }

  const handleShare = () => {
    if (onShare) {
      onShare(document)
    } else {
      navigator.clipboard.writeText(document.file_url)
    }
  }

  const Icon = getFileIcon(document.file_type)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Icon className="h-8 w-8 text-gray-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{document.file_name}</h2>
              <p className="text-sm text-gray-500">{formatFileSize(document.file_size)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleDownload}
              className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="border-gray-300"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'versions', label: 'Versions', icon: Calendar },
              { id: 'activity', label: 'Activity', icon: MessageSquare }
            ].map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-[#91bdbd] text-[#91bdbd]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <TabIcon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* File Preview */}
              <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center">
                {document.thumbnail_url ? (
                  <Image
                    src={document.thumbnail_url}
                    alt={document.file_name}
                    fill
                    className="object-contain rounded-lg"
                  />
                ) : document.file_type.startsWith('image/') ? (
                  <div className="text-center">
                    <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Image Preview</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Icon className="h-16 w-16 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No Preview Available</p>
                  </div>
                )}
              </div>

              {/* File Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Category</span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                    getCategoryColor(document.category)
                  )}>
                    {document.category}
                  </span>

                  <div className="flex items-center space-x-2 mt-4">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Uploaded</span>
                  </div>
                  <p className="text-sm text-gray-600">{formatDate(document.created_at)}</p>

                  {document.uploaded_by && (
                    <>
                      <div className="flex items-center space-x-2 mt-4">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Uploaded by</span>
                      </div>
                      <p className="text-sm text-gray-600">{document.uploaded_by}</p>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">File Details</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">Type: {document.file_type}</p>
                      <p className="text-sm text-gray-600">Size: {formatFileSize(document.file_size)}</p>
                      <p className="text-sm text-gray-600">Version: {document.version}</p>
                    </div>
                  </div>

                  {document.notes && (
                    <div>
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Notes</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        {document.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <DocumentVersionHistory documentId={document.id} />
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
                <p className="text-gray-500">Document activity will appear here when available.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}