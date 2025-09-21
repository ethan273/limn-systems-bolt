'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, File, Image, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DocumentUploadProps {
  customerId: string
  orderId?: string
  onUploadComplete?: () => void
}

interface UploadFile extends File {
  progress?: number
  id: string
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'design', label: 'Design Files' },
  { value: 'specifications', label: 'Specifications' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'photos', label: 'Photos' }
]

export function DocumentUpload({ customerId, orderId, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [category, setCategory] = useState('general')
  const [notes, setNotes] = useState('')

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image
    if (type.includes('pdf')) return FileText
    if (type.includes('word') || type.includes('document')) return FileText
    if (type.includes('sheet') || type.includes('excel')) return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: UploadFile[] = []

    acceptedFiles.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 50MB limit`)
        return
      }

      const uploadFile: UploadFile = {
        ...file,
        id: `${Date.now()}-${Math.random()}`
      }
      validFiles.push(uploadFile)
    })

    setFiles(prev => [...prev, ...validFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    multiple: true
  })

  const removeFile = (fileId: string) => {
    setFiles(files => files.filter(f => f.id !== fileId))
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[fileId]
      return newProgress
    })
  }

  const uploadWithProgress = async (file: UploadFile): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      formData.append('notes', notes)
      formData.append('customerId', customerId)
      if (orderId) formData.append('orderId', orderId)

      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(prev => ({
            ...prev,
            [file.id]: percentComplete
          }))
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          setUploadProgress(prev => ({
            ...prev,
            [file.id]: 100
          }))
          resolve(true)
        } else {
          toast.error(`Failed to upload ${file.name}`)
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }

      xhr.onerror = () => {
        toast.error(`Error uploading ${file.name}`)
        reject(new Error('Upload error'))
      }

      xhr.open('POST', '/api/portal/documents/upload')
      xhr.send(formData)
    })
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    let successCount = 0

    try {
      for (const file of files) {
        try {
          await uploadWithProgress(file)
          successCount++
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error)
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}`)
        setFiles([])
        setUploadProgress({})
        setNotes('')
        onUploadComplete?.()
      }
    } finally {
      setUploading(false)
    }
  }

  const FileUploadItem = ({ file }: { file: UploadFile }) => {
    const Icon = getFileIcon(file.type)
    const progress = uploadProgress[file.id] || 0

    return (
      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
        <Icon className="h-8 w-8 text-gray-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          {uploading && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-[#91bdbd] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        {!uploading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeFile(file.id)}
            className="text-gray-400 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-[#4b4949] mb-2">Upload Documents</h3>
      <p className="text-sm text-gray-600 mb-6">
        Drag and drop files or click to browse. Max file size: 50MB
      </p>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-[#91bdbd] bg-[#91bdbd]/10" : "border-gray-300 hover:border-gray-400"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-gray-600">Drop files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">Drop files here or click to browse</p>
            <p className="text-xs text-gray-500">
              Supported: PDF, Word, Excel, Images (Max 50MB each)
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="font-medium text-gray-900">Files to upload</h4>
          {files.map((file) => (
            <FileUploadItem key={file.id} file={file} />
          ))}
        </div>
      )}

      {/* Upload Options */}
      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              placeholder="Add notes about these files..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
            />
          </div>

          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading {files.length} file{files.length !== 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length} file{files.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}