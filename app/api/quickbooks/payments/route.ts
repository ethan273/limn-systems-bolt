// QuickBooks Payment Processing API Route
// Phase 2 Implementation

import { NextRequest } from 'next/server'
import { QuickBooksPaymentProcessor } from '@/lib/quickbooks/payment-processor'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, amount, methodId } = await request.json()

    if (!invoiceId || !amount || !methodId) {
      return Response.json(
        { error: 'Missing required fields: invoiceId, amount, methodId' },
        { status: 400 }
      )
    }

    const paymentProcessor = new QuickBooksPaymentProcessor()
    const result = await paymentProcessor.processPayment(invoiceId, amount, methodId)

    return Response.json(result)
  } catch (error) {
    console.error('Payment processing error:', error)
    return Response.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const paymentProcessor = new QuickBooksPaymentProcessor()

    if (action === 'reconcile') {
      const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

      const results = await paymentProcessor.reconcilePayments(startDate, endDate)
      return Response.json({ reconciliation: results })
    }

    if (action === 'recurring') {
      await paymentProcessor.processRecurringPayments()
      return Response.json({ message: 'Recurring payments processed' })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Payment API error:', error)
    return Response.json(
      { error: 'Payment API error' },
      { status: 500 }
    )
  }
}