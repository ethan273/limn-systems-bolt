import { useState, useEffect } from 'react';

interface Document {
  id: string
  name: string
  display_name?: string
  file_path: string
  file_size: number
  mime_type: string
  checksum: string
  category: string
  entity_type?: string
  entity_id?: string
  description?: string
  tags: string[]
  status: string
  created_by: string
  created_by_name: string
  public_url: string
  metadata: Record<string, unknown>
  is_archived: boolean
  created_at: string
  updated_at: string
  deleted_at?: string
}

interface DocumentFilters {
  search?: string
  category?: string
  status?: string
  entity_type?: string
  entity_id?: string
  created_by?: string
  date_from?: string
  date_to?: string
  file_type?: string
  min_size?: string
  max_size?: string
  is_archived?: string
  limit?: number
  offset?: number
}

export function useDocuments(filters: DocumentFilters = {}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasInitialized) return;
    
    console.log('useDocuments: Initializing...');
    setHasInitialized(true);
    
    const fetchData = async () => {
      try {
        // Build query parameters from filters
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
        
        const url = `/api/documents/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }
        
        const data = await response.json();
        setDocuments(data.data || []);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch documents');
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [hasInitialized, filters]);

  const refreshDocuments = async () => {
    setLoading(true);
    try {
      // Build query parameters from filters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      
      const url = `/api/documents/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const data = await response.json();
      setDocuments(data.data || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, metadata: Record<string, unknown> = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    const result = await response.json();
    await refreshDocuments();
    return result.document;
  };

  const downloadDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/download/${documentId}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `document_${documentId}`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      console.error('Download error:', err);
      throw err;
    }
  };

  const deleteDocument = async (documentId: string) => {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Delete failed');
    }

    await refreshDocuments();
    return response.json();
  };

  const shareDocument = async (documentId: string) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/api/documents/download/${documentId}`;
    return shareUrl;
  };

  return {
    documents,
    loading,
    error,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    shareDocument,
    refreshDocuments,
  };
}