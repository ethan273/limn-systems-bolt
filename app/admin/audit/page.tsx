'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Filter, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface AuditLog {
  id: string
  user_id: string
  user_email: string
  action: string
  resource_type: string
  resource_id?: string
  details: string
  ip_address: string
  user_agent: string
  created_at: string
  status: 'success' | 'warning' | 'error'
}

export default function AdminAuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'warning' | 'error'>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    loadAuditLogs()
  }, [])

  const loadAuditLogs = async () => {
    try {
      // Since audit_logs table doesn't exist yet, show empty state with helpful message
      // In the future, this would query the audit_logs table
      console.log('Audit logs feature not yet implemented - audit_logs table needs to be created')
      
      // Set empty array instead of mock data
      setAuditLogs([])
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      setError('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = filter === 'all' 
    ? auditLogs 
    : auditLogs.filter(log => log.status === filter)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
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

  const handleExport = () => {
    // In a real implementation, this would export the audit logs
    alert('Audit logs export functionality would be implemented here')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const successCount = auditLogs.filter(log => log.status === 'success').length
  const warningCount = auditLogs.filter(log => log.status === 'warning').length
  const errorCount = auditLogs.filter(log => log.status === 'error').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-700 mt-2">Monitor system activity and user actions</p>
        </div>
        
        <Button onClick={handleExport} className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export Logs</span>
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-700">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{auditLogs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-700">Success</p>
                <p className="text-2xl font-bold text-gray-900">{successCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-700">Warnings</p>
                <p className="text-2xl font-bold text-gray-900">{warningCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-700">Errors</p>
                <p className="text-2xl font-bold text-gray-900">{errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <Filter className="w-5 h-5 text-gray-700" />
        <div className="flex space-x-2">
          {(['all', 'success', 'warning', 'error'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Audit Events 
            {filter !== 'all' && (
              <span className="ml-2 text-sm font-normal text-gray-700">
                (filtered by {filter})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(log.status)}
                      <span className={getStatusBadge(log.status)}>
                        {log.status}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{log.user_email}</div>
                      <div className="text-sm text-gray-700">{log.ip_address}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {log.action}
                    </code>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium">{log.resource_type}</div>
                      {log.resource_id && (
                        <div className="text-sm text-gray-700">{log.resource_id}</div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="max-w-xs">
                    <div className="text-sm text-gray-900 truncate" title={log.details}>
                      {log.details}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-sm text-gray-700">
                    {formatDate(log.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}