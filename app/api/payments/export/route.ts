/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { safeHandleAPIError, safeArrayAccess } from '@/lib/utils/bulk-type-fixes'
import { safeString } from '@/lib/types/database-types'

export async function POST(request: NextRequest) {
  try {
    const { type, filters } = await request.json()

    if (!type || !['csv', 'excel'].includes(type)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Build query with filters
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
        customers:customer_id(name, company_name),
        invoices:invoice_id(invoice_number, total_amount)
      `)

    // Apply date range filter
    if (filters?.date_range) {
      const endDate = new Date()
      const startDate = new Date()
      switch (filters.date_range) {
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
    }

    // Apply other filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }
    if (filters?.method && filters.method !== 'all') {
      query = query.eq('method', filters.method)
    }

    // Apply search filter
    if (filters?.search) {
      query = query.or(`reference_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Order by creation date descending
    query = query.order('created_date', { ascending: false })

    const { data: transactions, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch export data' }, { status: 500 })
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 400 })
    }

    // Transform data for export
    const exportData = transactions.map((transaction: any) => ({
      'Reference Number': transaction.reference_number,
      'Type': transaction.type,
      'Customer/Vendor': (() => {
        const customers = safeArrayAccess(transaction.customers)
        const customer = customers[0] as { name?: string; company_name?: string } | undefined
        return safeString(customer?.name) || safeString(customer?.company_name) || 'Unknown'
      })(),
      'Invoice Number': (() => {
        const invoices = safeArrayAccess(transaction.invoices)
        const invoice = invoices[0] as { invoice_number?: string } | undefined
        return safeString(invoice?.invoice_number) || ''
      })(),
      'Amount': transaction.amount,
      'Fee Amount': transaction.fee_amount || 0,
      'Net Amount': transaction.net_amount,
      'Currency': transaction.currency,
      'Status': transaction.status,
      'Method': transaction.method,
      'QuickBooks Sync': transaction.quickbooks_sync_status,
      'Description': transaction.description,
      'Created Date': transaction.created_date,
      'Processed Date': transaction.processed_date || '',
      'Batch ID': transaction.batch_id || ''
    }))

    if (type === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0])
      const csvContent = [
        headers.join(','),
        ...exportData.map((row: any) => 
          headers.map(header => {
            const value = row[header as keyof typeof row]
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value.replace(/"/g, '""')}"` 
              : value
          }).join(',')
        )
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payments_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else if (type === 'excel') {
      // For Excel export, we'd typically use a library like xlsx
      // For now, return CSV with Excel MIME type
      const headers = Object.keys(exportData[0])
      const csvContent = [
        headers.join('\t'),
        ...exportData.map((row: any) => 
          headers.map(header => row[header as keyof typeof row]).join('\t')
        )
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="payments_${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      })
    }

    return NextResponse.json({ error: 'Unsupported export type' }, { status: 400 })

  } catch (error) {
    console.error('Error exporting payment data:', error)
    return safeHandleAPIError(error, 'Failed to export payment data', request)
  }
}