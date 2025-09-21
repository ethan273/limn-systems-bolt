// Extended Document Service with Permission Checks
// This extends the base document service with permission-aware methods

import DocumentService from './document-service';

class DocumentServiceExtended extends DocumentService {
  constructor(supabaseUrl, supabaseKey, storageType = 'supabase') {
    super(supabaseUrl, supabaseKey, storageType);
  }

  /**
   * Check if user has access to document system
   */
  async checkAccess(userId = null) {
    const { data, error } = await this.supabase.rpc('can_access_documents', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Error checking access:', error);
      return false;
    }
    
    return data === true;
  }

  /**
   * Check if user can download documents
   */
  async checkDownloadPermission(userId = null) {
    const { data, error } = await this.supabase.rpc('can_download_documents', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Error checking download permission:', error);
      return false;
    }
    
    return data === true;
  }

  /**
   * Get comprehensive user permissions
   */
  async getUserPermissions(userId = null) {
    const { data, error } = await this.supabase.rpc('get_user_document_permissions', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Error getting permissions:', error);
      // Return default permissions on error
      return {
        can_access: true,
        can_download: true,
        can_upload: true,
        can_delete: false,
        can_approve: false,
        can_share: false,
        max_upload_size_mb: 50,
        storage_quota_gb: null,
        storage_used_gb: 0,
        is_expired: false
      };
    }
    
    return data[0]; // RPC returns array
  }

  /**
   * Upload document with permission check
   */
  async uploadDocumentWithPermissionCheck(file, context, metadata = {}) {
    // Check if user can upload
    const permissions = await this.getUserPermissions(context.user_id);
    
    if (!permissions.can_access) {
      throw new Error('You do not have access to the document system');
    }
    
    if (!permissions.can_upload) {
      throw new Error('You do not have permission to upload documents');
    }
    
    // Check file size against limit
    const maxSize = permissions.max_upload_size_mb * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File size exceeds your limit of ${permissions.max_upload_size_mb}MB`);
    }
    
    // Check storage quota if set
    if (permissions.storage_quota_gb) {
      const quotaBytes = permissions.storage_quota_gb * 1024 * 1024 * 1024;
      const usedBytes = permissions.storage_used_gb * 1024 * 1024 * 1024;
      const remainingBytes = quotaBytes - usedBytes;
      
      if (file.size > remainingBytes) {
        throw new Error('Upload would exceed your storage quota');
      }
    }
    
    // Proceed with upload
    return await this.uploadDocument(file, context, metadata);
  }

  /**
   * Get document URL based on permissions
   */
  async getDocumentUrlWithPermissions(documentId, userId) {
    // Check permissions
    const canDownload = await this.checkDownloadPermission(userId);
    
    if (!canDownload) {
      // Return view-only URL
      return {
        url: `/documents/view/${documentId}`,
        type: 'view_only',
        canDownload: false
      };
    }
    
    // Get document details
    const { data: document, error } = await this.supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();
    
    if (error) throw error;
    
    // Generate signed URL for download
    const { data: urlData, error: urlError } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(document.storage_path, 3600); // 1 hour expiry
    
    if (urlError) throw urlError;
    
    return {
      url: urlData.signedUrl,
      type: 'download',
      canDownload: true
    };
  }

  /**
   * Delete document with permission check
   */
  async deleteDocumentWithPermissionCheck(documentId, userId) {
    // Check permissions
    const permissions = await this.getUserPermissions(userId);
    
    if (!permissions.can_delete) {
      throw new Error('You do not have permission to delete documents');
    }
    
    // Check if user owns the document or is admin
    const { data: document, error } = await this.supabase
      .from('documents')
      .select('created_by, owner_id')
      .eq('id', documentId)
      .single();
    
    if (error) throw error;
    
    const isOwner = document.created_by === userId || document.owner_id === userId;
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    
    if (!isOwner && !isAdmin) {
      throw new Error('You can only delete your own documents');
    }
    
    // Proceed with soft delete
    return await this.deleteDocument(documentId, userId);
  }

  /**
   * Search documents with permission filtering
   */
  async searchDocumentsWithPermissions(query, filters = {}, userId) {
    // Check if user has access
    const hasAccess = await this.checkAccess(userId);
    
    if (!hasAccess) {
      return {
        documents: [],
        total: 0,
        message: 'You do not have access to the document system'
      };
    }
    
    // Proceed with normal search (RLS will handle filtering)
    return await this.searchDocuments(query, filters);
  }

  /**
   * Process approval with permission check
   */
  async processApprovalWithPermissionCheck(documentId, userId, decision, comments = null) {
    // Check if user can approve
    const permissions = await this.getUserPermissions(userId);
    
    if (!permissions.can_approve) {
      // Check if user is specifically assigned as approver
      const { data: approval } = await this.supabase
        .from('document_approvals')
        .select('id')
        .eq('document_id', documentId)
        .eq('approver_id', userId)
        .eq('approval_status', 'pending')
        .single();
      
      if (!approval) {
        throw new Error('You do not have permission to approve this document');
      }
    }
    
    // Proceed with approval
    return await this.processApproval(documentId, userId, decision, comments);
  }

  /**
   * Share document with permission check
   */
  async shareDocumentWithPermissionCheck(documentId, shareWithUserIds, userId) {
    // Check if user can share
    const permissions = await this.getUserPermissions(userId);
    
    if (!permissions.can_share) {
      throw new Error('You do not have permission to share documents');
    }
    
    // Update document's shared_with array
    const { data: document } = await this.supabase
      .from('documents')
      .select('shared_with')
      .eq('id', documentId)
      .single();
    
    const currentShared = document?.shared_with || [];
    const newShared = [...new Set([...currentShared, ...shareWithUserIds])];
    
    const { error } = await this.supabase
      .from('documents')
      .update({ shared_with: newShared })
      .eq('id', documentId);
    
    if (error) throw error;
    
    // Log the share action
    await this.logAccess(documentId, userId, 'share');
    
    return { success: true, shared_with: newShared };
  }

  /**
   * Get user's storage usage
   */
  async getStorageUsage(userId) {
    const permissions = await this.getUserPermissions(userId);
    
    return {
      used_gb: permissions.storage_used_gb || 0,
      quota_gb: permissions.storage_quota_gb,
      used_percentage: permissions.storage_quota_gb 
        ? (permissions.storage_used_gb / permissions.storage_quota_gb) * 100 
        : 0,
      has_quota: !!permissions.storage_quota_gb
    };
  }
}

export default DocumentServiceExtended;