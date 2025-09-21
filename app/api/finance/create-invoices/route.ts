import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { QuickBooksService } from '@/lib/quickbooks/service'

// TypeScript interfaces
interface ProductionItem {
  id: string
  status: string
  name?: string
  quantity?: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // User authentication is handled by middleware
    // Get user from session for QuickBooks operations
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    const body = await request.json()
    const { order_ids, create_in_quickbooks = true } = body

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid order_ids array' },
        { status: 400 }
      )
    }

    // Validate orders are ready for invoicing
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        total_amount,
        ready_to_invoice,
        status,
        customers (
          id,
          company_name,
          quickbooks_customer_mappings (quickbooks_customer_id)
        ),
        production_items (
          id,
          status,
          completed_at
        ),
        invoices (
          id
        )
      `)
      .in('id', order_ids)

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Validate each order
    const validationErrors = []
    const validOrders = []

    for (const order of orders) {
      // Check if order already has invoice
      if (order.invoices && order.invoices.length > 0) {
        validationErrors.push({
          order_id: order.id,
          order_number: order.order_number,
          error: 'Order already has an invoice'
        })
        continue
      }

      // Check if all production items are completed
      const incompleteItems = order.production_items.filter((item: ProductionItem) => item.status !== 'completed')
      if (incompleteItems.length > 0) {
        validationErrors.push({
          order_id: order.id,
          order_number: order.order_number,
          error: `${incompleteItems.length} production items not completed`
        })
        continue
      }

      validOrders.push(order)
    }

    if (validOrders.length === 0) {
      return NextResponse.json({
        error: 'No valid orders to process',
        validation_errors: validationErrors
      }, { status: 400 })
    }

    let qbResults = null

    // If creating in QuickBooks, use QB service
    if (create_in_quickbooks) {
      try {
        const qbService = await QuickBooksService.forUser(userId || 'unknown')
        qbResults = await qbService.bulkCreateInvoices(order_ids)
      } catch (qbError) {
        console.error('QuickBooks bulk invoice creation error:', qbError)
        // Continue with local invoice creation even if QB fails
      }
    }

    // Create local invoices for valid orders
    const localResults = []
    const localErrors = []

    for (const order of validOrders) {
      try {
        // Create local invoice record
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            customer_id: order.customer_id,
            order_id: order.id,
            invoice_number: generateInvoiceNumber(order.order_number),
            total_amount: order.total_amount,
            balance_due: order.total_amount,
            due_date: calculateDueDate(),
            status: 'pending',
            sent_to_quickbooks: create_in_quickbooks,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (invoiceError) {
          localErrors.push({
            order_id: order.id,
            order_number: order.order_number,
            error: `Failed to create local invoice: ${invoiceError.message}`
          })
          continue
        }

        // Update production items to mark as invoiced
        await supabase
          .from('production_items')
          .update({
            invoice_id: invoice.id,
            invoiced_at: new Date().toISOString()
          })
          .eq('order_id', order.id)

        // Update order status
        await supabase
          .from('orders')
          .update({
            ready_to_invoice: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        localResults.push({
          order_id: order.id,
          order_number: order.order_number,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount,
          success: true
        })

      } catch (error) {
        console.error(`Local invoice creation error for order ${order.id}:`, error)
        localErrors.push({
          order_id: order.id,
          order_number: order.order_number,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log bulk operation
    await supabase
      .from('quickbooks_sync_logs')
      .insert({
        sync_type: 'bulk_invoice_creation_api',
        status: localErrors.length === 0 ? 'success' : 'warning',
        message: `Bulk invoice creation: ${localResults.length} successful, ${localErrors.length + validationErrors.length} failed`,
        details: JSON.stringify({
          requested_orders: order_ids.length,
          valid_orders: validOrders.length,
          local_results: localResults.length,
          local_errors: localErrors.length,
          validation_errors: validationErrors.length,
          quickbooks_results: qbResults
        }),
        synced_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      summary: {
        requested: order_ids.length,
        created: localResults.length,
        failed: localErrors.length + validationErrors.length,
        quickbooks_enabled: create_in_quickbooks
      },
      created_invoices: localResults,
      local_errors: localErrors,
      validation_errors: validationErrors,
      quickbooks_results: qbResults
    })

  } catch (error) {
    console.error('Bulk invoice creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create invoices' },
      { status: 500 }
    )
  }
}

function generateInvoiceNumber(orderNumber: string): string {
  // Generate invoice number based on order number
  const timestamp = Date.now().toString().slice(-6)
  return `INV-${orderNumber}-${timestamp}`
}

function calculateDueDate(paymentTermsDays: number = 30): string {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + paymentTermsDays)
  return dueDate.toISOString().split('T')[0]
}