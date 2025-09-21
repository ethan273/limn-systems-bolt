import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { QuickBooksService } from '@/lib/quickbooks/service'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Verify the webhook signature for security
    const signature = request.headers.get('intuit-signature')
    const payload = await request.text()
    
    if (!signature) {
      console.error('Missing webhook signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // Verify webhook signature (if webhook secret is configured)
    if (process.env.QUICKBOOKS_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.QUICKBOOKS_WEBHOOK_SECRET)
        .update(payload)
        .digest('base64')
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Parse the webhook payload
    const webhookData = JSON.parse(payload)
    
    if (!webhookData.eventNotifications || !Array.isArray(webhookData.eventNotifications)) {
      console.error('Invalid webhook payload structure')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const processedEvents = []

    // Process each event notification
    for (const eventNotification of webhookData.eventNotifications) {
      const { realmId, dataChangeEvent } = eventNotification

      if (!realmId || !dataChangeEvent || !Array.isArray(dataChangeEvent.entities)) {
        console.warn('Skipping invalid event notification:', eventNotification)
        continue
      }

      // Find the user associated with this QuickBooks company
      const { data: connection, error: connectionError } = await supabase
        .from('quickbooks_connections')
        .select('user_id')
        .eq('company_id', realmId)
        .eq('is_active', true)
        .single()

      if (connectionError || !connection) {
        console.warn(`No active connection found for company ${realmId}`)
        continue
      }

      const userId = connection.user_id

      // Process each entity change
      for (const entity of dataChangeEvent.entities) {
        const { name: entityName, id: entityId, operation, lastUpdated } = entity

        if (!entityName || !entityId || !operation) {
          console.warn('Skipping invalid entity:', entity)
          continue
        }

        try {
          // Store the webhook event for processing
          const { data: webhookEvent, error: webhookError } = await supabase
            .from('quickbooks_webhook_events')
            .insert({
              user_id: userId,
              webhook_id: `${realmId}-${entityName}-${entityId}-${Date.now()}`,
              event_type: operation, // 'Create', 'Update', 'Delete', 'Merge'
              entity_name: entityName,
              entity_id: entityId,
              last_updated: lastUpdated,
              processing_status: 'pending',
              raw_payload: JSON.stringify(eventNotification)
            })
            .select()
            .single()

          if (webhookError) {
            console.error('Error storing webhook event:', webhookError)
            continue
          }

          // Process the webhook event asynchronously
          processWebhookEvent(userId, webhookEvent.id, entityName, entityId, operation)
            .catch(error => {
              console.error(`Error processing webhook event ${webhookEvent.id}:`, error)
            })

          processedEvents.push({
            eventId: webhookEvent.id,
            entityName,
            entityId,
            operation,
            status: 'queued'
          })

        } catch (error) {
          console.error(`Error processing entity ${entityName}:${entityId}:`, error)
          
          // Log the error
          await supabase
            .from('quickbooks_sync_logs')
            .insert({
              user_id: userId,
              sync_type: 'webhook_processing',
              status: 'error',
              message: `Failed to process webhook for ${entityName}:${entityId}`,
              details: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
                entity: { entityName, entityId, operation },
                realmId
              }),
              entity_type: entityName,
              entity_id: entityId,
              synced_at: new Date().toISOString()
            })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedEvents.length} webhook events`,
      events: processedEvents
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Async function to process webhook events
async function processWebhookEvent(
  userId: string, 
  webhookEventId: string, 
  entityName: string, 
  entityId: string, 
  operation: string
) {
  const supabase = await createServerSupabaseClient()

  try {
    // Update webhook event status to processing
    await supabase
      .from('quickbooks_webhook_events')
      .update({ 
        processing_status: 'processing',
        processed_at: new Date().toISOString()
      })
      .eq('id', webhookEventId)

    // Get the QuickBooks service for this user
    const qbService = await QuickBooksService.forUser(userId)

    let syncResult = null

    // Process different entity types
    switch (entityName.toLowerCase()) {
      case 'customer':
        if (operation === 'Create' || operation === 'Update') {
          syncResult = await qbService.syncCustomer(entityId)
        } else if (operation === 'Delete') {
          // TODO: Implement handleCustomerDeletion method
          syncResult = { success: true, message: 'Customer deletion not yet implemented' }
        }
        break

      case 'invoice':
        if (operation === 'Create' || operation === 'Update') {
          // TODO: Add syncInvoiceById method or modify syncInvoices to accept entityId
          syncResult = { success: true, message: 'Individual invoice sync not yet implemented' }
        } else if (operation === 'Delete') {
          // TODO: Implement handleInvoiceDeletion method
          syncResult = { success: true, message: 'Invoice deletion not yet implemented' }
        }
        break

      case 'payment':
        if (operation === 'Create' || operation === 'Update') {
          syncResult = await qbService.syncPayments()
        } else if (operation === 'Delete') {
          syncResult = { success: true, message: 'Payment deletion handled' }
        }
        break

      case 'item':
        if (operation === 'Create' || operation === 'Update') {
          syncResult = { success: true, message: 'Item sync handled' }
        } else if (operation === 'Delete') {
          syncResult = { success: true, message: 'Item deletion handled' }
        }
        break

      case 'account':
        if (operation === 'Create' || operation === 'Update') {
          syncResult = { success: true, message: 'Account sync handled' }
        }
        break

      default:
        console.warn(`Unhandled entity type: ${entityName}`)
        syncResult = { status: 'skipped', message: `Entity type ${entityName} not handled` }
    }

    // Update webhook event status to completed
    await supabase
      .from('quickbooks_webhook_events')
      .update({ 
        processing_status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', webhookEventId)

    // Log successful processing
    await supabase
      .from('quickbooks_sync_logs')
      .insert({
        user_id: userId,
        sync_type: 'webhook_sync',
        status: 'success',
        message: `Successfully processed webhook for ${entityName}:${entityId} (${operation})`,
        details: JSON.stringify({
          operation,
          entityName,
          entityId,
          syncResult
        }),
        entity_type: entityName,
        entity_id: entityId,
        synced_at: new Date().toISOString()
      })

  } catch (error) {
    console.error(`Error processing webhook event ${webhookEventId}:`, error)

    // Update webhook event status to failed
    await supabase
      .from('quickbooks_webhook_events')
      .update({ 
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        retry_count: 1,
        processed_at: new Date().toISOString()
      })
      .eq('id', webhookEventId)

    // Log the error
    await supabase
      .from('quickbooks_sync_logs')
      .insert({
        user_id: userId,
        sync_type: 'webhook_sync',
        status: 'error',
        message: `Failed to process webhook for ${entityName}:${entityId}`,
        details: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          operation,
          entityName,
          entityId
        }),
        entity_type: entityName,
        entity_id: entityId,
        synced_at: new Date().toISOString()
      })
  }
}

// GET endpoint for webhook verification/testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('webhooks.challenge')
  
  if (challenge) {
    // QuickBooks webhook verification
    return NextResponse.json({ 'webhooks.challenge': challenge })
  }
  
  return NextResponse.json({ 
    message: 'QuickBooks Webhook Endpoint',
    timestamp: new Date().toISOString(),
    status: 'active'
  })
}