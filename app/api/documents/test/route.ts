/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Testing database connection...')
    
    // Try to query the documents table
    const { error: documentsError } = await supabase
      .from('documents')
      .select('count')
      .limit(1)

    let documentsTableStatus = 'exists'
    if (documentsError) {
      console.log('Documents table error:', documentsError)
      documentsTableStatus = documentsError.message
    }

    // Test storage connection
    console.log('Testing storage connection...')
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    let storageStatus = 'connected'
    let documentsBucket = false
    
    if (bucketsError) {
      storageStatus = bucketsError.message
    } else {
      documentsBucket = buckets.some((bucket: any) => bucket.name === 'documents')
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user: user.email,
      database: {
        connected: !documentsError || documentsError.code === 'PGRST116', // PGRST116 = table not found, but connection works
        documentsTable: documentsTableStatus
      },
      storage: {
        connected: !bucketsError,
        status: storageStatus,
        documentsBucket
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        serviceKey: process.env.SUPABASE_SERVICE_KEY ? 'configured' : 'missing'
      }
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: 'Test failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}