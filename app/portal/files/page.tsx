'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Download, 
  Calendar, 
  Eye,
  File,
  Image,
  FileSpreadsheet,
  Archive,
  Search
} from 'lucide-react'

interface PortalFile {
  id: string
  name: string
  type: string
  size: number
  category: string
  uploaded_at: string
  url?: string
  description?: string
}

export default function PortalFilesPage() {
  const [files, setFiles] = useState<PortalFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (customer) {
        const { data } = await supabase
          .from('files')
          .select('*')
          .eq('customer_id', customer.id)
          .order('uploaded_at', { ascending: false })

        setFiles(data || [])
      }
    } catch (error) {
      console.error('Error loading files:', error)
      setFiles([
        {
          id: '1',
          name: 'Technical_Specifications_v2.pdf',
          type: 'application/pdf',
          size: 2456789,
          category: 'specifications',
          uploaded_at: '2024-01-15T10:30:00Z',
          description: 'Updated technical specifications for aerospace components'
        },
        {
          id: '2',
          name: 'CAD_Drawings_Assembly.dwg',
          type: 'application/dwg',
          size: 8945678,
          category: 'drawings',
          uploaded_at: '2024-01-18T14:20:00Z',
          description: 'CAD drawings for main assembly components'
        },
        {
          id: '3',
          name: 'Quality_Report_Q1.xlsx',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 567890,
          category: 'reports',
          uploaded_at: '2024-01-20T09:15:00Z',
          description: 'Q1 quality assurance report and metrics'
        },
        {
          id: '4',
          name: 'Material_Certificate.pdf',
          type: 'application/pdf',
          size: 123456,
          category: 'certificates',
          uploaded_at: '2024-01-22T16:45:00Z',
          description: 'Material certification documentation'
        },
        {
          id: '5',
          name: 'Product_Images.zip',
          type: 'application/zip',
          size: 15678901,
          category: 'images',
          uploaded_at: '2024-01-25T11:30:00Z',
          description: 'High-resolution product images and renderings'
        },
        {
          id: '6',
          name: 'Invoice_ORD-2024-001.pdf',
          type: 'application/pdf',
          size: 89012,
          category: 'invoices',
          uploaded_at: '2024-01-28T08:15:00Z',
          description: 'Invoice for order ORD-2024-001'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-600" aria-label="Image file" />
    } else if (type === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-600" />
    } else if (type.includes('spreadsheet') || type.includes('excel')) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />
    } else if (type.includes('zip') || type.includes('archive')) {
      return <Archive className="w-5 h-5 text-purple-600" />
    } else {
      return <FileText className="w-5 h-5 text-gray-600" />
    }
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const categoryOptions = [
    { value: 'all', label: 'All Files' },
    { value: 'specifications', label: 'Specifications' },
    { value: 'drawings', label: 'Drawings' },
    { value: 'reports', label: 'Reports' },
    { value: 'certificates', label: 'Certificates' },
    { value: 'images', label: 'Images' },
    { value: 'invoices', label: 'Invoices' }
  ]

  const filteredFiles = files.filter(file => {
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory
    const matchesSearch = (file.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#4b4949]">Files</h1>
        <p className="text-gray-700 mt-1">Access your documents, drawings, and reports</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent">
            <SelectValue placeholder="All Files" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredFiles.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredFiles.map((file) => (
              <div key={file.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                      {getFileIcon(file.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#4b4949] truncate">{file.name}</h3>
                      {file.description && (
                        <p className="text-sm text-gray-700 mt-1">{file.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-700">
                        <span className="flex items-center">
                          <File className="w-3 h-3 mr-1" />
                          {formatFileSize(file.size)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(file.uploaded_at)}
                        </span>
                        <span className="capitalize bg-gray-100 px-2 py-1 rounded text-[#4b4949]">
                          {file.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-[#91bdbd] hover:text-[#7da9a9] hover:bg-gray-100 rounded-md transition-colors">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-[#91bdbd] hover:text-[#7da9a9] hover:bg-gray-100 rounded-md transition-colors">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#4b4949] mb-2">
            {searchTerm || selectedCategory !== 'all' 
              ? 'No files found' 
              : 'No files available'
            }
          </h3>
          <p className="text-gray-700">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Your files will appear here when they become available'
            }
          </p>
        </div>
      )}
    </div>
  )
}