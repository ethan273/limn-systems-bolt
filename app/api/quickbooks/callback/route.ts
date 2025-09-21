import { NextResponse } from 'next/server'
import { getQuickBooksClient, QUICKBOOKS_SCOPES } from '@/lib/quickbooks/client'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const realmId = searchParams.get('realmId')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('QuickBooks OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?qb_error=${encodeURIComponent(error)}`
      )
    }

    // Validate required parameters
    if (!code || !state || !realmId) {
      console.error('Missing required OAuth parameters:', { code: !!code, state: !!state, realmId: !!realmId })
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?qb_error=invalid_callback`
      )
    }

    // Verify state parameter
    const { data: stateData, error: stateError } = await supabase
      .from('quickbooks_oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .single()

    if (stateError || !stateData) {
      console.error('Invalid or expired OAuth state:', stateError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?qb_error=invalid_state`
      )
    }

    // Check if state has expired
    if (new Date() > new Date(stateData.expires_at)) {
      await supabase
        .from('quickbooks_oauth_states')
        .delete()
        .eq('state', state)
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?qb_error=expired_state`
      )
    }

    const userId = stateData.user_id
    const qbClient = getQuickBooksClient()

    // Exchange authorization code for tokens
    let tokenResponse
    try {
      tokenResponse = await qbClient.createToken(request.url)
      console.log('Token response received:', tokenResponse ? 'Success' : 'Failed')
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?qb_error=token_exchange_failed`
      )
    }
    
    if (!tokenResponse || !tokenResponse.getToken() || !tokenResponse.getToken().access_token) {
      console.error('Failed to obtain access token from QuickBooks')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?qb_error=token_exchange_failed`
      )
    }

    const token = tokenResponse.getToken()

    // Skip company info fetch for now - we can get it later
    const companyInfo = { Name: `Company ${realmId}` }

    // Store the connection in the database
    const connectionData = {
      user_id: userId,
      company_id: realmId,
      company_name: companyInfo?.Name || 'Unknown Company',
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expires_at: new Date(Date.now() + (token.expires_in * 1000)).toISOString(),
      realm_id: realmId,
      scope: QUICKBOOKS_SCOPES.join(','),
      is_active: true
    }

    const { error: connectionError } = await supabase
      .from('quickbooks_connections')
      .upsert(connectionData, { 
        onConflict: 'user_id,company_id'
      })

    if (connectionError) {
      console.error('Error storing QuickBooks connection:', connectionError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?qb_error=connection_storage_failed`
      )
    }

    // Clean up the state record
    await supabase
      .from('quickbooks_oauth_states')
      .delete()
      .eq('state', state)

    console.log(`QuickBooks connected successfully for user ${userId}, company: ${companyInfo?.Name || realmId}`)

    // Redirect to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?qb_success=connected`
    )

  } catch (error) {
    console.error('QuickBooks callback error:', error)
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?qb_error=callback_failed`
    )
  }
}