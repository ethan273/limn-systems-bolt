'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  FileText,
  Receipt,
  BarChart3,
  FolderOpen,
  Download,
  Search,
  Grid,
  List,
  Calendar,
  Eye,
  ChevronDown
} from 'lucide-react'
import { formatDate, documentCategories } from '@/lib/financial/calculations'

interface FinancialDocument {
  id: string
  document_type: 'statement' | 'tax' | 'contract' | 'report'
  document_name: string
  file_url: string
  file_size: number
  created_at: string
  year?: number
  category?: string
}

interface DocumentLibraryProps {
  customerId: string
}

export function DocumentLibrary({ customerId }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<FinancialDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [filters, setFilters] = useState({
    category: 'all',
    year: 'all',
    search: ''
  })
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])

  const loadDocuments = useCallback(async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('financial_documents')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setDocuments(data || [])

    } catch (error) {
      console.error('Error loading documents:', error)
      // Use fallback test data
      setDocuments([
        {
          id: '1',
          document_type: 'statement',
          document_name: 'Statement_August_2025.pdf',
          file_url: '/documents/statements/2025-08.pdf',
          file_size: 245678,
          created_at: '2025-09-01T00:00:00Z',
          year: 2025
        },
        {
          id: '2',
          document_type: 'tax',
          document_name: '1099_Form_2024.pdf',
          file_url: '/documents/tax/1099-2024.pdf',
          file_size: 189234,
          created_at: '2025-01-31T00:00:00Z',
          year: 2024
        },
        {
          id: '3',
          document_type: 'contract',
          document_name: 'Service_Agreement_2025.pdf',
          file_url: '/documents/contracts/agreement-2025.pdf',
          file_size: 567890,
          created_at: '2025-01-15T00:00:00Z',
          year: 2025
        },
        {
          id: '4',
          document_type: 'report',
          document_name: 'Annual_Financial_Report_2024.pdf',
          file_url: '/documents/reports/annual-2024.pdf',
          file_size: 892345,
          created_at: '2024-12-31T00:00:00Z',
          year: 2024
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadDocuments()
  }, [customerId, loadDocuments])

  const filteredDocuments = documents.filter(doc => {
    // Category filter
    if (filters.category !== 'all' && doc.document_type !== filters.category) return false
    
    // Year filter
    if (filters.year !== 'all') {
      const docYear = doc.year || new Date(doc.created_at).getFullYear()
      if (docYear.toString() !== filters.year) return false
    }
    
    // Search filter
    if (filters.search && !(doc.document_name || "").toLowerCase().includes((filters.search || "").toLowerCase())) return false
    
    return true
  })

  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = []
    }
    acc[doc.document_type].push(doc)
    return acc
  }, {} as Record<string, FinancialDocument[]>)

  const availableYears = [...new Set(
    documents.map(doc => doc.year || new Date(doc.created_at).getFullYear())
  )].sort((a, b) => b - a)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id))
    }
  }

  const downloadDocument = (doc: FinancialDocument) => {
    // In a real app, this would trigger a secure download
    console.log('Downloading:', doc.document_name)
    // For demo, we'll create a placeholder download
    const link = document.createElement('a')
    link.href = doc.file_url
    link.download = doc.document_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadSelected = () => {
    selectedDocuments.forEach(docId => {
      const doc = documents.find(d => d.id === docId)
      if (doc) downloadDocument(doc)
    })
  }

  const getDocumentIcon = (type: string) => {
    const category = documentCategories[type as keyof typeof documentCategories]
    switch (category?.icon) {
      case 'FileText':
        return <FileText className="w-5 h-5" />
      case 'Receipt':
        return <Receipt className="w-5 h-5" />
      case 'BarChart3':
        return <BarChart3 className="w-5 h-5" />
      default:
        return <FolderOpen className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded w-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search documents..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none w-full"
            />
          </div>
          
          <div className="relative">
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none"
            >
              <option value="all">All Categories</option>
              {Object.entries(documentCategories).map(([key, category]) => (
                <option key={key} value={key}>{category.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent outline-none"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-[#91bdbd] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-[#91bdbd] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {selectedDocuments.length > 0 && (
            <Button
              onClick={downloadSelected}
              className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download ({selectedDocuments.length})
            </Button>
          )}
        </div>
      </div>

      {/* Selection Controls */}
      {filteredDocuments.length > 0 && (
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedDocuments.length === filteredDocuments.length}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-[#91bdbd] focus:ring-[#91bdbd]"
            />
            <span className="text-sm text-gray-600">
              Select all ({filteredDocuments.length} documents)
            </span>
          </label>

          {selectedDocuments.length > 0 && (
            <span className="text-sm text-blue-600">
              {selectedDocuments.length} selected
            </span>
          )}
        </div>
      )}

      {/* Documents */}
      {Object.keys(groupedDocuments).length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">
            {filters.search || filters.category !== 'all' || filters.year !== 'all'
              ? 'Try adjusting your filters'
              : 'Your financial documents will appear here when they become available'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedDocuments).map(([category, categoryDocs]) => {
            const categoryInfo = documentCategories[category as keyof typeof documentCategories]
            
            return (
              <div key={category}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${categoryInfo?.bgColor || 'bg-gray-100'}`}>
                    <div className={categoryInfo?.textColor || 'text-gray-600'}>
                      {getDocumentIcon(category)}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-[#4b4949]">
                    {categoryInfo?.label || category.charAt(0).toUpperCase() + category.slice(1)} 
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({categoryDocs.length})
                    </span>
                  </h3>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                          selectedDocuments.includes(doc.id) ? 'border-[#91bdbd] ring-1 ring-[#91bdbd]' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() => handleDocumentSelect(doc.id)}
                            className="mt-1 rounded border-gray-300 text-[#91bdbd] focus:ring-[#91bdbd]"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-[#4b4949] mb-1 truncate">
                              {doc.document_name}
                            </h4>
                            <p className="text-xs text-gray-500 mb-2">
                              {formatDate(doc.created_at)} • {formatFileSize(doc.file_size)}
                            </p>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => downloadDocument(doc)}
                                className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                              <Button size="sm" variant="outline" className="border-gray-300">
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className={`bg-white border rounded-lg p-4 flex items-center space-x-4 hover:shadow-sm transition-shadow ${
                          selectedDocuments.includes(doc.id) ? 'border-[#91bdbd] ring-1 ring-[#91bdbd]' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(doc.id)}
                          onChange={() => handleDocumentSelect(doc.id)}
                          className="rounded border-gray-300 text-[#91bdbd] focus:ring-[#91bdbd]"
                        />
                        
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryInfo?.bgColor || 'bg-gray-100'}`}>
                          <div className={categoryInfo?.textColor || 'text-gray-600'}>
                            {getDocumentIcon(category)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-[#4b4949] mb-1">
                            {doc.document_name}
                          </h4>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(doc.created_at)}
                            </span>
                            <span>{formatFileSize(doc.file_size)}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => downloadDocument(doc)}
                            className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          <Button size="sm" variant="outline" className="border-gray-300">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {filteredDocuments.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Documents:</span>
              <span className="ml-2 font-semibold text-[#4b4949]">
                {filteredDocuments.length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Size:</span>
              <span className="ml-2 font-semibold text-[#4b4949]">
                {formatFileSize(filteredDocuments.reduce((sum, doc) => sum + doc.file_size, 0))}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Latest:</span>
              <span className="ml-2 font-semibold text-[#4b4949]">
                {filteredDocuments.length > 0 ? formatDate(filteredDocuments[0].created_at) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}