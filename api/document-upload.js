// Document Upload Service
// Handles file uploads to Supabase Storage

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export class DocumentUploadService {
  /**
   * Upload a document to Supabase Storage
   * @param {File} file - The file to upload
   * @param {Object} metadata - Document metadata
   * @returns {Promise<Object>} Upload result with document record
   */
  async uploadDocument(file, metadata = {}) {
    try {
      // Validate file
      const validation = await this.validateFile(file);
      if (!validation.is_valid) {
        throw new Error(validation.error_message);
      }

      // Generate file hash for duplicate detection
      const fileHash = await this.generateFileHash(file);
      
      // Check for duplicates
      const duplicate = await this.checkDuplicate(fileHash);
      if (duplicate) {
        return {
          success: false,
          error: 'Duplicate file detected',
          existing: duplicate
        };
      }

      // Generate storage path
      const storagePath = await this.generateStoragePath(
        file.name,
        metadata.category || validation.suggested_document_category
      );

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Create document record
      const documentRecord = await this.createDocumentRecord({
        file,
        storagePath,
        fileHash,
        metadata,
        validation
      });

      // Log access
      await this.logAccess(documentRecord.id, 'upload');

      return {
        success: true,
        document: documentRecord,
        url: this.getPublicUrl(storagePath)
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate file before upload
   */
  async validateFile(file) {
    const { data, error } = await supabase.rpc('validate_file_upload', {
      p_file_name: file.name,
      p_file_size_bytes: file.size
    });

    if (error) throw error;
    return data[0];
  }

  /**
   * Generate SHA-256 hash of file for duplicate detection
   */
  async generateFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if file already exists by hash
   */
  async checkDuplicate(fileHash) {
    const { data } = await supabase
      .from('documents')
      .select('id, file_name, created_at')
      .eq('checksum', fileHash)
      .single();
    
    return data;
  }

  /**
   * Generate storage path with smart naming
   */
  async generateStoragePath(fileName, category) {
    const { data: { user } } = await supabase.auth.getUser();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Clean filename
    const baseName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    
    return `${user.id}/${year}/${month}/${day}/${category}/${timestamp}_${baseName}`;
  }

  /**
   * Create document record in database
   */
  async createDocumentRecord(params) {
    const { file, storagePath, fileHash, metadata, validation } = params;
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('documents')
      .insert({
        file_name: file.name,
        display_name: metadata.display_name || file.name,
        file_type: file.name.split('.').pop().toLowerCase(),
        file_size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        checksum: fileHash,
        storage_provider: 'supabase',
        storage_path: storagePath,
        storage_bucket: 'documents',
        document_category: metadata.category || validation.suggested_document_category,
        document_type: metadata.type || 'general',
        file_category: validation.file_category,
        
        // Relationships
        customer_id: metadata.customer_id || null,
        order_id: metadata.order_id || null,
        collection_id: metadata.collection_id || null,
        item_id: metadata.item_id || null,
        designer_id: metadata.designer_id || null,
        manufacturer_id: metadata.manufacturer_id || null,
        project_id: metadata.project_id || null,
        
        // Metadata
        process_stage: metadata.process_stage || 'design',
        visibility: metadata.visibility || 'internal',
        status: metadata.status || 'draft',
        tags: metadata.tags || [],
        notes: metadata.notes || null,
        metadata: metadata.custom || {},
        
        // Audit
        created_by: user.id,
        owner_id: metadata.owner_id || user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Log document access
   */
  async logAccess(documentId, accessType) {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('document_access_log')
      .insert({
        document_id: documentId,
        accessed_by: user.id,
        access_type: accessType,
        access_method: 'web',
        accessed_at: new Date().toISOString()
      });
  }

  /**
   * Get public URL for document
   */
  getPublicUrl(storagePath) {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);
    
    return data.publicUrl;
  }

  /**
   * Get signed URL for private document
   */
  async getSignedUrl(storagePath, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files, metadata = {}) {
    const results = [];
    
    for (const file of files) {
      const result = await this.uploadDocument(file, metadata);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId, updates) {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Create new document version
   */
  async createVersion(originalDocumentId, newFile, versionNotes) {
    // Get original document
    const { data: original } = await supabase
      .from('documents')
      .select('*')
      .eq('id', originalDocumentId)
      .single();
    
    if (!original) throw new Error('Original document not found');
    
    // Upload new version
    const result = await this.uploadDocument(newFile, {
      ...original,
      parent_document_id: originalDocumentId,
      version_notes: versionNotes
    });
    
    return result;
  }
}

export default DocumentUploadService;