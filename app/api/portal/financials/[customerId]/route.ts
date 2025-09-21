/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{
    customerId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { customerId } = await params
    const supabase = await createServerSupabaseClient()

    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, company_name, user_id, credit_status')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if user owns this customer record or is admin
    if (customer.user_id !== session.user.id) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get financial dashboard data
    const { data: dashboardData } = await supabase
      .from('v_customer_financial_dashboard')
      .select('*')
      .eq('id', customerId)
      .single()

    // Get outstanding invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        balance_due,
        due_date,
        status,
        payment_link,
        quickbooks_invoice_mappings (
          quickbooks_invoice_id
        )
      `)
      .eq('customer_id', customerId)
      .in('status', ['pending', 'overdue', 'sent'])
      .order('due_date', { ascending: true })

    // Get payment history
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_date,
        payment_method,
        quickbooks_reference_number,
        invoices!inner (
          invoice_number
        )
      `)
      .eq('customer_id', customerId)
      .order('payment_date', { ascending: false })
      .limit(10)

    // Get order progress
    const { data: orders, error: ordersError } = await supabase
      .from('v_order_financial_pipeline')
      .select('*')
      .eq('customer_id', customerId)
      .order('order_number', { ascending: false })

    // Calculate available credit
    const { data: availableCredit, error: creditError } = await supabase
      .rpc('calculate_customer_available_credit', {
        p_customer_id: customerId
      })

    // Compile response
    const financialData = {
      customer: {
        id: customer.id,
        company_name: customer.company_name,
        credit_status: customer.credit_status || 'good'
      },
      dashboard: dashboardData || {
        total_outstanding: 0,
        pending_invoices: 0,
        overdue_invoices: 0,
        next_due_date: null,
        active_orders: 0,
        pipeline_value: 0,
        items_in_production: 0,
        items_ready_to_invoice: 0
      },
      available_credit: creditError ? 0 : (availableCredit || 0),
      invoices: invoicesError ? [] : (invoices || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        total_amount: inv.total_amount,
        balance_due: inv.balance_due,
        due_date: inv.due_date,
        status: inv.status,
        payment_link: inv.payment_link,
        quickbooks_invoice_id: inv.quickbooks_invoice_mappings?.[0]?.quickbooks_invoice_id || null
      })),
      payment_history: paymentsError ? [] : (payments || []).map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method || 'Unknown',
        reference_number: payment.quickbooks_reference_number,
        invoice_number: payment.invoices?.[0]?.invoice_number || 'N/A'
      })),
      order_progress: ordersError ? [] : (orders || []).map((order: any) => ({
        order_id: order.order_id,
        order_number: order.order_number,
        financial_stage: order.financial_stage,
        production_status: order.production_status,
        production_progress: order.progress_percentage || 0,
        order_value: order.order_value,
        invoice_amount: order.invoice_amount,
        balance_due: order.balance_due
      })),
      last_updated: new Date().toISOString()
    }

    return NextResponse.json(financialData)

  } catch (error) {
    console.error('Customer financials API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer financial data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { customerId } = await params
    const supabase = await createServerSupabaseClient()

    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, invoice_id, payment_details } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      )
    }

    let result = null

    switch (action) {
      case 'request_payment_link':
        if (!invoice_id) {
          return NextResponse.json(
            { error: 'Missing invoice_id for payment link request' },
            { status: 400 }
          )
        }
        result = await generatePaymentLink(supabase, customerId, invoice_id)
        break

      case 'update_payment_method':
        result = await updatePaymentMethod(supabase, customerId, payment_details)
        break

      case 'request_statement':
        result = await requestStatement(supabase, customerId)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      customer_id: customerId,
      result
    })

  } catch (error) {
    console.error('Customer financials action error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    )
  }
}

async function generatePaymentLink(supabase: SupabaseClient, customerId: string, invoiceId: string) {
  // Verify invoice belongs to customer
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, balance_due, payment_link')
    .eq('id', invoiceId)
    .eq('customer_id', customerId)
    .single()

  if (error || !invoice) {
    throw new Error('Invoice not found')
  }

  // If payment link already exists, return it
  if (invoice.payment_link) {
    return {
      payment_link: invoice.payment_link,
      invoice_id: invoiceId,
      amount: invoice.balance_due
    }
  }

  // Generate new payment link (this would integrate with your payment processor)
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/portal/pay/${invoiceId}`

  // Update invoice with payment link
  await supabase
    .from('invoices')
    .update({ 
      payment_link: paymentLink,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)

  return {
    payment_link: paymentLink,
    invoice_id: invoiceId,
    amount: invoice.balance_due
  }
}

async function updatePaymentMethod(supabase: SupabaseClient, customerId: string, paymentDetails: Record<string, unknown>) {
  // This would integrate with your payment processor to update payment methods
  // For now, just log the request
  
  await supabase
    .from('audit_logs')
    .insert({
      action: 'PAYMENT_METHOD_UPDATE_REQUEST',
      entity_type: 'customer',
      entity_id: customerId,
      details: { payment_details: paymentDetails },
      created_at: new Date().toISOString()
    })

  return {
    message: 'Payment method update request received',
    customer_id: customerId
  }
}

async function requestStatement(supabase: SupabaseClient, customerId: string) {
  // Generate and email customer statement
  // For now, just log the request
  
  await supabase
    .from('audit_logs')
    .insert({
      action: 'STATEMENT_REQUEST',
      entity_type: 'customer',
      entity_id: customerId,
      details: { requested_at: new Date().toISOString() },
      created_at: new Date().toISOString()
    })

  return {
    message: 'Statement request received',
    customer_id: customerId,
    delivery_method: 'email'
  }
}