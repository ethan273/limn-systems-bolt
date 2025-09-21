/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { type, filters } = await request.json()

    if (!type || !['csv', 'excel'].includes(type)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Fetch customers with their outstanding invoices (same logic as customers endpoint)
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        company_name,
        email,
        phone,
        credit_limit,
        payment_terms,
        invoices:invoices!customer_id(
          id,
          invoice_number,
          total_amount,
          amount_paid,
          amount_due,
          invoice_date,
          due_date,
          status
        )
      `)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch AR export data' }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 400 })
    }

    // Process customers with aging calculations (same logic as customers endpoint)
    const today = new Date()
    const exportData: Array<{
      'Customer Name': string
      'Company Name': string
      'Email': string
      'Phone': string
      'Credit Limit': number
      'Payment Terms': string
      'Total Outstanding': number
      'Current (0 days)': number
      '1-15 Days': number
      '16-30 Days': number
      '31-45 Days': number
      '46-60 Days': number
      '61-90 Days': number
      '90+ Days': number
      'Invoice Count': number
      'Collection Status': string
      'Export Date': string
    }> = []

    customers.forEach((customer: any) => {
      const outstandingInvoices = (customer.invoices || []).filter(
        (inv: any) => ['sent', 'overdue', 'partial'].includes(inv.status) && (inv.amount_due || 0) > 0
      )

      if (outstandingInvoices.length === 0) return

      // Calculate aging buckets
      const buckets = {
        current: 0,
        days_1_15: 0,
        days_16_30: 0,
        days_31_45: 0,
        days_46_60: 0,
        days_61_90: 0,
        days_over_90: 0
      }

      outstandingInvoices.forEach((inv: any) => {
        const dueDate = new Date(inv.due_date)
        const daysOutstanding = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        const amount = inv.amount_due || 0

        if (daysOutstanding <= 0) buckets.current += amount
        else if (daysOutstanding <= 15) buckets.days_1_15 += amount
        else if (daysOutstanding <= 30) buckets.days_16_30 += amount
        else if (daysOutstanding <= 45) buckets.days_31_45 += amount
        else if (daysOutstanding <= 60) buckets.days_46_60 += amount
        else if (daysOutstanding <= 90) buckets.days_61_90 += amount
        else buckets.days_over_90 += amount
      })

      const totalOutstanding = Object.values(buckets).reduce((sum, amount) => sum + amount, 0)

      // Determine collection status
      let collectionStatus = 'current'
      if (buckets.days_over_90 > 0) collectionStatus = 'legal'
      else if (buckets.days_61_90 > 0 || buckets.days_46_60 > 0) collectionStatus = 'collections'
      else if (buckets.days_31_45 > 0 || buckets.days_16_30 > 0) collectionStatus = 'follow_up'

      // Add to export data
      exportData.push({
        'Customer Name': customer.name || customer.company_name || 'Unknown',
        'Company Name': customer.company_name || customer.name || 'Unknown',
        'Email': customer.email || '',
        'Phone': customer.phone || '',
        'Credit Limit': customer.credit_limit || 0,
        'Payment Terms': customer.payment_terms || 'Net 30',
        'Total Outstanding': totalOutstanding,
        'Current (0 days)': buckets.current,
        '1-15 Days': buckets.days_1_15,
        '16-30 Days': buckets.days_16_30,
        '31-45 Days': buckets.days_31_45,
        '46-60 Days': buckets.days_46_60,
        '61-90 Days': buckets.days_61_90,
        '90+ Days': buckets.days_over_90,
        'Invoice Count': outstandingInvoices.length,
        'Collection Status': collectionStatus,
        'Export Date': new Date().toISOString().split('T')[0]
      })
    })

    // Apply filters if provided
    let filteredData = exportData

    if (filters?.search) {
      filteredData = filteredData.filter(row =>
        row['Customer Name'].toLowerCase().includes(filters.search.toLowerCase()) ||
        row['Company Name'].toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters?.collection_status && filters.collection_status !== 'all') {
      filteredData = filteredData.filter(row => 
        row['Collection Status'] === filters.collection_status
      )
    }

    if (filteredData.length === 0) {
      return NextResponse.json({ error: 'No data matches the current filters' }, { status: 400 })
    }

    if (type === 'csv') {
      // Generate CSV
      const headers = Object.keys(filteredData[0])
      const csvContent = [
        headers.join(','),
        ...filteredData.map(row => 
          headers.map(header => {
             
            const value = (row as any)[header]
            // Handle currency formatting and escape commas/quotes
            const formattedValue = typeof value === 'number' && header.includes('Outstanding') || header.includes('Days') || header.includes('Limit')
              ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : value
            
            return typeof formattedValue === 'string' && (formattedValue.includes(',') || formattedValue.includes('"')) 
              ? `"${formattedValue.replace(/"/g, '""')}"` 
              : formattedValue
          }).join(',')
        )
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ar_aging_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else if (type === 'excel') {
      // For Excel export (simplified as TSV)
      const headers = Object.keys(filteredData[0])
      const tsvContent = [
        headers.join('\t'),
        ...filteredData.map(row => 
          headers.map(header => {
             
            const value = (row as any)[header]
            // Handle currency formatting
            return typeof value === 'number' && (header.includes('Outstanding') || header.includes('Days') || header.includes('Limit'))
              ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : value
          }).join('\t')
        )
      ].join('\n')

      return new NextResponse(tsvContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="ar_aging_${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      })
    }

    return NextResponse.json({ error: 'Unsupported export type' }, { status: 400 })

  } catch (error) {
    console.error('Error exporting AR aging data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}