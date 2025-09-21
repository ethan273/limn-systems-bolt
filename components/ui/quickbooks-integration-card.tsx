'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, AlertCircle, CheckCircle, RefreshCw, Unlink, ExternalLink } from 'lucide-react'

interface QuickBooksConnection {
  id: string
  company_id: string
  company_name: string
  environment: 'sandbox' | 'production'
  connected_at: string
  last_sync_at: string | null
  is_active: boolean
  company_info: unknown
}

interface SyncStats {
  customers: number
  invoices: number
  payments: number
  items: number
  lastSync: string | null
}

export function QuickBooksIntegrationCard() {
  const [connection, setConnection] = useState<QuickBooksConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [syncStats, setSyncStats] = useState<SyncStats>({
    customers: 0,
    invoices: 0,
    payments: 0,
    items: 0,
    lastSync: null
  })

  useEffect(() => {
    fetchConnectionStatus()
    
    // Check for OAuth callback success/error in URL
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('qb_success') === 'connected') {
      setSuccess('Successfully connected to QuickBooks!')
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (urlParams.get('qb_error')) {
      const errorCode = urlParams.get('qb_error')
      let errorMessage = 'Failed to connect to QuickBooks'
      
      switch (errorCode) {
        case 'invalid_callback':
          errorMessage = 'Invalid callback from QuickBooks. Please try again.'
          break
        case 'invalid_state':
          errorMessage = 'Invalid security state. Please try connecting again.'
          break
        case 'expired_state':
          errorMessage = 'Connection request expired. Please try again.'
          break
        case 'token_exchange_failed':
          errorMessage = 'Failed to obtain access tokens from QuickBooks.'
          break
        case 'connection_storage_failed':
          errorMessage = 'Failed to save connection details. Please try again.'
          break
        case 'callback_failed':
          errorMessage = 'Connection callback failed. Please try again.'
          break
      }
      
      setError(errorMessage)
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const fetchConnectionStatus = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Fetch connection details
      const { data: connectionData, error: connectionError } = await supabase
        .from('quickbooks_connections')
        .select('*')
        .single()

      if (connectionError && connectionError.code !== 'PGRST116') {
        console.info('QuickBooks connection not found - please run the database migration:', connectionError.message)
        return
      }

      if (connectionData) {
        setConnection(connectionData)
        
        // Fetch sync statistics
        const { data: customerMappings } = await supabase
          .from('quickbooks_customer_mappings')
          .select('id')
        
        const { data: invoiceMappings } = await supabase
          .from('quickbooks_invoice_mappings')
          .select('id')
        
        const { data: paymentMappings } = await supabase
          .from('quickbooks_payment_mappings')
          .select('id')
        
        const { data: itemMappings } = await supabase
          .from('quickbooks_item_mappings')
          .select('id')

        setSyncStats({
          customers: customerMappings?.length || 0,
          invoices: invoiceMappings?.length || 0,
          payments: paymentMappings?.length || 0,
          items: itemMappings?.length || 0,
          lastSync: connectionData.last_sync_at
        })
      }
    } catch (err) {
      console.error('Error fetching connection status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setConnecting(true)
      setError('')
      
      const response = await fetch('/api/quickbooks/connect')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate connection')
      }
      
      // Redirect to QuickBooks authorization
      window.location.href = data.authUrl
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to connect to QuickBooks')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect QuickBooks? This will remove all sync mappings.')) {
      return
    }

    try {
      setDisconnecting(true)
      setError('')
      
      const response = await fetch('/api/quickbooks/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disconnect: true })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect')
      }
      
      setConnection(null)
      setSyncStats({ customers: 0, invoices: 0, payments: 0, items: 0, lastSync: null })
      setSuccess('Successfully disconnected from QuickBooks')
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to disconnect from QuickBooks')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError('')
      
      const response = await fetch('/api/quickbooks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'full' })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }
      
      setSuccess('Sync initiated successfully')
      await fetchConnectionStatus() // Refresh stats
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to sync with QuickBooks')
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          QuickBooks Integration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-green-800 text-sm">{success}</div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
            <div className="text-graphite text-sm">Loading QuickBooks connection...</div>
          </div>
        ) : connection ? (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <Badge variant="outline" className={connection.environment === 'sandbox' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                    {connection.environment === 'sandbox' ? 'Sandbox' : 'Production'}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-heading">{connection.company_name}</div>
                <div className="text-xs text-graphite">Connected {formatDate(connection.connected_at)}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                >
                  <Unlink className="h-3 w-3" />
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            </div>

            {/* Sync Statistics */}
            <div>
              <div className="text-sm font-medium text-heading mb-3">Sync Statistics</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-stone-50 rounded-md">
                  <div className="text-lg font-semibold text-heading">{syncStats.customers}</div>
                  <div className="text-xs text-graphite">Customers</div>
                </div>
                <div className="text-center p-3 bg-stone-50 rounded-md">
                  <div className="text-lg font-semibold text-heading">{syncStats.invoices}</div>
                  <div className="text-xs text-graphite">Invoices</div>
                </div>
                <div className="text-center p-3 bg-stone-50 rounded-md">
                  <div className="text-lg font-semibold text-heading">{syncStats.payments}</div>
                  <div className="text-xs text-graphite">Payments</div>
                </div>
                <div className="text-center p-3 bg-stone-50 rounded-md">
                  <div className="text-lg font-semibold text-heading">{syncStats.items}</div>
                  <div className="text-xs text-graphite">Products</div>
                </div>
              </div>
              {syncStats.lastSync && (
                <div className="text-xs text-graphite mt-2 text-center">
                  Last sync: {formatDate(syncStats.lastSync)}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <div className="text-sm font-medium text-heading mb-3">Quick Actions</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => window.open(`https://${connection.environment === 'sandbox' ? 'sandbox-' : ''}qbo.intuit.com/app/homepage`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open QuickBooks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => {/* Navigate to finance dashboard */}}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  View Reports
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-stone-300 mx-auto mb-4" />
            <div className="text-heading font-medium mb-2">Connect to QuickBooks</div>
            <div className="text-sm text-graphite mb-4">
              Sync customers, invoices, and payments with your QuickBooks account
            </div>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  Connect QuickBooks
                </>
              )}
            </Button>
            <div className="text-xs text-graphite mt-2">
              You&apos;ll be redirected to QuickBooks to authorize the connection
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}