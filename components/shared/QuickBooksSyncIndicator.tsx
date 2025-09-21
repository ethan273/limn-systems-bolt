'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  WifiOff,
  Activity
} from 'lucide-react'

interface SyncStatus {
  isConnected: boolean
  lastSyncAt: string | null
  pendingOperations: number
  syncInProgress: boolean
  connectionStatus: 'connected' | 'disconnected' | 'error'
  companyName: string | null
  environment: 'sandbox' | 'production'
  queuedItems: {
    customers: number
    invoices: number
    payments: number
    items: number
  }
  recentLogs: Array<{
    id: string
    sync_type: string
    status: string
    message: string
    synced_at: string
  }>
}

interface QuickBooksSyncIndicatorProps {
  showDetails?: boolean
  size?: 'small' | 'medium' | 'large'
  autoRefresh?: boolean
  refreshInterval?: number
}

export function QuickBooksSyncIndicator({ 
  showDetails = false, 
  size = 'medium',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: QuickBooksSyncIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSyncAt: null,
    pendingOperations: 0,
    syncInProgress: false,
    connectionStatus: 'disconnected',
    companyName: null,
    environment: 'sandbox',
    queuedItems: {
      customers: 0,
      invoices: 0,
      payments: 0,
      items: 0
    },
    recentLogs: []
  })
  const [loading, setLoading] = useState(true)
  const [manualSyncing, setManualSyncing] = useState(false)

  useEffect(() => {
    fetchSyncStatus()
    
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchSyncStatus, refreshInterval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const fetchSyncStatus = async () => {
    try {
      const supabase = createClient()
      
      // Get QuickBooks connection status
      const { data: connection, error: connectionError } = await supabase
        .from('quickbooks_connections')
        .select('*')
        .single()

      if (connectionError && connectionError.code !== 'PGRST116') {
        // Check if the error is due to missing table
        if (connectionError.code === '42P01' || 
            connectionError.message?.includes('does not exist') ||
            connectionError.message?.includes('relation') ||
            connectionError.hint?.includes('does not exist')) {
          console.info('QuickBooks connections table not found - please run the database migration')
        } else {
          console.info('QuickBooks not yet configured:', connectionError.message || 'Unknown error')
        }
      }

      const status: SyncStatus = {
        isConnected: false,
        lastSyncAt: null,
        pendingOperations: 0,
        syncInProgress: false,
        connectionStatus: 'disconnected',
        companyName: null,
        environment: 'sandbox',
        queuedItems: {
          customers: 0,
          invoices: 0,
          payments: 0,
          items: 0
        },
        recentLogs: []
      }

      if (connection && connection.is_active) {
        status.isConnected = true
        status.connectionStatus = 'connected'
        status.companyName = connection.company_name
        status.environment = connection.environment
        status.lastSyncAt = connection.last_sync_at

        // Get pending sync operations
        const { data: queueData } = await supabase
          .from('quickbooks_sync_queue')
          .select('entity_type, status')
          .in('status', ['pending', 'processing'])

        if (queueData) {
          status.pendingOperations = queueData.length
          status.syncInProgress = queueData.some(item => item.status === 'processing')
          
          // Count by entity type
          status.queuedItems = queueData.reduce((acc, item) => {
            const entityType = item.entity_type as keyof typeof acc
            if (entityType in acc) {
              acc[entityType] += 1
            }
            return acc
          }, {
            customers: 0,
            invoices: 0,
            payments: 0,
            items: 0
          })
        }

        // Get recent sync logs
        const { data: logs } = await supabase
          .from('quickbooks_sync_logs')
          .select('id, sync_type, status, message, synced_at')
          .order('synced_at', { ascending: false })
          .limit(5)

        if (logs) {
          status.recentLogs = logs
        }
      }

      setSyncStatus(status)
    } catch (error) {
      console.info('Sync status not available:', error instanceof Error ? error.message : 'Unknown error')
      setSyncStatus(prev => ({ 
        ...prev, 
        connectionStatus: 'disconnected' 
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    try {
      setManualSyncing(true)

      const response = await fetch('/api/quickbooks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'full' })
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      // Refresh status after sync
      setTimeout(fetchSyncStatus, 2000)

    } catch (error) {
      console.info('Manual sync not available:', error instanceof Error ? error.message : 'Sync endpoint not configured')
    } finally {
      setManualSyncing(false)
    }
  }

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never'
    
    const now = new Date()
    const syncTime = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getStatusIcon = () => {
    if (loading) return <Clock className="h-4 w-4 animate-pulse text-stone-400" />
    if (syncStatus.syncInProgress || manualSyncing) return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
    if (syncStatus.connectionStatus === 'error') return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (syncStatus.connectionStatus === 'disconnected') return <WifiOff className="h-4 w-4 text-stone-400" />
    if (syncStatus.pendingOperations > 0) return <Activity className="h-4 w-4 text-amber-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getStatusColor = () => {
    if (loading) return 'bg-stone-50 text-stone-700 border-stone-200'
    if (syncStatus.syncInProgress || manualSyncing) return 'bg-blue-50 text-blue-700 border-blue-200'
    if (syncStatus.connectionStatus === 'error') return 'bg-red-50 text-red-700 border-red-200'
    if (syncStatus.connectionStatus === 'disconnected') return 'bg-stone-50 text-stone-700 border-stone-200'
    if (syncStatus.pendingOperations > 0) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-green-50 text-green-700 border-green-200'
  }

  const getStatusText = () => {
    if (loading) return 'Loading...'
    if (manualSyncing) return 'Syncing...'
    if (syncStatus.syncInProgress) return 'Sync in progress'
    if (syncStatus.connectionStatus === 'error') return 'Connection error'
    if (syncStatus.connectionStatus === 'disconnected') return 'Not connected'
    if (syncStatus.pendingOperations > 0) return `${syncStatus.pendingOperations} pending`
    return 'Up to date'
  }

  if (size === 'small') {
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="text-sm text-graphite">
          QB {syncStatus.lastSyncAt ? formatTimeAgo(syncStatus.lastSyncAt) : 'Never'}
        </span>
      </div>
    )
  }

  if (size === 'medium' && !showDetails) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`${getStatusColor()} flex items-center gap-1`}>
          {getStatusIcon()}
          <span>QB {getStatusText()}</span>
        </Badge>
        {syncStatus.isConnected && !syncStatus.syncInProgress && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualSync}
            disabled={manualSyncing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${manualSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <div className="font-medium text-sm">
                QuickBooks {syncStatus.isConnected ? 'Connected' : 'Disconnected'}
              </div>
              {syncStatus.companyName && (
                <div className="text-xs text-graphite">
                  {syncStatus.companyName} ({syncStatus.environment})
                </div>
              )}
            </div>
          </div>
          
          <Badge variant="outline" className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        {syncStatus.isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={manualSyncing || syncStatus.syncInProgress}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${(manualSyncing || syncStatus.syncInProgress) ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        )}
      </div>

      {/* Last Sync Time */}
      <div className="text-xs text-graphite flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Last sync: {formatTimeAgo(syncStatus.lastSyncAt)}
      </div>

      {/* Pending Operations */}
      {syncStatus.pendingOperations > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-heading">Pending Operations</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(syncStatus.queuedItems).map(([type, count]) => (
              count > 0 && (
                <div key={type} className="flex justify-between text-xs">
                  <span className="capitalize text-graphite">{type}</span>
                  <span className="font-medium">{count}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {showDetails && (syncStatus.recentLogs || []).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-heading flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Recent Activity
          </div>
          <div className="space-y-1">
            {(syncStatus.recentLogs || []).map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    log.status === 'success' ? 'bg-green-500' :
                    log.status === 'error' ? 'bg-red-500' :
                    log.status === 'warning' ? 'bg-amber-500' :
                    'bg-stone-300'
                  }`} />
                  <span className="text-graphite truncate max-w-32" title={log.message}>
                    {log.message}
                  </span>
                </div>
                <span className="text-stone-400">
                  {formatTimeAgo(log.synced_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}