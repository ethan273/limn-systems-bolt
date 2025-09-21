'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileImage, 
  Maximize2 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DesignFile {
  id: string
  file_url: string
  thumbnail_url?: string
  file_name: string
  version: number
  uploaded_at: string
}

interface DesignApproval {
  id: string
  title: string
  description?: string
  status: 'pending' | 'approved' | 'rejected' | 'reviewing'
  reviewer_notes?: string
  design_file?: DesignFile
  created_at: string
  updated_at: string
}

interface DesignApprovalCardProps {
  approval: DesignApproval
  onAction: (approvalId: string, action: 'approve' | 'reject', notes?: string) => Promise<void>
}

export function DesignApprovalCard({ approval, onAction }: DesignApprovalCardProps) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const statusConfig = {
    pending: { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      icon: Clock, 
      label: 'Awaiting Review' 
    },
    approved: { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      icon: CheckCircle, 
      label: 'Approved' 
    },
    rejected: { 
      color: 'bg-red-100 text-red-800 border-red-200', 
      icon: XCircle, 
      label: 'Revision Requested' 
    },
    reviewing: { 
      color: 'bg-blue-100 text-blue-800 border-blue-200', 
      icon: Eye, 
      label: 'Under Review' 
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !notes.trim()) {
      // In a real app, you would show a toast notification
      console.error('Please provide revision notes')
      return
    }
    
    setIsProcessing(true)
    try {
      await onAction(approval.id, action, notes)
      setShowNotes(false)
      setNotes('')
    } catch (error) {
      console.error('Error processing approval:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const config = statusConfig[approval.status]
  const StatusIcon = config.icon

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video relative bg-gray-100">
        {approval.design_file?.file_url ? (
          <div className="w-full h-full relative">
            {approval.design_file.thumbnail_url ? (
              <Image 
                src={approval.design_file.thumbnail_url}
                alt="Design preview"
                fill
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to file icon if thumbnail fails to load
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <div className={cn(
              "flex items-center justify-center h-full",
              approval.design_file.thumbnail_url ? "hidden" : ""
            )}>
              <FileImage className="h-16 w-16 text-gray-400" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <FileImage className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Status overlay */}
        <div className="absolute top-4 right-4">
          <Badge className={cn("border", config.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        
        {/* View full button */}
        {approval.design_file?.file_url && (
          <Button
            className="absolute bottom-4 right-4"
            size="sm"
            variant="outline"
            onClick={() => window.open(approval.design_file!.file_url, '_blank')}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            View Full
          </Button>
        )}
      </div>
      
      <CardContent className="pt-4">
        <h3 className="font-semibold mb-2 text-[#4b4949]">{approval.title || 'Design Approval'}</h3>
        <p className="text-sm text-gray-600 mb-2">
          {approval.description}
        </p>
        {approval.design_file && (
          <p className="text-sm text-gray-500 mb-4">
            Version {approval.design_file.version} • 
            Uploaded {formatDate(approval.design_file.uploaded_at)}
          </p>
        )}
        
        {approval.status === 'pending' && (
          <>
            {!showNotes ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApproval('approve')}
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve Design
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setShowNotes(true)}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Request Revision
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  placeholder="Please describe what changes are needed..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => handleApproval('reject')}
                    disabled={isProcessing || !notes.trim()}
                  >
                    Submit Revision Request
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNotes(false)
                      setNotes('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
        {approval.status === 'approved' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-700 mb-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              <span className="font-medium">Approved</span>
            </div>
            <p className="text-sm text-green-600">
              Design approved on {formatDate(approval.updated_at)}
            </p>
          </div>
        )}

        {approval.status === 'rejected' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700 mb-1">
              <XCircle className="h-4 w-4 mr-2" />
              <span className="font-medium">Revision Requested</span>
            </div>
            <p className="text-sm text-red-600 mb-2">
              Feedback submitted on {formatDate(approval.updated_at)}
            </p>
          </div>
        )}
        
        {/* Previous feedback */}
        {approval.reviewer_notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm font-medium text-gray-700 mb-1">Your Feedback:</p>
            <p className="text-sm text-gray-600">{approval.reviewer_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}