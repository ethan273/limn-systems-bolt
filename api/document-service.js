// Document Service - Core business logic for document management

import { StorageFactory } from './storage-adapter';
import { createClient } from '@supabase/supabase-js';

class DocumentService {
  constructor(supabaseUrl, supabaseKey, storageType = 'supabase') {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.storage = StorageFactory.create(storageType, {
      client: this.supabase,
      bucket: 'documents',
    });
  }

  /**
   * Generate smart filename based on context
   */
  generateFileName(context, originalName) {
    const parts = ['LIMN'];
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    parts.push(date);

    // Add context identifiers
    if (context.customer_code) parts.push(context.customer_code);
    if (context.order_number) parts.push(`ORD${context.order_number}`);
    if (context.collection_code) parts.push(context.collection_code);
    if (context.item_sku) parts.push(context.item_sku);
    if (context.process_stage) parts.push(context.process_stage.toUpperCase());
    if (context.document_category) parts.push(context.document_category.toUpperCase());
    if (context.document_type) parts.push(context.document_type.toUpperCase());

    // Add version
    const version = context.version || 1;
    parts.push(`v${version.toString().padStart(2, '0')}`);

    // Add revision if applicable
    if (context.revision) parts.push(`r${context.revision}`);

    // Get file extension from original name
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    
    return parts.join('_') + ext;
  }

  /**
   * Generate storage path
   */
  generateStoragePath(context, fileName) {
    const pathParts = [];
    const date = new Date();
    
    // Organize by date for easy browsing
    pathParts.push(date.getFullYear().toString());
    pathParts.push((date.getMonth() + 1).toString().padStart(2, '0'));
    pathParts.push(date.getDate().toString().padStart(2, '0'));

    // Add category folder
    if (context.document_category) {
      pathParts.push(context.document_category);
    }

    // Add context folder
    if (context.customer_id) {
      pathParts.push(`customer_${context.customer_id}`);
    } else if (context.order_id) {
      pathParts.push(`order_${context.order_id}`);
    } else if (context.project_id) {
      pathParts.push(`project_${context.project_id}`);
    } else {
      pathParts.push('general');
    }

    // Add filename
    pathParts.push(fileName);

    return pathParts.join('/');
  }

  /**
   * Calculate file checksum for duplicate detection
   */
  async calculateChecksum(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Upload a document
   */
  async uploadDocument(file, context, metadata = {}) {
    try {
      // Validate file
      if (!file) throw new Error('No file provided');
      if (file.size > 50 * 1024 * 1024) throw new Error('File size exceeds 50MB limit');

      // Generate smart filename
      const fileName = this.generateFileName(context, file.name);
      const storagePath = this.generateStoragePath(context, fileName);

      // Calculate checksum for duplicate detection
      const checksum = await this.calculateChecksum(file);

      // Check for duplicates
      const { data: existingDocs } = await this.supabase
        .from('documents')
        .select('id, file_name')
        .eq('checksum', checksum)
        .eq('deleted_at', null);

      if (existingDocs && existingDocs.length > 0) {
        throw new Error(`Duplicate file detected: ${existingDocs[0].file_name}`);
      }

      // Upload to storage
      await this.storage.upload(file, storagePath, {
        mimeType: file.type,
      });

      // Get URL
      const publicUrl = await this.storage.getUrl(storagePath);

      // Create database record
      const { data: document, error } = await this.supabase
        .from('documents')
        .insert({
          file_name: fileName,
          display_name: metadata.display_name || file.name,
          file_type: file.name.substring(file.name.lastIndexOf('.') + 1),
          file_size_bytes: file.size,
          mime_type: file.type,
          checksum: checksum,
          storage_provider: this.storage.name,
          storage_path: storagePath,
          storage_bucket: 'documents',
          storage_url: publicUrl,
          document_category: context.document_category,
          document_type: context.document_type,
          customer_id: context.customer_id,
          order_id: context.order_id,
          collection_id: context.collection_id,
          item_id: context.item_id,
          designer_id: context.designer_id,
          manufacturer_id: context.manufacturer_id,
          project_id: context.project_id,
          prototype_id: context.prototype_id,
          process_stage: context.process_stage,
          status: metadata.status || 'draft',
          visibility: metadata.visibility || 'internal',
          tags: metadata.tags || [],
          notes: metadata.notes,
          metadata: metadata.custom || {},
          created_by: context.user_id,
          owner_id: context.user_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log access
      await this.logAccess(document.id, context.user_id, 'upload');

      // Start approval workflow if specified
      if (metadata.request_approval && metadata.approvers) {
        await this.requestApproval(document.id, metadata.approvers, context.user_id);
      }

      return {
        success: true,
        document: document,
      };
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  }

  /**
   * Create a document revision
   */
  async createRevision(parentDocumentId, file, changes, userId) {
    try {
      // Get parent document
      const { data: parentDoc, error: parentError } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', parentDocumentId)
        .single();

      if (parentError) throw parentError;

      // Create new version context
      const context = {
        ...parentDoc,
        version: parentDoc.version_number + 1,
        user_id: userId,
      };

      // Upload new version
      const uploadResult = await this.uploadDocument(file, context, {
        display_name: parentDoc.display_name + ' (Revision)',
        notes: changes.description,
      });

      // Update new document with parent reference
      const { error: updateError } = await this.supabase
        .from('documents')
        .update({
          parent_document_id: parentDocumentId,
          version_notes: changes.description,
        })
        .eq('id', uploadResult.document.id);

      if (updateError) throw updateError;

      // Create revision record
      const { data: revision, error: revisionError } = await this.supabase
        .from('document_revisions')
        .insert({
          document_id: uploadResult.document.id,
          revision_number: context.version,
          revision_type: changes.type || 'minor',
          changes_description: changes.description,
          changes_summary: changes.summary || {},
          cost_impact: changes.cost_impact,
          timeline_impact: changes.timeline_impact,
          requires_requote: changes.requires_requote || false,
          created_by: userId,
        })
        .select()
        .single();

      if (revisionError) throw revisionError;

      return {
        success: true,
        document: uploadResult.document,
        revision: revision,
      };
    } catch (error) {
      console.error('Create revision error:', error);
      throw error;
    }
  }

  /**
   * Request document approval
   */
  async requestApproval(documentId, approverIds, requesterId, message = null) {
    try {
      const approvalRequests = approverIds.map(approverId => ({
        document_id: documentId,
        approver_id: approverId,
        requested_by: requesterId,
        comments: message,
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      }));

      const { error } = await this.supabase
        .from('document_approvals')
        .insert(approvalRequests);

      if (error) throw error;

      // Update document status
      await this.supabase
        .from('documents')
        .update({ status: 'pending_review' })
        .eq('id', documentId);

      return { success: true };
    } catch (error) {
      console.error('Request approval error:', error);
      throw error;
    }
  }

  /**
   * Process approval decision
   */
  async processApproval(documentId, approverId, decision, comments = null) {
    try {
      const { error } = await this.supabase
        .from('document_approvals')
        .update({
          approval_status: decision,
          comments: comments,
          responded_at: new Date(),
        })
        .eq('document_id', documentId)
        .eq('approver_id', approverId)
        .eq('approval_status', 'pending');

      if (error) throw error;

      // Check if all approvals are complete
      const { data: pendingApprovals } = await this.supabase
        .from('document_approvals')
        .select('id')
        .eq('document_id', documentId)
        .eq('approval_status', 'pending');

      if (!pendingApprovals || pendingApprovals.length === 0) {
        // All approvals complete, update document status
        const { data: approvals } = await this.supabase
          .from('document_approvals')
          .select('approval_status')
          .eq('document_id', documentId);

        const hasRejection = approvals.some(a => a.approval_status === 'rejected');
        const newStatus = hasRejection ? 'rejected' : 'approved';

        await this.supabase
          .from('documents')
          .update({ status: newStatus })
          .eq('id', documentId);
      }

      return { success: true };
    } catch (error) {
      console.error('Process approval error:', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query, filters = {}) {
    try {
      let search = this.supabase
        .from('documents')
        .select('*')
        .is('deleted_at', null);

      // Apply filters
      if (filters.category) search = search.eq('document_category', filters.category);
      if (filters.type) search = search.eq('document_type', filters.type);
      if (filters.status) search = search.eq('status', filters.status);
      if (filters.customer_id) search = search.eq('customer_id', filters.customer_id);
      if (filters.order_id) search = search.eq('order_id', filters.order_id);
      if (filters.item_id) search = search.eq('item_id', filters.item_id);

      // Text search
      if (query) {
        search = search.or(`display_name.ilike.%${query}%,notes.ilike.%${query}%`);
      }

      // Only current versions by default
      if (filters.current_only !== false) {
        search = search.eq('is_current_version', true);
      }

      // Sort
      search = search.order('created_at', { ascending: false });

      // Pagination
      if (filters.limit) search = search.limit(filters.limit);
      if (filters.offset) search = search.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

      const { data, error, count } = await search;

      if (error) throw error;

      return {
        documents: data,
        total: count,
      };
    } catch (error) {
      console.error('Search documents error:', error);
      throw error;
    }
  }

  /**
   * Get document with revisions
   */
  async getDocument(documentId, includeRevisions = true) {
    try {
      const { data: document, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;

      if (includeRevisions) {
        const { data: revisions } = await this.supabase
          .from('document_revisions')
          .select('*')
          .eq('document_id', documentId)
          .order('revision_number', { ascending: false });

        document.revisions = revisions || [];
      }

      return document;
    } catch (error) {
      console.error('Get document error:', error);
      throw error;
    }
  }

  /**
   * Log document access
   */
  async logAccess(documentId, userId, accessType) {
    try {
      await this.supabase
        .from('document_access_log')
        .insert({
          document_id: documentId,
          accessed_by: userId,
          access_type: accessType,
        });
    } catch (error) {
      console.error('Log access error:', error);
      // Don't throw - logging shouldn't break the operation
    }
  }

  /**
   * Delete document (soft delete)
   */
  async deleteDocument(documentId, userId) {
    try {
      const { error } = await this.supabase
        .from('documents')
        .update({
          deleted_at: new Date(),
          deleted_by: userId,
          status: 'deleted',
        })
        .eq('id', documentId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Delete document error:', error);
      throw error;
    }
  }
}

export default DocumentService;