import OAuthClient from 'intuit-oauth'

export function getQuickBooksClient() {
  if (!process.env.QUICKBOOKS_CLIENT_ID || !process.env.QUICKBOOKS_CLIENT_SECRET) {
    throw new Error('QuickBooks credentials not configured. Please set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET environment variables.')
  }

  return new OAuthClient({
    clientId: process.env.QUICKBOOKS_CLIENT_ID,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
    environment: (process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/quickbooks/callback`,
    logging: process.env.NODE_ENV === 'development'
  })
}

// Updated scopes with correct format for comprehensive access
export const QUICKBOOKS_SCOPES = [
  'com.intuit.quickbooks.accounting',  // Full accounting access
  'com.intuit.quickbooks.payment',     // Payment processing
  'openid',                            // OpenID for authentication
  'profile',                           // User profile info
  'email',                            // Email address
  'phone',                            // Phone (optional)
  'address'                           // Address (optional)
]

// QuickBooks API endpoints
export const QB_API_BASE = {
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  production: 'https://quickbooks.api.intuit.com'
}

export const QB_DISCOVERY_DOCUMENT = {
  sandbox: 'https://appcenter.intuit.com/api/v1/OpenID_2014/discovery_doc_user_sandbox',
  production: 'https://appcenter.intuit.com/api/v1/OpenID_2014/discovery_doc_user_production'
}

// Default Chart of Accounts mappings
export const DEFAULT_ACCOUNTS = {
  SALES_INCOME: '79', // Sales of Product Income
  COST_OF_GOODS_SOLD: '80', // Cost of Goods Sold
  ACCOUNTS_RECEIVABLE: '84', // Accounts Receivable (A/R)
  CASH: '35', // Checking Account
  SALES_TAX_PAYABLE: '89' // Sales Tax Payable
} as const

// QuickBooks entity types
export const QB_ENTITY_TYPES = {
  CUSTOMER: 'Customer',
  ITEM: 'Item', 
  INVOICE: 'Invoice',
  PAYMENT: 'Payment',
  ESTIMATE: 'Estimate',
  PURCHASE_ORDER: 'PurchaseOrder',
  BILL: 'Bill'
} as const