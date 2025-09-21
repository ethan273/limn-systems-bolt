'use client';

import React, { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Upload, 
  File, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  Download,
  Eye
} from 'lucide-react';
import { formatErrorMessage } from '@/lib/error-handling';

interface DocumentFile {
  id: string;
  board_id: string;
  object_id?: string;
  file_name: string;
  file_url: string;
  file_type: 'pdf' | 'image' | 'docx' | 'xlsx';
  page_count: number;
  file_size: number;
  storage_path: string;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

interface DocumentUploaderProps {
  boardId: string;
  onClose: () => void;
  onDocumentUploaded: (document: DocumentFile) => void;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg,.jpeg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUploader({ boardId, onClose, onDocumentUploaded }: DocumentUploaderProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Get file type icon
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'xlsx':
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-purple-600" />;
      default:
        return <File className="w-5 h-5 text-slate-600" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)) {
      return `File type ${file.type} is not supported. Please upload PDF, Word, Excel, or image files.`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size ${formatFileSize(file.size)} exceeds the maximum limit of ${formatFileSize(MAX_FILE_SIZE)}.`;
    }

    return null;
  }, []);

  // Upload file to Supabase Storage
  const uploadFileToStorage = useCallback(async (file: File): Promise<{ path: string; url: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `design-boards/${boardId}/${fileName}`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(error.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return {
        path: filePath,
        url: publicUrl
      };
    } catch (error) {
      console.error('Error uploading file to storage:', error);
      throw error;
    }
  }, [boardId, supabase]);

  // Save document metadata to database
  const saveDocumentMetadata = useCallback(async (
    file: File, 
    storageData: { path: string; url: string }
  ): Promise<DocumentFile> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Determine file type
      let fileType: DocumentFile['file_type'] = 'pdf';
      if (file.type.startsWith('image/')) {
        fileType = 'image';
      } else if (file.type.includes('wordprocessingml')) {
        fileType = 'docx';
      } else if (file.type.includes('spreadsheetml')) {
        fileType = 'xlsx';
      }

      // Create document record
      const documentData = {
        board_id: boardId,
        file_name: file.name,
        file_url: storageData.url,
        file_type: fileType,
        page_count: fileType === 'pdf' ? 1 : 1, // Would need PDF.js to get actual page count
        file_size: file.size,
        storage_path: storageData.path,
        metadata: {
          originalName: file.name,
          mimeType: file.type,
          uploadedAt: new Date().toISOString()
        },
        created_by: user.id
      };

      const { data: result, error } = await supabase
        .from('board_documents')
        .insert([documentData])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return result;
    } catch (error) {
      console.error('Error saving document metadata:', error);
      throw error;
    }
  }, [boardId, supabase]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    setUploadError(null);
    
    const uploadPromises = Array.from(files).map(async (file) => {
      const fileId = `${file.name}-${Date.now()}`;
      
      try {
        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
          throw new Error(validationError);
        }

        // Update progress
        setUploadProgress(prev => ({ ...prev, [fileId]: 10 }));

        // Upload to storage
        const storageData = await uploadFileToStorage(file);
        if (!storageData) {
          throw new Error('Failed to upload file to storage');
        }

        setUploadProgress(prev => ({ ...prev, [fileId]: 70 }));

        // Save metadata to database
        const document = await saveDocumentMetadata(file, storageData);
        
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        // Add to documents list
        setDocuments(prev => [...prev, document]);
        
        // Notify parent component
        onDocumentUploaded(document);

        return document;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploadError(formatErrorMessage(error, `upload ${file.name}`));
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        throw error;
      }
    });

    try {
      await Promise.allSettled(uploadPromises);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [validateFile, uploadFileToStorage, saveDocumentMetadata, onDocumentUploaded]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  // Handle file input
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
    // Reset input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  // Delete document
  const handleDeleteDocument = useCallback(async (document: DocumentFile) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storage_path]);

      if (storageError) {
        console.warn('Error deleting file from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('board_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) {
        throw new Error(dbError.message);
      }

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
    } catch (error) {
      console.error('Error deleting document:', error);
      setUploadError(formatErrorMessage(error, 'delete document'));
    }
  }, [supabase]);

  return (
    <Card className="w-full h-full limn-panel">
      <CardHeader className="limn-panel-header">
        <div className="flex items-center justify-between">
          <CardTitle className="limn-panel-title">Document Upload</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="limn-panel-content">
        {/* Upload area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-glacier-50' 
              : 'border-slate-300 hover:border-slate-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          
          <h3 className="font-semibold text-slate-900 mb-2">
            Drop files here or click to browse
          </h3>
          
          <p className="text-sm text-slate-600 mb-4">
            Supports PDF, Word, Excel, and image files up to {formatFileSize(MAX_FILE_SIZE)}
          </p>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </>
            )}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={Object.values(ACCEPTED_FILE_TYPES).join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Upload progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-4 space-y-2">
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 truncate">
                      {fileId.split('-')[0]}
                    </span>
                    <span className="text-slate-500">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="mt-4 limn-error">
            <AlertCircle className="w-4 h-4 mr-2" />
            {uploadError}
          </div>
        )}

        {/* Uploaded documents */}
        {documents.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-slate-900 mb-4">Uploaded Documents</h4>
            
            <div className="space-y-3">
              {documents.map(document => (
                <div
                  key={document.id}
                  className="flex items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {/* File icon */}
                  <div className="mr-3">
                    {getFileIcon(document.file_type)}
                  </div>
                  
                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-slate-900 text-sm truncate">
                      {document.file_name}
                    </h5>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span>{document.file_type.toUpperCase()}</span>
                      <span>{formatFileSize(document.file_size)}</span>
                      {document.page_count > 1 && (
                        <span>{document.page_count} pages</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(document.file_url, '_blank')}
                      title="View document"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const linkElement = window.document.createElement('a');
                        linkElement.href = document.file_url;
                        linkElement.download = document.file_name;
                        linkElement.click();
                      }}
                      title="Download document"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(document)}
                      title="Delete document"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage instructions */}
        <div className="mt-6 p-3 bg-glacier-50 rounded-lg">
          <h4 className="font-medium text-slate-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            How it works
          </h4>
          <ul className="text-sm text-slate-700 space-y-1">
            <li>• Upload PDFs, images, Word docs, or Excel files</li>
            <li>• Documents will appear as objects on your design board</li>
            <li>• Add annotations and comments directly on documents</li>
            <li>• Collaborate with your team on document reviews</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}