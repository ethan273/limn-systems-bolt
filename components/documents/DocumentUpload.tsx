import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, File, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DocumentUploadProps {
  onUpload?: (documents: unknown[]) => void
  entityType?: string | null
  entityId?: string | null
  category?: string
  maxFiles?: number
  maxFileSize?: number
}

interface FileItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: 'ready' | 'uploading' | 'uploaded' | 'error'
  error?: string | null
  documentId?: string
}

const DocumentUpload = ({ 
  onUpload, 
  entityType = null, 
  entityId = null, 
  category = 'general',
  maxFiles = 5,
  maxFileSize = 50 * 1024 * 1024 // 50MB
}: DocumentUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) return Image;
    if (mimeType?.includes('pdf') || mimeType?.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`;
    }
    return null;
  }, [maxFileSize]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileItem[] = [];
    const errors: string[] = [];

    newFiles.forEach((file) => {
      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        return;
      }

      // Check for duplicates
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name}: Duplicate file`);
        return;
      }

      validFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'ready',
        error: null
      });
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, [files, maxFiles, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFiles = async () => {
    if (files.length === 0 || uploading) return;

    setUploading(true);
    const results = [];

    for (const fileItem of files) {
      if (fileItem.status === 'uploaded') continue;

      try {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'uploading' }
            : f
        ));

        const metadata = {
          entity_type: entityType,
          entity_id: entityId,
          category,
          display_name: (fileItem.name || "").split('.')[0]
        };

        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('metadata', JSON.stringify(metadata));

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'uploaded', documentId: result.document?.id }
              : f
          ));
          results.push(result.document);
        } else {
          throw new Error(result.message || 'Upload failed');
        }

      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        ));
      }
    }

    setUploading(false);
    
    if (onUpload && results.length > 0) {
      onUpload(results);
    }
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'uploaded'));
  };

  const uploadedCount = files.filter(f => f.status === 'uploaded').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200
          ${isDragOver 
            ? 'border-primary bg-glacier-50' 
            : 'border-stone-200 hover:border-stone-300'
          }
          ${files.length === 0 ? 'py-12' : 'py-8'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className={`mx-auto h-8 w-8 ${isDragOver ? 'text-primary' : 'text-graphite'}`} />
          <div className="mt-4">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center"
            >
              Select files
            </Button>
            <p className="mt-2 text-sm text-graphite">
              or drag and drop files here
            </p>
          </div>
          <p className="text-xs text-graphite mt-2">
            Maximum {maxFiles} files, up to {formatFileSize(maxFileSize)} each
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-heading">
              Files ({files.length})
            </h3>
            <div className="flex gap-2">
              {uploadedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                >
                  Clear completed ({uploadedCount})
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {files.map((fileItem) => {
              const FileIcon = getFileIcon(fileItem.type);
              
              return (
                <Card
                  key={fileItem.id}
                  className={`
                    ${fileItem.status === 'uploaded' ? 'border-green-200 bg-green-50' :
                      fileItem.status === 'error' ? 'border-red-200 bg-red-50' :
                      fileItem.status === 'uploading' ? 'border-primary bg-glacier-50' :
                      ''
                    }
                  `}
                >
                  <CardContent className="flex items-center p-4">
                    <FileIcon className={`h-5 w-5 mr-3 ${
                      fileItem.status === 'uploaded' ? 'text-green-600' :
                      fileItem.status === 'error' ? 'text-red-600' :
                      fileItem.status === 'uploading' ? 'text-primary' :
                      'text-graphite'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">
                        {fileItem.name}
                      </p>
                      <p className="text-xs text-graphite">
                        {formatFileSize(fileItem.size)}
                      </p>
                      {fileItem.error && (
                        <p className="text-xs text-red-600 mt-1">
                          {fileItem.error}
                        </p>
                      )}
                    </div>

                  <div className="flex items-center ml-4">
                    {fileItem.status === 'uploaded' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {fileItem.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    {fileItem.status === 'uploading' && (
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    )}
                    {fileItem.status === 'ready' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileItem.id)}
                        className="text-graphite hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Upload Button */}
          {files.some(f => f.status === 'ready') && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={uploadFiles}
                disabled={uploading}
                className="px-6"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  `Upload ${files.filter(f => f.status === 'ready').length} files`
                )}
              </Button>
            </div>
          )}

          {/* Status Summary */}
          {(uploadedCount > 0 || errorCount > 0) && (
            <div className="pt-4 text-sm text-graphite">
              {uploadedCount > 0 && (
                <span className="text-green-600">
                  ✓ {uploadedCount} uploaded successfully
                </span>
              )}
              {uploadedCount > 0 && errorCount > 0 && ' • '}
              {errorCount > 0 && (
                <span className="text-red-600">
                  ✗ {errorCount} failed
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;