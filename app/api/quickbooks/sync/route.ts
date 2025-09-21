import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { QuickBooksService } from '@/lib/quickbooks/service'

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
    const { syncType = 'full', entities = [] } = body

    // Check if QuickBooks is connected
    const { data: connection, error: connectionError } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ 
        error: 'QuickBooks not connected. Please connect your account first.' 
      }, { status: 400 })
    }

    // Check if token needs refresh
    const tokenExpiresAt = new Date(connection.token_expires_at)
    const now = new Date()
    const bufferTime = 5 * 60 * 1000 // 5 minutes buffer

    if (tokenExpiresAt.getTime() - bufferTime <= now.getTime()) {
      return NextResponse.json({ 
        error: 'Access token expired. Please reconnect your QuickBooks account.' 
      }, { status: 401 })
    }

    const qbService = await QuickBooksService.forUser(userId)
    let syncResults = []

    try {
      // Log sync initiation
      console.log(`Initiated ${syncType} sync for user ${userId}`)

      if (syncType === 'full') {
        // Full synchronization
        const results = await Promise.allSettled([
          qbService.syncCustomers(),
          qbService.syncItems(),
          qbService.syncAccounts(),
          qbService.syncInvoices(),
          qbService.syncPayments()
        ])

        syncResults = results.map((result, index) => {
          const entityTypes = ['customers', 'items', 'accounts', 'invoices', 'payments']
          return {
            entity: entityTypes[index],
            status: result.status,
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null
          }
        })

      } else if (syncType === 'selective' && entities.length > 0) {
        // Selective synchronization
        for (const entity of entities) {
          try {
            let result
            switch (entity.toLowerCase()) {
              case 'customers':
                result = await qbService.syncCustomers()
                break
              case 'items':
                result = await qbService.syncItems()
                break
              case 'accounts':
                result = await qbService.syncAccounts()
                break
              case 'invoices':
                result = await qbService.syncInvoices()
                break
              case 'payments':
                result = await qbService.syncPayments()
                break
              default:
                throw new Error(`Unsupported entity type: ${entity}`)
            }
            
            syncResults.push({
              entity,
              status: 'fulfilled',
              data: result,
              error: null
            })
          } catch (error) {
            syncResults.push({
              entity,
              status: 'rejected',
              data: null,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

      } else {
        return NextResponse.json({ 
          error: 'Invalid sync configuration' 
        }, { status: 400 })
      }

      // Update connection's last sync time
      await supabase
        .from('quickbooks_connections')
        .update({ 
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      // Log sync completion
      const successCount = syncResults.filter(r => r.status === 'fulfilled').length
      const errorCount = syncResults.filter(r => r.status === 'rejected').length

      console.log(`Sync completed: ${successCount} successful, ${errorCount} failed`)

      return NextResponse.json({
        success: true,
        message: `Sync completed: ${successCount} successful, ${errorCount} failed`,
        results: syncResults,
        summary: {
          total: syncResults.length,
          successful: successCount,
          failed: errorCount
        }
      })

    } catch (error) {
      console.error('Sync error:', error)

      return NextResponse.json(
        { error: 'Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: 'Failed to process sync request' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get sync statistics
    const { data: connection } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .not('quickbooks_id', 'is', null)

    return NextResponse.json({
      lastSync: connection?.updated_at || null,
      connected: !!connection && connection.is_active,
      connection: connection ? {
        company_name: connection.company_name,
        company_id: connection.company_id,
        realm_id: connection.realm_id,
        connected_at: connection.created_at
      } : null,
      syncLogs: [],
      statistics: {
        customers: customers?.length || 0,
        invoices: 0,
        payments: 0,
        items: 0
      }
    })

  } catch (error) {
    console.error('Sync status API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}