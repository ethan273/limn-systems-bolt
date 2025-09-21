import { NextRequest, NextResponse } from 'next/server'
import { getQuickBooksClient, QUICKBOOKS_SCOPES } from '@/lib/quickbooks/client'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const qbClient = getQuickBooksClient()

    // Generate state parameter for security
    const state = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // Store state in database for verification during callback
    const { error: stateError } = await supabase
      .from('quickbooks_oauth_states')
      .upsert({
        user_id: userId,
        state: state,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      })

    if (stateError) {
      console.error('Error storing OAuth state:', stateError)
      return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 })
    }

    // Generate authorization URL
    const authUri = qbClient.authorizeUri({
      scope: QUICKBOOKS_SCOPES,
      state: state
    })

    return NextResponse.json({
      authUrl: authUri,
      state: state
    })

  } catch (error) {
    console.error('QuickBooks connect error:', error)
    
    // Check if it's a configuration error
    if (error instanceof Error && error.message.includes('QuickBooks credentials not configured')) {
      return NextResponse.json(
        { 
          error: 'QuickBooks integration not configured', 
          message: 'QuickBooks credentials are not set up. Contact your administrator to configure QuickBooks integration.',
          configRequired: true
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate QuickBooks connection URL' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { disconnect } = body

    if (disconnect) {
      // Disconnect QuickBooks integration
      const { error: deleteError } = await supabase
        .from('quickbooks_connections')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Error disconnecting QuickBooks:', deleteError)
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'QuickBooks disconnected successfully' })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  } catch (error) {
    console.error('QuickBooks connect POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}