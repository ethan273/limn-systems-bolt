// Document Management API Routes
// Next.js API routes for document operations

import { createClient } from '@supabase/supabase-js';
import DocumentUploadService from '../document-upload';
import formidable from 'formidable';
import fs from 'fs/promises';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const uploadService = new DocumentUploadService();

// Configure formidable for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST /api/documents/upload
 * Upload a new document
 */
export async function uploadDocument(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Read file buffer
    const fileBuffer = await fs.readFile(file.filepath);
    const fileBlob = new Blob([fileBuffer], { type: file.mimetype });
    fileBlob.name = file.originalFilename;
    fileBlob.size = file.size;

    // Upload document
    const result = await uploadService.uploadDocument(fileBlob, {
      display_name: fields.display_name?.[0],
      category: fields.category?.[0],
      type: fields.type?.[0],
      customer_id: fields.customer_id?.[0],
      order_id: fields.order_id?.[0],
      tags: fields.tags?.[0]?.split(','),
      notes: fields.notes?.[0],
      visibility: fields.visibility?.[0] || 'internal',
    });

    // Clean up temp file
    await fs.unlink(file.filepath);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/documents
 * List documents with filters
 */
export async function listDocuments(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      category,
      status,
      customer_id,
      order_id,
      search,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = supabase
      .from('documents')
      .select(`
        *,
        customers!customer_id(name, code),
        orders!order_id(order_number),
        collections!collection_id(name)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (category) query = query.eq('document_category', category);
    if (status) query = query.eq('status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (order_id) query = query.eq('order_id', order_id);
    
    if (search) {
      query = query.or(`
        display_name.ilike.%${search}%,
        file_name.ilike.%${search}%,
        notes.ilike.%${search}%
      `);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.status(200).json({
      documents: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/documents/:id
 * Get single document details
 */
export async function getDocument(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_revisions(*),
        document_approvals(*),
        document_access_log(
          accessed_by,
          access_type,
          accessed_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Log access
    await uploadService.logAccess(id, 'view');

    // Get signed URL if needed
    if (data.storage_path) {
      data.download_url = await uploadService.getSignedUrl(data.storage_path);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Get error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/documents/:id
 * Update document metadata
 */
export async function updateDocument(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const updates = req.body;

    const { data, error } = await supabase
      .from('documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/documents/:id
 * Soft delete a document
 */
export async function deleteDocument(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.rpc('soft_delete_document', {
      doc_id: id,
      user_id: user.id,
    });

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/documents/:id/approve
 * Approve or reject a document
 */
export async function approveDocument(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { decision, comments, conditions } = req.body;

    const { data, error } = await supabase.rpc('process_approval_decision', {
      p_document_id: id,
      p_decision: decision,
      p_comments: comments,
      p_conditions: conditions,
    });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/documents/:id/share
 * Share document with users
 */
export async function shareDocument(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { user_ids } = req.body;

    // Update shared_with array
    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        shared_with: user_ids,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Send notifications (implement based on your notification system)
    // await notificationService.sendShareNotifications(user_ids, document, message);

    res.status(200).json({ success: true, document });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/documents/stats
 * Get document statistics
 */
export async function getDocumentStats(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get file type statistics
    const { data: fileTypes, error: ftError } = await supabase
      .from('v_document_file_types')
      .select('*');

    if (ftError) throw ftError;

    // Get category counts
    const { data: categories, error: catError } = await supabase
      .from('documents')
      .select('document_category')
      .is('deleted_at', null);

    if (catError) throw catError;

    const categoryCounts = categories.reduce((acc, doc) => {
      acc[doc.document_category] = (acc[doc.document_category] || 0) + 1;
      return acc;
    }, {});

    // Get user storage usage
    const { data: { user } } = await supabase.auth.getUser();
    const { data: permissions } = await supabase
      .from('user_document_permissions')
      .select('storage_used_gb, storage_quota_gb')
      .eq('user_id', user.id)
      .single();

    res.status(200).json({
      fileTypes,
      categoryCounts,
      storage: permissions || { storage_used_gb: 0, storage_quota_gb: null },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Export all route handlers
const documentRoutes = {
  uploadDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  approveDocument,
  shareDocument,
  getDocumentStats,
};

export default documentRoutes;