import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get session
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer ID
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check portal settings
    const { data: settings } = await supabase
      .from('portal_settings')
      .select('allow_document_upload')
      .eq('customer_id', customer.id)
      .single()

    if (!settings?.allow_document_upload) {
      return NextResponse.json({ error: 'Document upload not allowed' }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string
    const notes = formData.get('notes') as string
    const orderId = formData.get('orderId') as string | null

    // Validate file
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2)
    const fileName = `${customer.id}/${timestamp}-${randomId}.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('client-documents')
      .getPublicUrl(fileName)

    // Check if document with same name already exists (for versioning)
    const { data: existingDoc } = await supabase
      .from('client_files')
      .select('version')
      .eq('customer_id', customer.id)
      .eq('file_name', file.name)
      .order('version', { ascending: false })
      .limit(1)

    const newVersion = existingDoc && existingDoc.length > 0 ? existingDoc[0].version + 1 : 1

    // Save to database
    const { data: document, error: dbError } = await supabase
      .from('client_files')
      .insert({
        customer_id: customer.id,
        order_id: orderId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl,
        storage_path: fileName,
        category: category || 'general',
        notes: notes || null,
        uploaded_by: session.user.id,
        version: newVersion,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      
      // Clean up storage if database insert fails
      await supabase.storage.from('client-documents').remove([fileName])
      
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
    }

    // Create version history entry if this is a new version
    if (newVersion > 1) {
      await supabase
        .from('document_versions')
        .insert({
          document_id: document.id,
          version_number: newVersion,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_at: new Date().toISOString(),
          uploaded_by: session.user.id,
          notes: notes || null
        })
    }

    // Log activity (optional - create activity_logs table if needed)
    try {
      await supabase
        .from('activity_logs')
        .insert({
          customer_id: customer.id,
          user_id: session.user.id,
          action: 'document_upload',
          details: {
            document_id: document.id,
            file_name: file.name,
            file_size: file.size,
            category: category
          },
          created_at: new Date().toISOString()
        })
    } catch (error) {
      // Activity logging is optional - don't fail the request
      console.warn('Failed to log activity:', error)
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        file_name: document.file_name,
        file_url: document.file_url,
        file_size: document.file_size,
        category: document.category,
        version: document.version,
        created_at: document.created_at
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}