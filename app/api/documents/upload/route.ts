import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
// import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadataStr = formData.get('metadata') as string
    const metadata = metadataStr ? JSON.parse(metadataStr) : {}

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Generate checksum for duplicate detection
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const checksum = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex')

    // Check for duplicates
    const { data: existing } = await supabase
      .from('documents')
      .select('id, name')
      .eq('checksum', checksum)
      .is('deleted_at', null)
      .single()

    if (existing) {
      return NextResponse.json({
        error: 'Duplicate file detected',
        message: `This file already exists as "${existing.name}"`,
        existingId: existing.id 
      }, { status: 409 })
    }

    // Generate organized file path
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const category = metadata.category || 'general'
    const fileExt = path.extname(file.name)
    const baseName = path.basename(file.name, fileExt)
    const fileName = `${timestamp}_${category}_${baseName}${fileExt}`.toLowerCase()

    const date = new Date()
    const filePath = `${user.id}/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${category}/${fileName}`

    // Upload file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file', message: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    // Create document record in database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        name: file.name,
        display_name: metadata.display_name || baseName,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        checksum,
        category: metadata.category || 'general',
        entity_type: metadata.entity_type,
        entity_id: metadata.entity_id,
        description: metadata.description,
        tags: metadata.tags || [],
        status: 'pending',
        created_by: user.id,
        created_by_name: user.email,
        public_url: publicUrl,
        metadata: {
          original_name: file.name,
          upload_date: new Date().toISOString(),
          source: 'web_upload'
        }
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('documents').remove([filePath])
      return NextResponse.json({ error: 'Failed to save document record', message: dbError.message }, { status: 500 })
    }

    // Log upload
    await supabase
      .from('document_access_log')
      .insert({
        document_id: document.id,
        user_id: user.id,
        action: 'upload',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      document,
      message: 'File uploaded successfully'
    })

  } catch (error: unknown) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload document', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}