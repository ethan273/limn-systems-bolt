import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { errorResponses } from '@/lib/error-handling/error-middleware'
// import { secureLogger } from '@/lib/logging/secure-logger' // Unused
import { z } from 'zod'
import { safeSpread, safeArrayAccess } from '@/lib/utils/bulk-type-fixes'
import { safeString } from '@/lib/types/database-types'

// Validation schema for payment transaction creation
const createTransactionSchema = z.object({
  type: z.enum(['incoming', 'outgoing']),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(3).max(3).default('USD'),
  method: z.string().min(1, 'Payment method is required'),
  description: z.string().min(1, 'Description is required'),
  customer_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  fee_amount: z.number().min(0).optional().default(0),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
});

export async function GET(request: NextRequest) {
  // Apply financial read operations rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.financial_read_secure)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const type = searchParams.get('type') || 'all'
    const method = searchParams.get('method') || 'all'
    const dateRange = searchParams.get('date_range') || '30d'
    const search = searchParams.get('search') || ''
    const includeCustomer = searchParams.get('include_customer') === 'true'
    const includeInvoice = searchParams.get('include_invoice') === 'true'
    const includeQuickbooks = searchParams.get('include_quickbooks') === 'true'

    const supabase = await createServerSupabaseClient()

    // Build comprehensive query with joins
    let query = supabase
      .from('payment_transactions')
      .select(`
        id,
        type,
        amount,
        currency,
        status,
        method,
        reference_number,
        description,
        customer_id,
        invoice_id,
        quickbooks_id,
        quickbooks_sync_status,
        processed_date,
        created_date,
        batch_id,
        fee_amount,
        net_amount,
        metadata,
        ${includeCustomer ? 'customers:customer_id(id, name, company_name),' : ''}
        ${includeInvoice ? 'invoices:invoice_id(id, invoice_number, total_amount),' : ''}
        ${includeQuickbooks ? 'quickbooks_transactions:quickbooks_id(*)' : ''}
      `.replace(/,\s*$/, '')) // Remove trailing comma

    // Apply date range filter
    const endDate = new Date()
    const startDate = new Date()
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }
    query = query.gte('created_date', startDate.toISOString())

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (type !== 'all') {
      query = query.eq('type', type)
    }
    if (method !== 'all') {
      query = query.eq('method', method)
    }

    // Apply search filter
    if (search) {
      query = query.or(`reference_number.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Order by creation date descending
    query = query.order('created_date', { ascending: false })

    const { data: transactions, error } = await query

    if (error) {
      return await errorResponses.database(error, request)
    }

    // Transform data to include customer names
    const transformedTransactions = safeArrayAccess(transactions).map(transaction => {
      const safeTransaction = safeSpread(transaction)
      const customers = safeArrayAccess(safeTransaction.customers)
      const customer = customers[0]
      const invoices = safeArrayAccess(safeTransaction.invoices)
      const invoice = invoices[0]
      
      return {
        ...safeTransaction,
        customer_name: safeString((customer as { name?: string; company_name?: string } | undefined)?.name) || safeString((customer as { name?: string; company_name?: string } | undefined)?.company_name) || 'Unknown',
        invoice_number: safeString((invoice as { invoice_number?: string } | undefined)?.invoice_number) || null
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedTransactions,
      count: transformedTransactions.length
    })

  } catch (error) {
    return await errorResponses.internal(error as Error, request)
  }
}

export async function POST(request: NextRequest) {
  // Apply financial write operations rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.financial_write)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  
  try {
    const data = await request.json()
    
    // Validate input data with schema
    const validation = createTransactionSchema.safeParse(data)
    if (!validation.success) {
      return await errorResponses.validation(validation.error, request)
    }
    
    const validatedData = validation.data
    const supabase = await createServerSupabaseClient()

    // Generate reference number
    const referenceNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Insert new payment transaction
    const { data: transaction, error } = await supabase
      .from('payment_transactions')
      .insert({
        type: validatedData.type,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: 'pending',
        method: validatedData.method,
        reference_number: referenceNumber,
        description: validatedData.description,
        customer_id: validatedData.customer_id || null,
        invoice_id: validatedData.invoice_id || null,
        quickbooks_sync_status: 'pending',
        created_date: new Date().toISOString(),
        fee_amount: validatedData.fee_amount,
        net_amount: validatedData.amount - validatedData.fee_amount,
        metadata: validatedData.metadata
      })
      .select()
      .single()

    if (error) {
      return await errorResponses.database(error, request)
    }

    return NextResponse.json({
      success: true,
      data: transaction
    }, { status: 201 })

  } catch (error) {
    return await errorResponses.internal(error as Error, request)
  }
}