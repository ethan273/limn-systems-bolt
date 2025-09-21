/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const riskLevel = searchParams.get('risk_level') || 'all'
    const collectionStatus = searchParams.get('collection_status') || 'all'
    const daysOutstanding = searchParams.get('days_outstanding') || 'all'
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sort_by') || 'total_outstanding'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    const supabase = await createServerSupabaseClient()

    // Fetch customers with their outstanding invoices
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
      return NextResponse.json({ error: 'Failed to fetch customer AR data' }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Process each customer's AR aging
    const today = new Date()
    const customersWithAging = customers.map((customer: any) => {
      // Filter to only outstanding invoices
      const outstandingInvoices = (customer.invoices || []).filter(
        (inv: any) => ['sent', 'overdue', 'partial'].includes(inv.status) && (inv.amount_due || 0) > 0
      )

      if (outstandingInvoices.length === 0) {
        return null // Skip customers with no outstanding invoices
      }

      // Calculate aging for each invoice
      const invoicesWithAging = outstandingInvoices.map((invoice: any) => {
        const dueDate = new Date(invoice.due_date)
        const daysOutstanding = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          ...invoice,
          days_outstanding: Math.max(0, daysOutstanding)
        }
      })

      // Calculate aging buckets for this customer
      const buckets = {
        current: 0,
        days_1_15: 0,
        days_16_30: 0,
        days_31_45: 0,
        days_46_60: 0,
        days_61_90: 0,
        days_over_90: 0
      }

      invoicesWithAging.forEach((inv: any) => {
        const days = inv.days_outstanding
        const amount = inv.amount_due || 0

        if (days <= 15) buckets.current += amount
        else if (days <= 30) buckets.days_1_15 += amount
        else if (days <= 45) buckets.days_16_30 += amount
        else if (days <= 60) buckets.days_31_45 += amount
        else if (days <= 90) buckets.days_46_60 += amount
        else if (days <= 90) buckets.days_61_90 += amount
        else buckets.days_over_90 += amount
      })

      // Fix bucket assignment (corrected logic)
      buckets.current = invoicesWithAging.filter((inv: any) => inv.days_outstanding <= 0).reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)
      buckets.days_1_15 = invoicesWithAging.filter((inv: any) => inv.days_outstanding >= 1 && inv.days_outstanding <= 15).reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)
      buckets.days_16_30 = invoicesWithAging.filter((inv: any) => inv.days_outstanding >= 16 && inv.days_outstanding <= 30).reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)
      buckets.days_31_45 = invoicesWithAging.filter((inv: any) => inv.days_outstanding >= 31 && inv.days_outstanding <= 45).reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)
      buckets.days_46_60 = invoicesWithAging.filter((inv: any) => inv.days_outstanding >= 46 && inv.days_outstanding <= 60).reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)
      buckets.days_61_90 = invoicesWithAging.filter((inv: any) => inv.days_outstanding >= 61 && inv.days_outstanding <= 90).reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)
      buckets.days_over_90 = invoicesWithAging.filter((inv: any) => inv.days_outstanding > 90).reduce((sum: any, inv: any) => sum + (inv.amount_due || 0), 0)

      const totalOutstanding = Object.values(buckets).reduce((sum, amount) => sum + amount, 0)
      const oldestInvoiceDays = Math.max(...invoicesWithAging.map((inv: any) => inv.days_outstanding))
      
      // Determine collection status based on aging
      let collectionStatus = 'current'
      if (buckets.days_over_90 > 0) collectionStatus = 'legal'
      else if (buckets.days_61_90 > 0 || buckets.days_46_60 > 0) collectionStatus = 'collections'
      else if (buckets.days_31_45 > 0 || buckets.days_16_30 > 0) collectionStatus = 'follow_up'

      // Calculate risk score (0-100)
      let riskScore = 0
      riskScore += (buckets.days_over_90 / totalOutstanding) * 40
      riskScore += (buckets.days_61_90 / totalOutstanding) * 25
      riskScore += (buckets.days_46_60 / totalOutstanding) * 15
      riskScore += (buckets.days_31_45 / totalOutstanding) * 10
      riskScore += (buckets.days_16_30 / totalOutstanding) * 5

      return {
        customer_id: customer.id,
        customer_name: customer.name || customer.company_name || 'Unknown',
        company_name: customer.company_name || customer.name || 'Unknown',
        total_outstanding: totalOutstanding,
        oldest_invoice_days: oldestInvoiceDays,
        invoice_count: outstandingInvoices.length,
        contact_email: customer.email || '',
        contact_phone: customer.phone || '',
        last_payment_date: null, // Would need payment history
        last_contact_date: null, // Would need collection activity data
        credit_limit: customer.credit_limit || 0,
        payment_terms: customer.payment_terms || 'Net 30',
        risk_score: Math.round(riskScore),
        collection_status: collectionStatus as 'current' | 'follow_up' | 'collections' | 'legal' | 'write_off',
        buckets
      }
    }).filter(Boolean) // Remove null entries

    // Apply filters
    let filteredCustomers = customersWithAging

    if (search) {
      filteredCustomers = filteredCustomers.filter((customer: any) =>
        customer && (
          customer.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
          customer.company_name?.toLowerCase().includes(search.toLowerCase())
        )
      )
    }

    if (collectionStatus !== 'all') {
      filteredCustomers = filteredCustomers.filter((customer: any) => 
        customer && customer.collection_status === collectionStatus
      )
    }

    if (daysOutstanding !== 'all') {
      filteredCustomers = filteredCustomers.filter((customer: any) => {
        if (!customer) return false
        switch (daysOutstanding) {
          case 'current':
            return customer.buckets.current > 0 || customer.buckets.days_1_15 > 0
          case 'early':
            return customer.buckets.days_16_30 > 0
          case 'moderate':
            return customer.buckets.days_31_45 > 0 || customer.buckets.days_46_60 > 0
          case 'late':
            return customer.buckets.days_61_90 > 0 || customer.buckets.days_over_90 > 0
          default:
            return true
        }
      })
    }

    // Apply sorting
    filteredCustomers.sort((a: any, b: any) => {
      if (!a || !b) return 0
      let aValue, bValue
      
      switch (sortBy) {
        case 'customer_name':
          aValue = a.customer_name
          bValue = b.customer_name
          break
        case 'total_outstanding':
          aValue = a.total_outstanding
          bValue = b.total_outstanding
          break
        case 'oldest_invoice_days':
          aValue = a.oldest_invoice_days
          bValue = b.oldest_invoice_days
          break
        case 'risk_score':
          aValue = a.risk_score
          bValue = b.risk_score
          break
        default:
          aValue = a.total_outstanding
          bValue = b.total_outstanding
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }
    })

    return NextResponse.json({
      success: true,
      data: filteredCustomers,
      total_customers: filteredCustomers.length,
      filters: {
        risk_level: riskLevel,
        collection_status: collectionStatus,
        days_outstanding: daysOutstanding,
        search
      }
    })

  } catch (error) {
    console.error('Error fetching customer AR details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}