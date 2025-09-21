'use client'

import React from 'react'
import Image from 'next/image'
import { Download, Share2, FileText, File, Image as ImageIcon, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface DocumentGridProps {
  documents: Document[]
  onDocumentClick: (document: Document) => void
  onDownload?: (document: Document) => void
  onShare?: (document: Document) => void
}

export function DocumentGrid({ documents, onDocumentClick, onDownload, onShare }: DocumentGridProps) {
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
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDownload = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation()
    if (onDownload) {
      onDownload(doc)
    } else {
      // Default download behavior
      window.open(`/api/portal/documents/${doc.id}/download`, '_blank')
    }
  }

  const handleShare = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation()
    if (onShare) {
      onShare(doc)
    } else {
      // Default share behavior - copy link to clipboard
      navigator.clipboard.writeText(doc.file_url)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
        <p className="text-gray-500">Upload your first document to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {documents.map((doc) => {
        const Icon = getFileIcon(doc.file_type)
        
        return (
          <div
            key={doc.id}
            className="group relative bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => onDocumentClick(doc)}
          >
            {/* Thumbnail/Icon Area */}
            <div className="aspect-square relative bg-gray-50 rounded-t-lg flex items-center justify-center overflow-hidden">
              {doc.thumbnail_url ? (
                <Image
                  src={doc.thumbnail_url}
                  alt={doc.file_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <Icon className="h-16 w-16 text-gray-400" />
              )}
              
              {/* Version Badge */}
              {doc.version > 1 && (
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  v{doc.version}
                </div>
              )}

              {/* Quick Actions Overlay (shown on hover) */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleDownload(e, doc)}
                  className="bg-white/90 hover:bg-white text-gray-700"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleShare(e, doc)}
                  className="bg-white/90 hover:bg-white text-gray-700"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Document Info */}
            <div className="p-4">
              <h4 className="font-medium text-sm text-gray-900 mb-2 truncate" title={doc.file_name}>
                {doc.file_name}
              </h4>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  {formatFileSize(doc.file_size)}
                </span>
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  getCategoryColor(doc.category)
                )}>
                  {doc.category}
                </span>
              </div>
              
              <p className="text-xs text-gray-500">
                {formatDate(doc.created_at)}
              </p>
              
              {doc.notes && (
                <p className="text-xs text-gray-400 mt-2 truncate" title={doc.notes}>
                  {doc.notes}
                </p>
              )}
            </div>

            {/* Hover shadow effect */}
            <div className="absolute inset-0 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        )
      })}
    </div>
  )
}