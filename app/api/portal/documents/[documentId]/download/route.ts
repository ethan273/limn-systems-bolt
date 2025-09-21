import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params
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

    // Get document and verify ownership
    const { data: document, error: docError } = await supabase
      .from('client_files')
      .select('*')
      .eq('id', documentId)
      .eq('customer_id', customer.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Log the download
    try {
      await supabase
        .from('document_downloads')
        .insert({
          document_id: documentId,
          downloaded_by: session.user.id,
          downloaded_at: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
        })
    } catch (error) {
      // Download logging is optional - don't fail the request
      console.warn('Failed to log download:', error)
    }

    // Log activity
    try {
      await supabase
        .from('activity_logs')
        .insert({
          customer_id: customer.id,
          user_id: session.user.id,
          action: 'document_download',
          details: {
            document_id: documentId,
            file_name: document.file_name
          },
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.warn('Failed to log activity:', error)
    }

    // Return file URL for client-side download
    // In production, you might want to generate a signed URL for better security
    return NextResponse.json({
      success: true,
      download_url: document.file_url,
      file_name: document.file_name,
      content_type: document.file_type
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}