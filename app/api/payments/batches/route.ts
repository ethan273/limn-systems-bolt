/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { safeHandleAPIError } from '@/lib/utils/bulk-type-fixes'

// Batch processing utility functions
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch payment batch processes
    const { data: batches, error } = await supabase
      .from('payment_batches')
      .select(`
        id,
        type,
        status,
        transaction_count,
        total_amount,
        created_date,
        processed_date,
        file_name,
        metadata
      `)
      .order('created_date', { ascending: false })
      .limit(50)

    if (error) {
      return safeHandleAPIError(error, 'Failed to fetch batch data', _request)
    }

    return NextResponse.json({
      success: true,
      data: batches || []
    })

  } catch (error) {
    return safeHandleAPIError(error, 'Internal server error', _request)
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const supabase = await createServerSupabaseClient()

    // Validate required fields
    const required = ['type', 'transaction_ids']
    const missing = required.filter(field => !data[field])
    if (missing.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        missing 
      }, { status: 400 })
    }

    // Fetch transactions to be batched
    const { data: transactions, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('id, amount, net_amount')
      .in('id', data.transaction_ids)
      .eq('status', 'pending')

    if (transactionError) {
      return safeHandleAPIError(transactionError, 'Failed to fetch transactions', request)
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ 
        error: 'No eligible transactions found' 
      }, { status: 400 })
    }

    // Calculate batch totals
    const totalAmount = transactions.reduce((sum: any, t: any) => sum + (t.net_amount || 0), 0)
    const transactionCount = transactions.length

    // Generate batch file name
    const batchNumber = `${data.type.toUpperCase()}-${Date.now()}`
    const fileName = `${batchNumber}.${data.type === 'ach_batch' ? 'ach' : data.type === 'wire_batch' ? 'txt' : 'csv'}`

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from('payment_batches')
      .insert({
        type: data.type,
        status: 'preparing',
        transaction_count: transactionCount,
        total_amount: totalAmount,
        created_date: new Date().toISOString(),
        file_name: fileName,
        metadata: {
          transaction_ids: data.transaction_ids,
          created_by: data.created_by || 'system',
          notes: data.notes || null
        }
      })
      .select()
      .single()

    if (batchError) {
      return safeHandleAPIError(batchError, 'Failed to create batch', request)
    }

    // Update transaction statuses to 'processing' and assign batch_id
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({ 
        status: 'processing',
        batch_id: batch.id
      })
      .in('id', data.transaction_ids)

    if (updateError) {
      return safeHandleAPIError(updateError, 'Failed to update transactions', request)
    }

    return NextResponse.json({
      success: true,
      data: batch,
      message: `Batch ${batchNumber} created successfully with ${transactionCount} transactions`
    }, { status: 201 })

  } catch (error) {
    return safeHandleAPIError(error, 'Internal server error', request)
  }
}