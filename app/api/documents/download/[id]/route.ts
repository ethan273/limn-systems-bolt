import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (downloadError) {
      console.error('Download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download file', message: downloadError.message },
        { status: 500 }
      )
    }

    // Log download
    await supabase
      .from('document_access_log')
      .insert({
        document_id: id,
        user_id: user.id,
        action: 'download',
        metadata: { 
          document_name: document.name,
          file_size: document.file_size 
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent')
      })

    const buffer = Buffer.from(await fileData.arrayBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': document.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.name}"`,
        'Content-Length': buffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Download handler error:', error)
    return NextResponse.json(
      { error: 'Download failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}