'use client'

import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  FileImage,
  Clock,
  ExternalLink
} from 'lucide-react'

interface DesignFile {
  id: string
  file_url: string
  thumbnail_url?: string
  file_name: string
  version: number
  uploaded_at: string
}

interface Order {
  id: string
  order_number: string
}

interface HistoryEvent {
  id: string
  action: string
  notes?: string
  created_at: string
  created_by?: string
}

interface DesignApprovalHistory {
  id: string
  title: string
  description?: string
  status: 'pending' | 'approved' | 'rejected' | 'reviewing'
  reviewer_notes?: string
  design_file?: DesignFile
  order?: Order
  created_at: string
  updated_at: string
  history?: HistoryEvent[]
}

interface ApprovalHistoryListProps {
  approvals: DesignApprovalHistory[]
}

export function ApprovalHistoryList({ approvals }: ApprovalHistoryListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatActionName = (action: string) => {
    switch (action) {
      case 'created': return 'Created'
      case 'approved': return 'Approved'
      case 'rejected': return 'Revision Requested'
      case 'revision_requested': return 'Revision Requested'
      case 'reviewed': return 'Under Review'
      case 'updated': return 'Updated'
      default: return action.charAt(0).toUpperCase() + action.slice(1)
    }
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">No approval history</p>
          <p className="text-sm text-gray-500">
            Your design approval history will appear here once you start reviewing designs
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {approvals.map((approval) => (
        <Card key={approval.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4 flex-1">
                {/* Thumbnail */}
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {approval.design_file?.thumbnail_url ? (
                    <Image 
                      src={approval.design_file.thumbnail_url}
                      alt={approval.title}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to file icon if thumbnail fails to load
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${approval.design_file?.thumbnail_url ? 'hidden' : ''}`}>
                    <FileImage className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[#4b4949] mb-1">{approval.title}</h4>
                  {approval.order && (
                    <p className="text-sm text-gray-600 mb-2">
                      Order: {approval.order.order_number}
                    </p>
                  )}
                  
                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3">
                    {approval.status === 'approved' ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : approval.status === 'rejected' ? (
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Revision Requested
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        {approval.status === 'pending' ? 'Pending' : 'Under Review'}
                      </Badge>
                    )}
                    <span className="text-sm text-gray-500">
                      {formatDate(approval.updated_at)}
                    </span>
                  </div>
                  
                  {/* Notes */}
                  {approval.reviewer_notes && (
                    <div className="p-3 bg-gray-50 rounded-lg mb-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-1">Your Feedback:</p>
                      <p className="text-sm text-gray-600 italic">
                        &ldquo;{approval.reviewer_notes}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Version History */}
                  {approval.history && (approval.history || []).length > 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Timeline</p>
                      <div className="space-y-1">
                        {(approval.history || []).slice().reverse().map((event, i) => (
                          <div key={event.id || i} className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-2 h-2 bg-[#91bdbd] rounded-full flex-shrink-0"></div>
                            <span className="font-medium">{formatActionName(event.action)}</span>
                            <span>•</span>
                            <span>{formatDate(event.created_at)}</span>
                            {event.notes && (
                              <>
                                <span>•</span>
                                <span className="italic">&ldquo;{event.notes}&rdquo;</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col gap-2 ml-4">
                {approval.design_file?.file_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(approval.design_file!.file_url, '_blank')}
                    className="whitespace-nowrap"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Design
                  </Button>
                )}
                {approval.design_file && (
                  <p className="text-xs text-gray-500 text-center">
                    v{approval.design_file.version}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}