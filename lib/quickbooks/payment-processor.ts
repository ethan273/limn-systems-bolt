// QuickBooks Payment Processing Service
// Phase 2 Implementation
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@supabase/supabase-js'
import { getQuickBooksClient } from './client'

export class QuickBooksPaymentProcessor {
  private supabase: unknown
  private qbClient: unknown

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
    this.qbClient = getQuickBooksClient()
  }

  /**
   * Process a payment through QuickBooks
   */
  async processPayment(invoiceId: string, amount: number, methodId: string) {
    try {
      // 1. Get QuickBooks credentials
      const credentials = await this.getActiveCredentials()
      
      // 2. Create payment record in Supabase
      const { data: payment, error: paymentError } = await (this.supabase as any)
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount: amount,
          payment_method_id: methodId,
          status: 'processing',
          payment_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // 3. Add to QuickBooks payment queue
      const { error: queueError } = await (this.supabase as any)
        .from('quickbooks_payment_queue')
        .insert({
          invoice_id: invoiceId,
          amount,
          payment_method_id: methodId,
          scheduled_date: new Date().toISOString(),
          status: 'pending',
          payment_id: (payment as any).id
        })

      if (queueError) throw queueError

      // 4. Process through QuickBooks API
      const qbPayment = await this.createQuickBooksPayment({
        invoiceId,
        amount,
        methodId,
        credentials
      })

      // 5. Update payment status
      await this.updatePaymentStatus((payment as any).id, 'completed', qbPayment.Id)

      return { success: true, paymentId: (payment as any).id, quickbooksPaymentId: qbPayment.Id }
    } catch (error) {
      console.error('Payment processing error:', error)
      throw error
    }
  }

  /**
   * Create payment in QuickBooks
   */
  private async createQuickBooksPayment(params: {
    invoiceId: string
    amount: number
    methodId: string
    credentials: unknown
  }) {
    // Get invoice from local system
    const { data: invoice } = await (this.supabase as any)
      .from('invoices')
      .select('*, customer:customers(*)')
      .eq('id', params.invoiceId)
      .single()

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    // Get QuickBooks customer ID
    const qbCustomerId = await this.getOrCreateCustomer((invoice as any).customer, params.credentials)

    // Create payment in QuickBooks
    const payment = {
      CustomerRef: { value: qbCustomerId },
      TotalAmt: params.amount,
      Line: [{
        Amount: params.amount,
        LinkedTxn: [{
          TxnId: invoice.quickbooks_invoice_id || '1',
          TxnType: 'Invoice'
        }]
      }]
    }

    const response = await this.makeQuickBooksRequest(
      'POST', 
      `/v3/company/${(params.credentials as any).companyId}/payment`, 
      payment,
      params.credentials
    )
    
    return response.QueryResponse.Payment[0]
  }

  /**
   * Process recurring payments
   */
  async processRecurringPayments() {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: recurringPayments, error } = await (this.supabase as any)
      .from('quickbooks_recurring_payments')
      .select('*')
      .eq('is_active', true)
      .lte('next_payment_date', today)

    if (error) throw error

    for (const recurring of recurringPayments) {
      try {
        await this.processPayment(
          (recurring as any).invoice_id,
          (recurring as any).amount,
          (recurring as any).payment_method_id
        )

        // Update next payment date
        await this.updateNextPaymentDate((recurring as any).id, (recurring as any).frequency)
      } catch (error) {
        console.error(`Failed to process recurring payment ${(recurring as any).id}:`, error)
      }
    }
  }

  /**
   * Reconcile QuickBooks payments
   */
  async reconcilePayments(startDate: string, endDate: string) {
    const credentials = await this.getActiveCredentials()
    
    // Fetch payments from QuickBooks
    const query = `SELECT * FROM Payment WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
    const qbResponse = await this.makeQuickBooksRequest(
      'GET',
      `/v3/company/${credentials.companyId}/query?query=${encodeURIComponent(query)}`,
      null,
      credentials
    )
    
    const qbPayments = qbResponse.QueryResponse.Payment || []
    
    // Fetch local payments
    const { data: localPayments } = await (this.supabase as any)
      .from('payments')
      .select('*')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)

    // Reconcile
    const reconciliationResults = []
    for (const qbPayment of qbPayments) {
      const localPayment = localPayments.find(
        (p: any) => p.quickbooks_payment_id === qbPayment.Id
      )

      const status = localPayment 
        ? (localPayment.amount === qbPayment.TotalAmt ? 'matched' : 'partial')
        : 'unmatched'

      reconciliationResults.push({
        quickbooks_payment_id: qbPayment.Id,
        payment_id: localPayment?.id,
        expected_amount: localPayment?.amount || 0,
        actual_amount: qbPayment.TotalAmt,
        status,
        reconciliation_date: new Date().toISOString()
      })
    }

    // Save reconciliation results
    await (this.supabase as any)
      .from('quickbooks_payment_reconciliation')
      .insert(reconciliationResults)

    return reconciliationResults
  }

  /**
   * Get or create customer in QuickBooks
   */
  private async getOrCreateCustomer(customer: unknown, credentials: unknown) {
    // Check if customer exists in QuickBooks mapping
    const { data: mapping } = await (this.supabase as any)
      .from('quickbooks_entity_mapping')
      .select('quickbooks_id')
      .eq('entity_type', 'customer')
      .eq('limn_id', (customer as any).id)
      .single()

    if (mapping) {
      return mapping.quickbooks_id
    }

    // Create customer in QuickBooks
    const qbCustomer = {
      DisplayName: (customer as any).company_name || (customer as any).name || (customer as any).email,
      CompanyName: (customer as any).company_name,
      GivenName: (customer as any).name?.split(' ')[0] || '',
      FamilyName: (customer as any).name?.split(' ').slice(1).join(' ') || '',
      PrimaryEmailAddr: { Address: (customer as any).email },
      PrimaryPhone: { FreeFormNumber: (customer as any).phone },
      BillAddr: {
        Line1: (customer as any).address,
        City: (customer as any).city,
        CountrySubDivisionCode: (customer as any).state,
        PostalCode: (customer as any).zip,
        Country: (customer as any).country || 'USA'
      }
    }

    const response = await this.makeQuickBooksRequest(
      'POST',
      `/v3/company/${(credentials as any).companyId}/customer`,
      qbCustomer,
      credentials
    )
    
    const createdCustomer = response.QueryResponse.Customer[0]
    
    // Store mapping
    await (this.supabase as any)
      .from('quickbooks_entity_mapping')
      .insert({
        entity_type: 'customer',
        limn_id: (customer as any).id,
        quickbooks_id: createdCustomer.Id
      })

    return createdCustomer.Id
  }

  /**
   * Get active QuickBooks credentials
   */
  private async getActiveCredentials() {
    const { data: auth } = await (this.supabase as any)
      .from('quickbooks_auth')
      .select('*')
      .eq('is_active', true)
      .single()

    if (!auth) {
      throw new Error('QuickBooks not connected')
    }

    // Check if token needs refresh
    if (new Date(auth.token_expiry) < new Date()) {
      await this.refreshToken(auth)
    }

    return auth
  }

  /**
   * Refresh QuickBooks access token
   */
  private async refreshToken(auth: unknown) {
    try {
      (this.qbClient as any).token = {
        access_token: (auth as any).access_token,
        refresh_token: (auth as any).refresh_token,
        token_type: 'Bearer',
        expires_in: 3600
      }

      const authResponse = await (this.qbClient as any).refresh()
      
      // Update stored tokens
      await (this.supabase as any)
        .from('quickbooks_auth')
        .update({
          access_token: (authResponse as any).token.access_token,
          refresh_token: (authResponse as any).token.refresh_token,
          token_expiry: new Date(Date.now() + (authResponse as any).token.expires_in * 1000),
          updated_at: new Date()
        })
        .eq('id', (auth as any).id)

    } catch (error) {
      console.error('Token refresh failed:', error)
      throw error
    }
  }

  /**
   * Make API request to QuickBooks
   */
  private async makeQuickBooksRequest(method: string, endpoint: string, body: unknown, credentials: unknown) {
    const baseUrl = process.env.QB_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'
    
    const headers = {
      'Authorization': `Bearer ${(credentials as any).access_token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.status}`)
    }

    return await response.json()
  }

  private async updatePaymentStatus(paymentId: string, status: string, qbId: string) {
    return await (this.supabase as any)
      .from('payments')
      .update({ 
        status,
        quickbooks_payment_id: qbId,
        quickbooks_sync_date: new Date().toISOString()
      })
      .eq('id', paymentId)
  }

  private async updateNextPaymentDate(recurringId: string, frequency: string) {
    const nextDate = this.calculateNextPaymentDate(frequency)
    
    return await (this.supabase as any)
      .from('quickbooks_recurring_payments')
      .update({ next_payment_date: nextDate })
      .eq('id', recurringId)
  }

  private calculateNextPaymentDate(frequency: string): string {
    const date = new Date()
    
    switch(frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'biweekly':
        date.setDate(date.getDate() + 14)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'annually':
        date.setFullYear(date.getFullYear() + 1)
        break
    }
    
    return date.toISOString().split('T')[0]
  }
}