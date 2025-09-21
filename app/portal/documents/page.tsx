'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DocumentUpload } from '@/components/portal/document-upload'
import { DocumentGrid } from '@/components/portal/document-grid'
import { DocumentFilters } from '@/components/portal/document-filters'
import { DocumentDetailModal } from '@/components/portal/document-detail-modal'
import { Button } from '@/components/ui/button'
import { Grid, List, Upload as UploadIcon } from 'lucide-react'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { toast } from 'sonner'

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

interface PortalSettings {
  allow_document_upload: boolean
}

export default function DocumentsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null)
  const [showUpload, setShowUpload] = useState(false)


  const filterDocuments = useCallback(() => {
    let filtered = documents

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(doc =>
        (doc.file_name || "").toLowerCase().includes(query) ||
        (doc.category || "").toLowerCase().includes(query) ||
        doc.notes?.toLowerCase().includes(query)
      )
    }

    setFilteredDocuments(filtered)
  }, [documents, selectedCategory, searchQuery])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterDocuments()
  }, [filterDocuments])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        window.location.href = '/auth'
        return
      }
      
      setUser(session.user)
      
      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (!customer) {
        toast.error('Customer not found')
        return
      }

      // Load portal settings and documents
      const [settingsResponse, documentsResponse] = await Promise.all([
        supabase
          .from('portal_settings')
          .select('allow_document_upload')
          .eq('customer_id', customer.id)
          .single(),
        supabase
          .from('client_files')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
      ])

      setPortalSettings(settingsResponse.data || { allow_document_upload: false })
      setDocuments(documentsResponse.data || [])

    } catch (error) {
      console.error('Error loading documents:', error)
      
      // Set fallback data for testing
      setPortalSettings({ allow_document_upload: true })
      setDocuments([
        {
          id: '1',
          file_name: 'Product_Specifications.pdf',
          file_type: 'application/pdf',
          file_size: 2456789,
          file_url: '/documents/specs-001.pdf',
          category: 'specifications',
          version: 1,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Latest product specifications for the new design'
        },
        {
          id: '2',
          file_name: 'Design_Mockup_v3.pdf',
          file_type: 'application/pdf',
          file_size: 5678901,
          file_url: '/documents/design-003.pdf',
          category: 'design',
          version: 3,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Final design mockup with client feedback incorporated'
        },
        {
          id: '3',
          file_name: 'Approval_Form_Signed.pdf',
          file_type: 'application/pdf',
          file_size: 345678,
          file_url: '/documents/approval-001.pdf',
          category: 'approvals',
          version: 1,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Signed approval form ready for production'
        },
        {
          id: '4',
          file_name: 'Product_Photo_1.jpg',
          file_type: 'image/jpeg',
          file_size: 1234567,
          file_url: '/documents/photo-001.jpg',
          category: 'photos',
          version: 1,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'High-resolution product photography'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const refreshDocuments = () => {
    loadData()
    toast.success('Documents refreshed')
  }

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document)
  }

  const handleDownload = (document: Document) => {
    // Track download and open file
    console.log('Downloading document:', document.file_name)
    toast.success(`Downloading ${document.file_name}`)
    
    // In a real implementation, this would hit the API endpoint
    // window.open(`/api/portal/documents/${document.id}/download`, '_blank')
    
    // For demo, just show the file URL
    window.open(document.file_url, '_blank')
  }

  const handleShare = (document: Document) => {
    // Copy share link to clipboard
    navigator.clipboard.writeText(document.file_url)
    toast.success('Document link copied to clipboard')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-gray-200 rounded-lg h-96"></div>
            <div className="lg:col-span-2 bg-gray-200 rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#4b4949]">Documents</h1>
          <p className="text-gray-600 mt-2">
            Manage and share project documents
          </p>
        </div>
        
        {/* Upload toggle for mobile */}
        {portalSettings?.allow_document_upload && (
          <div className="lg:hidden">
            <Button
              onClick={() => setShowUpload(!showUpload)}
              className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              {showUpload ? 'Hide' : 'Upload'}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile upload section */}
      {showUpload && portalSettings?.allow_document_upload && (
        <div className="lg:hidden">
          <DocumentUpload
            customerId={String(safeGet(user, ['customerId']) || 'test-customer-id')}
            onUploadComplete={() => {
              refreshDocuments()
              setShowUpload(false)
            }}
          />
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section - Desktop */}
        {portalSettings?.allow_document_upload && (
          <div className="hidden lg:block lg:col-span-1">
            <DocumentUpload
              customerId={String(safeGet(user, ['customerId']) || 'test-customer-id')}
              onUploadComplete={refreshDocuments}
            />
          </div>
        )}

        {/* Document Library */}
        <div className={portalSettings?.allow_document_upload ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-[#4b4949]">Document Library</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
                  className="border-gray-300"
                >
                  {view === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <DocumentFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Document Grid */}
            <div className="mt-6">
              {view === 'grid' ? (
                <DocumentGrid
                  documents={filteredDocuments}
                  onDocumentClick={handleDocumentClick}
                  onDownload={handleDownload}
                  onShare={handleShare}
                />
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleDocumentClick(doc)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          📄
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{doc.file_name}</p>
                          <p className="text-sm text-gray-500">
                            {doc.category} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(doc)
                          }}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Detail Modal */}
      <DocumentDetailModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onDownload={handleDownload}
        onShare={handleShare}
      />
    </div>
  )
}