// React Hook for Document Management
// Custom hook for document operations in React components

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/lib/supabase-client';

export function useDocuments(filters = {}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          customers!customer_id(name, code),
          orders!order_id(order_number),
          collections!collection_id(name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.category) {
        query = query.eq('document_category', filters.category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters.search) {
        query = query.or(`
          display_name.ilike.%${filters.search}%,
          file_name.ilike.%${filters.search}%
        `);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setDocuments(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Upload document
  const uploadDocument = async (file, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(metadata).forEach(key => {
      if (metadata[key] !== undefined && metadata[key] !== null) {
        formData.append(key, metadata[key]);
      }
    });

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Refresh documents list
        await fetchDocuments();
        return result;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  };

  // Delete document
  const deleteDocument = async (documentId) => {
    try {
      const { error } = await supabase.rpc('soft_delete_document', {
        doc_id: documentId,
        user_id: (await supabase.auth.getUser()).data.user.id,
      });

      if (error) throw error;

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      return { success: true };
    } catch (err) {
      console.error('Delete error:', err);
      throw err;
    }
  };

  // Update document
  const updateDocument = async (documentId, updates) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setDocuments(prev => 
        prev.map(doc => doc.id === documentId ? data : doc)
      );

      return data;
    } catch (err) {
      console.error('Update error:', err);
      throw err;
    }
  };

  // Share document
  const shareDocument = async (documentId, userIds) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({ shared_with: userIds })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setDocuments(prev => 
        prev.map(doc => doc.id === documentId ? data : doc)
      );

      return data;
    } catch (err) {
      console.error('Share error:', err);
      throw err;
    }
  };

  // Get signed URL
  const getSignedUrl = async (documentId) => {
    try {
      const document = documents.find(d => d.id === documentId);
      if (!document || !document.storage_path) {
        throw new Error('Document not found or has no file');
      }

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.storage_path, 3600);

      if (error) throw error;

      return data.signedUrl;
    } catch (err) {
      console.error('Signed URL error:', err);
      throw err;
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/documents/stats');
      const data = await response.json();
      setStats(data);
      return data;
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('documents_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        (payload) => {
          console.log('Document change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setDocuments(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDocuments(prev => 
              prev.map(doc => doc.id === payload.new.id ? payload.new : doc)
            );
          } else if (payload.eventType === 'DELETE') {
            setDocuments(prev => 
              prev.filter(doc => doc.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    documents,
    loading,
    error,
    stats,
    uploadDocument,
    deleteDocument,
    updateDocument,
    shareDocument,
    getSignedUrl,
    fetchStats,
    refresh: fetchDocuments,
  };
}

export default useDocuments;