'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Download, Calendar, User, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  file_url: string
  file_size: number
  uploaded_at: string
  uploaded_by: string
  uploaded_by_name?: string
  notes?: string
}

interface DocumentVersionHistoryProps {
  documentId: string
}

export function DocumentVersionHistory({ documentId }: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  const loadVersions = useCallback(async () => {
    try {
      setLoading(true)
      
      // In a real implementation, this would fetch from the API
      // const response = await fetch(`/api/portal/documents/${documentId}/versions`)
      // const data = await response.json()
      // setVersions(data)

      // For demo, use mock data
      setTimeout(() => {
        setVersions([
          {
            id: '1',
            document_id: documentId,
            version_number: 3,
            file_url: '/documents/design-003.pdf',
            file_size: 5678901,
            uploaded_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            uploaded_by: 'user-123',
            uploaded_by_name: 'John Smith',
            notes: 'Final revisions with client feedback incorporated'
          },
          {
            id: '2',
            document_id: documentId,
            version_number: 2,
            file_url: '/documents/design-002.pdf',
            file_size: 5123456,
            uploaded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            uploaded_by: 'user-123',
            uploaded_by_name: 'John Smith',
            notes: 'Updated colors and layout based on initial feedback'
          },
          {
            id: '3',
            document_id: documentId,
            version_number: 1,
            file_url: '/documents/design-001.pdf',
            file_size: 4567890,
            uploaded_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            uploaded_by: 'user-123',
            uploaded_by_name: 'John Smith',
            notes: 'Initial design mockup'
          }
        ])
        setLoading(false)
      }, 1000)

    } catch (error) {
      console.error('Error loading versions:', error)
      toast.error('Failed to load version history')
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    loadVersions()
  }, [documentId, loadVersions])

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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const downloadVersion = (version: DocumentVersion) => {
    console.log('Downloading version:', version.version_number)
    toast.success(`Downloading version ${version.version_number}`)
    
    // In a real implementation:
    // window.open(`/api/portal/documents/${documentId}/versions/${version.id}/download`, '_blank')
    
    // For demo:
    window.open(version.file_url, '_blank')
  }

  const VersionUpload = () => (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <h4 className="font-medium text-gray-900 mb-3">Upload New Version</h4>
      <div className="space-y-3">
        <div>
          <input
            type="file"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#91bdbd] file:text-white hover:file:bg-[#7da9a9]"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          />
        </div>
        <div>
          <textarea
            placeholder="Version notes (optional)..."
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
            onClick={() => {
              toast.success('New version uploaded')
              setShowUpload(false)
              // In real implementation, this would upload the file and refresh versions
            }}
          >
            Upload Version
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowUpload(false)}
            className="border-gray-300"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading versions...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-900">Version History</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowUpload(!showUpload)}
          className="border-[#91bdbd] text-[#91bdbd] hover:bg-[#91bdbd] hover:text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Upload New Version
        </Button>
      </div>

      {showUpload && <VersionUpload />}

      <div className="space-y-3">
        {versions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Version History</h3>
            <p className="text-gray-500">This document doesn&apos;t have any version history yet.</p>
          </div>
        ) : (
          versions.map((version, index) => (
            <div
              key={version.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border",
                index === 0 
                  ? "bg-green-50 border-green-200" 
                  : "bg-white border-gray-200"
              )}
            >
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                  index === 0 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-600"
                )}>
                  v{version.version_number}
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      Version {version.version_number}
                    </span>
                    {index === 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{version.uploaded_by_name || version.uploaded_by}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(version.uploaded_at)}</span>
                    </div>
                    <span>{formatFileSize(version.file_size)}</span>
                  </div>
                  
                  {version.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 px-2 py-1 rounded">
                      {version.notes}
                    </p>
                  )}
                </div>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => downloadVersion(version)}
                className="text-gray-500 hover:text-[#91bdbd]"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {versions.length > 0 && (
        <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-medium mb-1">Version Control Notes:</p>
          <ul className="space-y-1">
            <li>• Each upload creates a new version while preserving the old ones</li>
            <li>• Version numbers are automatically incremented</li>
            <li>• All versions remain accessible for download</li>
          </ul>
        </div>
      )}
    </div>
  )
}