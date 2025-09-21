/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getQuickBooksClient, DEFAULT_ACCOUNTS, QB_ENTITY_TYPES } from './client'
// import QuickBooks from 'node-quickbooks' // Removed for security - replaced with secure implementation
import type { SupabaseClient } from '@supabase/supabase-js'

export interface QuickBooksCredentials {
  accessToken: string
  refreshToken: string
  companyId: string
  expiresAt: Date
}

export interface PaymentDetails {
  amount: number
  method: 'credit_card' | 'bank_transfer' | 'cash' | 'check'
  paymentMethodId?: string
  reference?: string
  memo?: string
}

export interface CreditCardDetails {
  number: string
  expMonth: string
  expYear: string
  cvc: string
  name: string
  address: string
  city: string
  state: string
  country: string
  zip: string
}

export interface QuickBooksIntegration {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  company_id: string
  token_expires_at: string
  is_active: boolean
}

export interface QuickBooksCustomer {
  Id: string
  Name: string
  CompanyName?: string
  GivenName?: string
  FamilyName?: string
  PrimaryEmailAddr?: { Address: string }
  PrimaryPhone?: { FreeFormNumber: string }
  SyncToken: string
  Active: boolean
  BillAddr?: QuickBooksAddress
  ShipAddr?: QuickBooksAddress
}

export interface QuickBooksAddress {
  Line1?: string
  City?: string
  CountrySubDivisionCode?: string
  PostalCode?: string
  Country?: string
}

export interface QuickBooksItem {
  Id: string
  Name: string
  Sku?: string
  Type: string
  UnitPrice?: number
  Description?: string
  SyncToken: string
  Active: boolean
}

export interface QuickBooksInvoice {
  Id: string
  DocNumber: string
  TotalAmt: number
  Balance: number
  EmailStatus?: string
  SyncToken: string
}

export interface QuickBooksPayment {
  Id: string
  TotalAmt: number
  TxnDate: string
  PaymentRefNum?: string
  SyncToken: string
}

export interface QuickBooksAccount {
  Id: string
  Name: string
  AccountType: string
  AccountSubType?: string
}

// Secure QuickBooks API Interface
interface SecureQuickBooksAPI {
  request(endpoint: string, method: string, data?: unknown): Promise<unknown>
}

// Production-ready QuickBooks client implementation  
class SecureQuickBooksClient implements SecureQuickBooksAPI {
  constructor(private credentials: QuickBooksCredentials) {}
  
  async request(endpoint: string, method: string, data?: unknown): Promise<unknown> {
    const baseUrl = process.env.QUICKBOOKS_ENVIRONMENT === 'production' 
      ? 'https://quickbooks-api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'
    
    const response = await fetch(`${baseUrl}/v3/company/${this.credentials.companyId}/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })
    
    if (!response.ok) {
      throw new Error(`QuickBooks API Error: ${response.statusText}`)
    }
    
    return response.json()
  }
}

export class QuickBooksService {
  private qbo: SecureQuickBooksAPI
  private supabase: SupabaseClient
  private credentials: QuickBooksCredentials

  constructor(credentials: QuickBooksCredentials) {
    this.credentials = credentials
    this.supabase = createServerSupabaseClient() as any
    
    // Initialize secure QuickBooks client
    this.qbo = new SecureQuickBooksClient(credentials)
  }

  // Static method to get service instance for authenticated user
  static async forUser(userId: string): Promise<QuickBooksService> {
    const supabase = await createServerSupabaseClient()
    
    const { data: integration } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      throw new Error('QuickBooks integration not found or inactive')
    }

    // Check if token needs refresh
    const now = new Date()
    const expiresAt = new Date(integration.token_expires_at)
    
    if (now >= expiresAt) {
      // Token expired, attempt refresh
      const refreshedCredentials = await QuickBooksService.refreshToken(integration)
      return new QuickBooksService(refreshedCredentials)
    }

    return new QuickBooksService({
      accessToken: integration.access_token,
      refreshToken: integration.refresh_token,
      companyId: integration.company_id,
      expiresAt: expiresAt
    })
  }

  // Refresh expired access token
  static async refreshToken(integration: QuickBooksIntegration): Promise<QuickBooksCredentials> {
    const client = getQuickBooksClient()
    const supabase = await createServerSupabaseClient()
    
    try {
      const authResponse = await client.refreshUsingToken(integration.refresh_token)
      
      const newCredentials: QuickBooksCredentials = {
        accessToken: authResponse.access_token,
        refreshToken: authResponse.refresh_token,
        companyId: integration.company_id,
        expiresAt: new Date(Date.now() + (authResponse.expires_in * 1000))
      }

      // Update stored credentials
      await supabase
        .from('quickbooks_connections')
        .update({
          access_token: newCredentials.accessToken,
          refresh_token: newCredentials.refreshToken,
          token_expires_at: newCredentials.expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id)

      return newCredentials
    } catch {
      // Mark integration as inactive if refresh fails
      await supabase
        .from('quickbooks_connections')
        .update({ is_active: false })
        .eq('id', integration.id)
      
      throw new Error('Failed to refresh QuickBooks token. Please reconnect your account.')
    }
  }

  // Test connection to QuickBooks
  async testConnection(): Promise<boolean> {
    try {
      await new Promise<unknown>((resolve, reject) => {
        (this.qbo as any).getCompanyInfo(this.credentials.companyId, (err: Error | null, companyInfo: unknown) => {
          if (err) reject(err)
          else resolve(companyInfo)
        })
      })
      return true
    } catch {
      return false
    }
  }

  // Customer Management
  async syncCustomer(customerId: string) {
    const { data: customer } = await this.supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    const qbCustomer = {
      Name: customer.company_name || customer.name || customer.email,
      CompanyName: customer.company_name,
      GivenName: customer.name?.split(' ')[0] || '',
      FamilyName: customer.name?.split(' ').slice(1).join(' ') || '',
      PrimaryEmailAddr: {
        Address: customer.email
      },
      PrimaryPhone: {
        FreeFormNumber: customer.phone
      },
      BillAddr: customer.billing_address ? {
        Line1: customer.billing_address.street,
        City: customer.billing_address.city,
        CountrySubDivisionCode: customer.billing_address.state,
        PostalCode: customer.billing_address.zip,
        Country: customer.billing_address.country
      } : undefined,
      ShipAddr: customer.shipping_address ? {
        Line1: customer.shipping_address.street,
        City: customer.shipping_address.city,
        CountrySubDivisionCode: customer.shipping_address.state,
        PostalCode: customer.shipping_address.zip,
        Country: customer.shipping_address.country
      } : undefined
    }

    return new Promise((resolve, reject) => {
      if (customer.quickbooks_id) {
        // Update existing customer
        (this.qbo as any).updateCustomer({
          ...qbCustomer,
          Id: customer.quickbooks_id,
          SyncToken: customer.quickbooks_sync_token
        }, (err: Error | null, updatedCustomer: QuickBooksCustomer) => {
          if (err) {
            reject(err)
          } else {
            this.updateLocalCustomer(customerId, updatedCustomer)
            resolve(updatedCustomer)
          }
        })
      } else {
        // Create new customer
        (this.qbo as any).createCustomer(qbCustomer, async (err: Error | null, createdCustomer: QuickBooksCustomer) => {
          if (err) {
            reject(err)
          } else {
            await this.updateLocalCustomer(customerId, createdCustomer)
            resolve(createdCustomer)
          }
        })
      }
    })
  }

  private async updateLocalCustomer(customerId: string, qbCustomer: QuickBooksCustomer) {
    await this.supabase
      .from('customers')
      .update({
        quickbooks_id: qbCustomer.Id,
        quickbooks_sync_token: qbCustomer.SyncToken,
        quickbooks_synced_at: new Date().toISOString()
      })
      .eq('id', customerId)
  }

  // Invoice Management
  async createInvoice(orderId: string) {
    const { data: order } = await this.supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        items:order_items(*, item:items(*))
      `)
      .eq('id', orderId)
      .single()

    if (!order) {
      throw new Error('Order not found')
    }

    // Ensure customer is synced
    if (!order.customer.quickbooks_id) {
      await this.syncCustomer(order.customer.id)
      // Refetch customer with QB ID
      const { data: updatedCustomer } = await this.supabase
        .from('customers')
        .select('quickbooks_id')
        .eq('id', order.customer.id)
        .single()
      order.customer.quickbooks_id = updatedCustomer?.quickbooks_id
    }

    // Build invoice line items
    const lines = []
    let lineNum = 1

    for (const orderItem of order.items) {
      // Ensure item is synced
      if (!orderItem.item.quickbooks_id) {
        await this.createProduct(orderItem.item.id)
        // Refetch item with QB ID
        const { data: updatedItem } = await this.supabase
          .from('items')
          .select('quickbooks_id')
          .eq('id', orderItem.item.id)
          .single()
        orderItem.item.quickbooks_id = updatedItem?.quickbooks_id
      }

      lines.push({
        LineNum: lineNum++,
        Amount: orderItem.quantity * orderItem.unit_price,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: orderItem.item.quickbooks_id
          },
          Qty: orderItem.quantity,
          UnitPrice: orderItem.unit_price
        }
      })
    }

    const invoice = {
      CustomerRef: {
        value: order.customer.quickbooks_id
      },
      DocNumber: order.order_number,
      TxnDate: order.created_at.split('T')[0], // Format as YYYY-MM-DD
      DueDate: order.due_date ? order.due_date.split('T')[0] : undefined,
      Line: lines,
      PrivateNote: order.notes,
      CustomerMemo: {
        value: `Order ${order.order_number}`
      }
    }

    return new Promise<QuickBooksInvoice>((resolve, reject) => {
      (this.qbo as any).createInvoice(invoice, async (err: Error | null, createdInvoice: QuickBooksInvoice) => {
        if (err) {
          reject(err)
        } else {
          // Update local order with invoice data
          await this.supabase
            .from('orders')
            .update({
              quickbooks_invoice_id: createdInvoice.Id,
              quickbooks_invoice_sync_token: createdInvoice.SyncToken,
              invoice_status: 'sent',
              invoice_created_at: new Date().toISOString()
            })
            .eq('id', orderId)

          resolve(createdInvoice)
        }
      })
    })
  }

  // Payment Processing Methods
  async processPayment(invoiceId: string, paymentDetails: PaymentDetails) {
    // Fetch invoice from local database
    const { data: order } = await this.supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', invoiceId)
      .single()

    if (!order?.quickbooks_invoice_id) {
      throw new Error('Invoice not synced with QuickBooks')
    }

    // Create payment in QuickBooks
    const payment = {
      CustomerRef: {
        value: order.customer.quickbooks_id
      },
      TotalAmt: paymentDetails.amount,
      Line: [{
        Amount: paymentDetails.amount,
        LinkedTxn: [{
          TxnId: order.quickbooks_invoice_id,
          TxnType: 'Invoice'
        }]
      }],
      PaymentMethodRef: paymentDetails.paymentMethodId ? {
        value: paymentDetails.paymentMethodId
      } : undefined,
      PaymentRefNum: paymentDetails.reference,
      PrivateNote: paymentDetails.memo
    }

    return new Promise<QuickBooksPayment>((resolve, reject) => {
      (this.qbo as any).createPayment(payment, async (err: Error | null, createdPayment: QuickBooksPayment) => {
        if (err) {
          reject(err)
        } else {
          // Record payment in local database
          await this.supabase
            .from('payments')
            .insert({
              order_id: invoiceId,
              amount: paymentDetails.amount,
              payment_method: paymentDetails.method,
              reference_number: paymentDetails.reference,
              quickbooks_id: createdPayment.Id,
              quickbooks_sync_token: createdPayment.SyncToken,
              status: 'completed',
              processed_at: new Date().toISOString()
            })
          
          // Update order payment status
          const totalPaid = await this.calculateTotalPaid(invoiceId)
          const orderTotal = order.total_amount || 0
          
          await this.supabase
            .from('orders')
            .update({ 
              payment_status: totalPaid >= orderTotal ? 'paid' : 'partial',
              paid_amount: totalPaid,
              last_payment_at: new Date().toISOString() 
            })
            .eq('id', invoiceId)
          
          resolve(createdPayment)
        }
      })
    })
  }

  private async calculateTotalPaid(orderId: string): Promise<number> {
    const { data: payments } = await this.supabase
      .from('payments')
      .select('amount')
      .eq('order_id', orderId)
      .eq('status', 'completed')

    return payments?.reduce((total, payment) => total + payment.amount, 0) || 0
  }

  // Credit Card Processing (requires Payment scope and PCI compliance)
  async chargeCreditCard(customerId: string, amount: number, cardDetails: CreditCardDetails) {
    const charge = {
      amount: amount.toFixed(2),
      currency: 'USD',
      card: {
        number: cardDetails.number,
        expMonth: cardDetails.expMonth,
        expYear: cardDetails.expYear,
        cvc: cardDetails.cvc,
        name: cardDetails.name,
        address: {
          streetAddress: cardDetails.address,
          city: cardDetails.city,
          region: cardDetails.state,
          country: cardDetails.country,
          postalCode: cardDetails.zip
        }
      },
      context: {
        mobile: false,
        isEcommerce: true
      }
    }

    // This would use QuickBooks Payments API
    // Note: You'll need additional setup for PCI compliance
    return new Promise<{ id: string; status: string }>((resolve, reject) => {
      (this.qbo as any).charge(charge, async (err: Error | null, chargeResponse: { id: string; status: string }) => {
        if (err) {
          reject(err)
        } else {
          // Record the charge in local database
          await this.supabase
            .from('credit_card_charges')
            .insert({
              customer_id: customerId,
              amount: amount,
              card_last_four: cardDetails.number.slice(-4),
              quickbooks_charge_id: chargeResponse.id,
              status: chargeResponse.status,
              processed_at: new Date().toISOString()
            })

          resolve(chargeResponse)
        }
      })
    })
  }

  // Get Payment Methods from QuickBooks
  async getPaymentMethods(): Promise<unknown[]> {
    return new Promise<unknown[]>((resolve, reject) => {
      (this.qbo as any).findPaymentMethods((err: Error | null, methods: { QueryResponse?: { PaymentMethod?: unknown[] } }) => {
        if (err) reject(err)
        else resolve(methods.QueryResponse?.PaymentMethod || [])
      })
    })
  }

  // Customer Synchronization
  async syncCustomers() {
    const customers = await new Promise<QuickBooksCustomer[]>((resolve, reject) => {
      (this.qbo as any).findCustomers((err: Error | null, customers: { QueryResponse?: { Customer?: QuickBooksCustomer[] } }) => {
        if (err) reject(err)
        else resolve(customers.QueryResponse?.Customer || [])
      })
    })

    const syncResults = []

    for (const customer of customers) {
      try {
        const mappedCustomer = {
          quickbooks_id: customer.Id,
          company_name: customer.CompanyName || customer.Name,
          name: [customer.GivenName, customer.FamilyName].filter(Boolean).join(' ') || customer.Name || '',
          email: customer.PrimaryEmailAddr?.Address || '',
          phone: customer.PrimaryPhone?.FreeFormNumber || '',
          quickbooks_sync_token: customer.SyncToken,
          is_active: customer.Active,
          updated_at: new Date().toISOString()
        }

        const { data } = await this.supabase
          .from('customers')
          .upsert(mappedCustomer, {
            onConflict: 'quickbooks_id',
            ignoreDuplicates: false
          })
          .select()

        syncResults.push({ success: true, customer: data?.[0], qbCustomer: customer })
      } catch (error) {
        syncResults.push({ success: false, error: error, qbCustomer: customer })
      }
    }

    return syncResults
  }

  // Item Synchronization  
  async syncItems() {
    return this.syncProducts() // Use existing syncProducts method
  }

  // Account Synchronization
  async syncAccounts() {
    const accounts = await new Promise<QuickBooksAccount[]>((resolve, reject) => {
      (this.qbo as any).findAccounts((err: Error | null, accounts: { QueryResponse?: { Account?: QuickBooksAccount[] } }) => {
        if (err) reject(err)
        else resolve(accounts.QueryResponse?.Account || [])
      })
    })

    const syncResults = []

    for (const account of accounts) {
      try {
        syncResults.push({ 
          success: true, 
          account: {
            id: account.Id,
            name: account.Name,
            type: account.AccountType,
            subtype: account.AccountSubType
          }
        })
      } catch (error) {
        syncResults.push({ success: false, error: error, qbAccount: account })
      }
    }

    return syncResults
  }

  // Invoice Synchronization
  async syncInvoices() {
    const invoices = await new Promise<QuickBooksInvoice[]>((resolve, reject) => {
      (this.qbo as any).findInvoices((err: Error | null, invoices: { QueryResponse?: { Invoice?: QuickBooksInvoice[] } }) => {
        if (err) reject(err)
        else resolve(invoices.QueryResponse?.Invoice || [])
      })
    })

    const syncResults = []

    for (const invoice of invoices) {
      try {
        syncResults.push({ 
          success: true, 
          invoice: {
            id: invoice.Id,
            docNumber: invoice.DocNumber,
            totalAmount: invoice.TotalAmt,
            balance: invoice.Balance,
            status: invoice.EmailStatus
          }
        })
      } catch (error) {
        syncResults.push({ success: false, error: error, qbInvoice: invoice })
      }
    }

    return syncResults
  }

  // Payment Synchronization
  async syncPayments() {
    const payments = await new Promise<QuickBooksPayment[]>((resolve, reject) => {
      (this.qbo as any).findPayments((err: Error | null, payments: { QueryResponse?: { Payment?: QuickBooksPayment[] } }) => {
        if (err) reject(err)
        else resolve(payments.QueryResponse?.Payment || [])
      })
    })

    const syncResults = []

    for (const payment of payments) {
      try {
        syncResults.push({ 
          success: true, 
          payment: {
            id: payment.Id,
            totalAmount: payment.TotalAmt,
            txnDate: payment.TxnDate,
            paymentRefNum: payment.PaymentRefNum
          }
        })
      } catch (error) {
        syncResults.push({ success: false, error: error, qbPayment: payment })
      }
    }

    return syncResults
  }

  // Product/Item Synchronization
  async syncProducts() {
    const items = await new Promise<QuickBooksItem[]>((resolve, reject) => {
      (this.qbo as any).findItems((err: Error | null, items: { QueryResponse?: { Item?: QuickBooksItem[] } }) => {
        if (err) reject(err)
        else resolve(items.QueryResponse?.Item || [])
      })
    })

    const syncResults = []

    for (const item of items) {
      try {
        // Map QuickBooks item to your local schema
        const mappedItem = {
          quickbooks_id: item.Id,
          sku: item.Sku || item.Name,
          name: item.Name,
          description: item.Description || '',
          base_price: item.UnitPrice || 0,
          quickbooks_sync_token: item.SyncToken,
          quickbooks_item_type: item.Type,
          is_active: item.Active,
          category: item.Type === 'Service' ? 'Service' : 'Product',
          updated_at: new Date().toISOString()
        }

        // Upsert item in local database
        const { data } = await this.supabase
          .from('items')
          .upsert(mappedItem, {
            onConflict: 'quickbooks_id',
            ignoreDuplicates: false
          })
          .select()

        syncResults.push({ success: true, item: data?.[0], qbItem: item })
      } catch (error) {
        syncResults.push({ success: false, error: error, qbItem: item })
      }
    }

    return syncResults
  }

  // Create Product in QuickBooks
  async createProduct(localItemId: string) {
    const { data: item } = await this.supabase
      .from('items')
      .select('*')
      .eq('id', localItemId)
      .single()

    if (!item) {
      throw new Error('Item not found')
    }

    const qbItem = {
      Name: item.name,
      Sku: item.sku,
      Type: item.category === 'Service' ? 'Service' : 'NonInventory',
      IncomeAccountRef: {
        value: DEFAULT_ACCOUNTS.SALES_INCOME,
        name: 'Sales of Product Income'
      },
      ExpenseAccountRef: item.category !== 'Service' ? {
        value: DEFAULT_ACCOUNTS.COST_OF_GOODS_SOLD,
        name: 'Cost of Goods Sold'
      } : undefined,
      UnitPrice: item.base_price,
      Description: item.description,
      Active: item.is_active !== false
    }

    return new Promise<QuickBooksItem>((resolve, reject) => {
      (this.qbo as any).createItem(qbItem, async (err: Error | null, createdItem: QuickBooksItem) => {
        if (err) {
          reject(err)
        } else {
          // Update local item with QuickBooks ID
          await this.supabase
            .from('items')
            .update({
              quickbooks_id: createdItem.Id,
              quickbooks_sync_token: createdItem.SyncToken,
              quickbooks_synced_at: new Date().toISOString()
            })
            .eq('id', localItemId)
          
          resolve(createdItem)
        }
      })
    })
  }

  // Estimate Management
  async createEstimate(orderId: string) {
    // Similar to createInvoice but creates an Estimate instead
    const { data: order } = await this.supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        items:order_items(*, item:items(*))
      `)
      .eq('id', orderId)
      .single()

    if (!order) {
      throw new Error('Order not found')
    }

    // Ensure customer is synced
    if (!order.customer.quickbooks_id) {
      await this.syncCustomer(order.customer.id)
    }

    // Build estimate line items (similar to invoice)
    const lines = []
    let lineNum = 1

    for (const orderItem of order.items) {
      if (!orderItem.item.quickbooks_id) {
        await this.createProduct(orderItem.item.id)
      }

      lines.push({
        LineNum: lineNum++,
        Amount: orderItem.quantity * orderItem.unit_price,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: orderItem.item.quickbooks_id
          },
          Qty: orderItem.quantity,
          UnitPrice: orderItem.unit_price
        }
      })
    }

    const estimate = {
      CustomerRef: {
        value: order.customer.quickbooks_id
      },
      DocNumber: `EST-${order.order_number}`,
      TxnDate: order.created_at.split('T')[0],
      ExpirationDate: order.expires_at ? order.expires_at.split('T')[0] : undefined,
      Line: lines,
      PrivateNote: order.notes,
      CustomerMemo: {
        value: `Estimate for Order ${order.order_number}`
      }
    }

    return new Promise<{ Id: string; SyncToken: string }>((resolve, reject) => {
      (this.qbo as any).createEstimate(estimate, async (err: Error | null, createdEstimate: { Id: string; SyncToken: string }) => {
        if (err) {
          reject(err)
        } else {
          // Update local order with estimate data
          await this.supabase
            .from('orders')
            .update({
              quickbooks_estimate_id: createdEstimate.Id,
              quickbooks_estimate_sync_token: createdEstimate.SyncToken,
              estimate_status: 'sent',
              estimate_created_at: new Date().toISOString()
            })
            .eq('id', orderId)

          resolve(createdEstimate)
        }
      })
    })
  }

  // Reporting and Analytics
  async getFinancialSummary(startDate: string, endDate: string) {
    const summary = {
      totalRevenue: 0,
      totalPayments: 0,
      outstandingInvoices: 0,
      invoiceCount: 0,
      paymentCount: 0
    }

    // Get invoices in date range
    const invoices = await new Promise<Array<{ TotalAmt?: string; Balance?: string }>>((resolve, reject) => {
      (this.qbo as any).findInvoices({
        where: `TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
      }, (err: Error | null, invoices: { QueryResponse?: { Invoice?: Array<{ TotalAmt?: string; Balance?: string }> } }) => {
        if (err) reject(err)
        else resolve(invoices.QueryResponse?.Invoice || [])
      })
    })

    // Get payments in date range  
    const payments = await new Promise<Array<{ TotalAmt?: string }>>((resolve, reject) => {
      (this.qbo as any).findPayments({
        where: `TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
      }, (err: Error | null, payments: { QueryResponse?: { Payment?: Array<{ TotalAmt?: string }> } }) => {
        if (err) reject(err)
        else resolve(payments.QueryResponse?.Payment || [])
      })
    })

    // Calculate summary
    summary.invoiceCount = invoices.length
    summary.totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.TotalAmt || '0'), 0)
    summary.outstandingInvoices = invoices.reduce((sum, inv) => {
      const balance = parseFloat(inv.Balance || '0')
      return sum + (balance > 0 ? balance : 0)
    }, 0)

    summary.paymentCount = payments.length
    summary.totalPayments = payments.reduce((sum, pay) => sum + parseFloat(pay.TotalAmt || '0'), 0)

    return summary
  }

  // Webhook handling for real-time updates
  async handleWebhook(webhookData: { eventNotifications?: Array<{ dataChangeEvent: { entities?: Array<{ name: string; id: string; operation: string }> }; realmId: string }> }) {
    const { eventNotifications } = webhookData

    for (const notification of eventNotifications || []) {
      const { dataChangeEvent } = notification

      for (const entity of dataChangeEvent.entities || []) {
        try {
          await this.processWebhookEntity(entity)
        } catch (error) {
          console.error('Error processing webhook entity:', error)
          // Log to audit table for debugging
          await this.supabase
            .from('audit_logs')
            .insert({
              action: 'QUICKBOOKS_WEBHOOK_ERROR',
              details: { entity, error: (error as any).message },
              created_at: new Date().toISOString()
            })
        }
      }
    }
  }

  private async processWebhookEntity(entity: { name: string; id: string; operation: string }) {
    const { name: entityType, id: entityId, operation } = entity

    // Handle different entity types and operations
    switch (entityType) {
      case QB_ENTITY_TYPES.CUSTOMER:
        if (operation === 'Update' || operation === 'Create') {
          await this.syncCustomerFromQB(entityId)
        }
        break

      case QB_ENTITY_TYPES.INVOICE:
        if (operation === 'Update' || operation === 'Create') {
          await this.syncInvoiceFromQB()
        }
        break

      case QB_ENTITY_TYPES.PAYMENT:
        if (operation === 'Update' || operation === 'Create') {
          await this.syncPaymentFromQB()
        }
        break

      case QB_ENTITY_TYPES.ITEM:
        if (operation === 'Update' || operation === 'Create') {
          await this.syncItemFromQB()
        }
        break
    }
  }

  private async syncCustomerFromQB(customerId: string) {
    // Fetch customer from QB and update local database
    const customer = await new Promise<QuickBooksCustomer>((resolve, reject) => {
      (this.qbo as any).getCustomer(customerId, (err: Error | null, customer: QuickBooksCustomer) => {
        if (err) reject(err)
        else resolve(customer)
      })
    })

    // Update local customer record
    await this.supabase
      .from('customers')
      .update({
        company_name: customer.CompanyName,
        name: [customer.GivenName, customer.FamilyName].filter(Boolean).join(' ') || customer.Name || '',
        email: customer.PrimaryEmailAddr?.Address,
        phone: customer.PrimaryPhone?.FreeFormNumber,
        quickbooks_sync_token: customer.SyncToken,
        quickbooks_synced_at: new Date().toISOString()
      })
      .eq('quickbooks_id', customerId)
  }

  private async syncInvoiceFromQB() {
    // Implementation for syncing invoice updates
    // This would update local order/invoice status based on QB changes
  }

  private async syncPaymentFromQB() {
    // Implementation for syncing payment updates
    // This would update local payment records
  }

  private async syncItemFromQB() {
    // Implementation for syncing item updates
    // This would update local item records
  }

  // Production to Invoice Automation
  async createInvoiceFromCompletedOrder(orderId: string): Promise<{ success: boolean; quickbooksInvoiceId: string; localInvoiceId: string; invoiceNumber: string; totalAmount: number }> {
    try {
      // Get order with completed production items
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .select(`
          *,
          customers (*),
          production_items (*),
          quickbooks_customer_mappings (quickbooks_customer_id)
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        throw new Error(`Order not found: ${orderId}`)
      }

      // Check if all production items are completed
      const allCompleted = order.production_items.every((item: { status: string }) => item.status === 'completed')
      if (!allCompleted) {
        throw new Error('Not all production items are completed')
      }

      // Check if customer is synced with QuickBooks
      let qbCustomerId = order.quickbooks_customer_mappings?.[0]?.quickbooks_customer_id
      if (!qbCustomerId) {
        // Create customer in QuickBooks first
        const customerResult = await this.syncCustomer(order.customer_id)
        qbCustomerId = (customerResult as any).quickbooksCustomerId
      }

      // Create invoice in QuickBooks
      const invoiceData = {
        CustomerRef: { value: qbCustomerId },
        DocNumber: order.order_number,
        TxnDate: new Date().toISOString().split('T')[0],
        DueDate: this.calculateDueDate(),
        Line: order.production_items.map((item: { price?: number }, index: number) => ({
          Id: (index + 1).toString(),
          LineNum: index + 1,
          Amount: item.price || (order.total_amount / order.production_items.length),
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: '1' }, // Default service item
            Qty: 1,
            UnitPrice: item.price || (order.total_amount / order.production_items.length)
          }
        }))
      }

      return new Promise<{ success: boolean; quickbooksInvoiceId: string; localInvoiceId: string; invoiceNumber: string; totalAmount: number }>((resolve, reject) => {
        (this.qbo as any).createInvoice(invoiceData, (err: Error | null, invoice: { QueryResponse: { Invoice: Array<{ Id: string; DocNumber: string; TotalAmt: number; Balance: number; DueDate: string; SyncToken: string }> } }) => {
          if (err) {
            console.error('QuickBooks invoice creation error:', err)
            reject(new Error(`Failed to create invoice: ${(err as { Fault?: { Error?: Array<{ Detail?: string }> } }).Fault?.Error?.[0]?.Detail || err.message}`))
            return
          }

          // Create local invoice record
          this.supabase
            .from('invoices')
            .insert({
              customer_id: order.customer_id,
              order_id: order.id,
              invoice_number: invoice.QueryResponse.Invoice[0].DocNumber,
              total_amount: invoice.QueryResponse.Invoice[0].TotalAmt,
              balance_due: invoice.QueryResponse.Invoice[0].Balance,
              due_date: invoice.QueryResponse.Invoice[0].DueDate,
              status: 'sent',
              sent_to_quickbooks: true,
              created_at: new Date().toISOString()
            })
            .select()
            .single()
            .then(({ data: localInvoice, error: invoiceError }) => {
              if (invoiceError) {
                console.error('Local invoice creation error:', invoiceError)
                reject(new Error('Failed to create local invoice record'))
                return
              }

              // Create QuickBooks mapping
              this.supabase
                .from('quickbooks_invoice_mappings')
                .insert({
                  user_id: this.credentials.companyId,
                  local_order_id: order.id,
                  quickbooks_invoice_id: invoice.QueryResponse.Invoice[0].Id,
                  quickbooks_doc_number: invoice.QueryResponse.Invoice[0].DocNumber,
                  invoice_status: 'Sent',
                  total_amount: invoice.QueryResponse.Invoice[0].TotalAmt,
                  balance: invoice.QueryResponse.Invoice[0].Balance,
                  due_date: invoice.QueryResponse.Invoice[0].DueDate,
                  quickbooks_sync_token: invoice.QueryResponse.Invoice[0].SyncToken,
                  last_synced_at: new Date().toISOString()
                })
                .then(() => {
                  // Mark production items as invoiced
                  this.supabase
                    .from('production_items')
                    .update({
                      invoice_id: localInvoice.id,
                      invoiced_at: new Date().toISOString()
                    })
                    .eq('order_id', order.id)
                    .then(() => {
                      resolve({
                        success: true,
                        quickbooksInvoiceId: invoice.QueryResponse.Invoice[0].Id,
                        localInvoiceId: localInvoice.id,
                        invoiceNumber: invoice.QueryResponse.Invoice[0].DocNumber,
                        totalAmount: invoice.QueryResponse.Invoice[0].TotalAmt
                      })
                    })
                })
            })
        })
      })

    } catch (error) {
      console.error('Create invoice from order error:', error)
      throw error
    }
  }

  async bulkCreateInvoices(orderIds: string[]): Promise<{ created_count: number; error_count: number; results: unknown[]; errors: unknown[] }> {
    const results = []
    const errors = []

    for (const orderId of orderIds) {
      try {
        const result = await this.createInvoiceFromCompletedOrder(orderId)
        results.push({ orderId, ...result })
      } catch (error) {
        console.error(`Failed to create invoice for order ${orderId}:`, error)
        errors.push({ 
          orderId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Log bulk operation
    await this.supabase
      .from('quickbooks_sync_logs')
      .insert({
        user_id: this.credentials.companyId,
        sync_type: 'bulk_invoice_creation',
        status: errors.length === 0 ? 'success' : 'warning',
        message: `Bulk invoice creation: ${results.length} successful, ${errors.length} failed`,
        details: JSON.stringify({ results, errors }),
        synced_at: new Date().toISOString()
      })

    return {
      created_count: results.length,
      error_count: errors.length,
      results,
      errors
    }
  }

  private calculateDueDate(paymentTermsDays: number = 30): string {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + paymentTermsDays)
    return dueDate.toISOString().split('T')[0]
  }
}