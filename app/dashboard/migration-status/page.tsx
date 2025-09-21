'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface TableStatus {
  exists: boolean
  count: number
  sample: unknown[]
  error?: string
  additional?: boolean
}

interface DatabaseSchema {
  expectedTables: string[]
  tableStatus: Record<string, TableStatus>
  tableStructure: Record<string, string[]>
  summary: {
    totalTablesExpected: number
    tablesFound: number
    tablesMissing: number
    totalRecords: number
  }
  timestamp: string
  user: string
}

export default function MigrationStatusPage() {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDatabaseSchema()
  }, [])

  const fetchDatabaseSchema = async () => {
    try {
      setLoading(true)
      console.log('Migration Status: Fetching database schema...')
      
      const response = await fetch('/api/database-schema', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()
      console.log('Migration Status: API response:', data)

      if (!response.ok) {
        setError(data.error || 'Failed to fetch database schema')
        console.error('Migration Status: API error:', data)
      } else {
        setSchema(data)
        setError('')
        console.log('Migration Status: Successfully loaded schema data')
      }
    } catch (error) {
      setError('Failed to connect to API')
      console.error('Migration Status: Connection error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTableStatusColor = (table: TableStatus) => {
    if (!table.exists) return 'bg-red-100 text-red-700'
    if (table.count === 0) return 'bg-amber-100 text-amber-700'
    return 'bg-primary/10 text-primary'
  }

  const getTableStatusText = (table: TableStatus) => {
    if (!table.exists) return 'Missing'
    if (table.count === 0) return 'Empty'
    return 'Active'
  }

  const getMigrationProgress = () => {
    if (!schema) return { percentage: 0, status: 'Unknown' }
    
    const { tablesFound, totalTablesExpected, totalRecords } = schema.summary
    const percentage = Math.round((tablesFound / totalTablesExpected) * 100)
    
    let status = 'Not Started'
    if (percentage === 0) status = 'Not Started'
    else if (percentage < 50) status = 'In Progress - Early'
    else if (percentage < 100) status = 'In Progress - Advanced'
    else if (totalRecords === 0) status = 'Tables Created - No Data'
    else status = 'Complete'

    return { percentage, status }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const migrationProgress = getMigrationProgress()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Migration Status</h1>
          <p className="text-slate-900 mt-1">Monday.com to Supabase database migration progress</p>
        </div>
        <Button onClick={fetchDatabaseSchema} disabled={loading} variant="outline">
          {loading ? 'Checking...' : 'Refresh Status'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <div className="text-slate-900">Checking database schema...</div>
        </div>
      )}

      {schema && (
        <>
          {/* Migration Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-900">Migration Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {migrationProgress.percentage}%
                </div>
                <div className="text-sm text-primary">{migrationProgress.status}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-900">Tables Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {schema.summary.tablesFound} / {schema.summary.totalTablesExpected}
                </div>
                <div className="text-sm text-slate-900">Expected Monday.com tables</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-900">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {schema.summary.totalRecords.toLocaleString()}
                </div>
                <div className="text-sm text-slate-900">Across all tables</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-900">Last Checked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold text-slate-900 mb-1">
                  {formatDate(schema.timestamp)}
                </div>
                <div className="text-xs text-slate-900">User: {schema.user}</div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <Card>
            <CardHeader>
              <CardTitle>Migration Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Database Migration</span>
                    <span>{migrationProgress.percentage}% Complete</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${migrationProgress.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-slate-900">
                  Status: {migrationProgress.status}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Status */}
          <Card>
            <CardHeader>
              <CardTitle>Monday.com Tables Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Record Count</TableHead>
                    <TableHead>Structure</TableHead>
                    <TableHead>Sample Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(schema.expectedTables || []).map((tableName) => {
                    const table = schema.tableStatus[tableName]
                    const structure = schema.tableStructure[tableName] || []
                    
                    return (
                      <TableRow key={tableName}>
                        <TableCell className="font-medium">
                          {tableName}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getTableStatusColor(table)}`}>
                            {getTableStatusText(table)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {table.exists ? table.count.toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          {structure.length > 0 ? (
                            <div className="text-xs font-mono max-w-xs truncate" title={structure.join(', ')}>
                              {structure.slice(0, 3).join(', ')}
                              {structure.length > 3 && ` +${structure.length - 3} more`}
                            </div>
                          ) : (
                            <span className="text-slate-900">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {table.exists && (table.sample || []).length > 0 ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => console.log(`${tableName} sample:`, table.sample)}
                            >
                              View Sample
                            </Button>
                          ) : (
                            <span className="text-slate-900">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Additional Tables Found */}
          {Object.entries(schema.tableStatus).filter(([, table]) => table.additional).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Tables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(schema.tableStatus)
                    .filter(([, table]) => table.additional)
                    .map(([tableName, table]) => (
                      <div key={tableName} className="flex items-center justify-between p-3 border border-stone-200 rounded-md">
                        <div>
                          <div className="font-medium text-slate-900">{tableName}</div>
                          <div className="text-sm text-slate-900">
                            {table.count.toLocaleString()} records
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getTableStatusColor(table)}`}>
                          {getTableStatusText(table)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Migration Recommendations */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-800">Next Steps & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schema.summary.tablesMissing > 0 && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Missing Tables ({schema.summary.tablesMissing})</h3>
                    <div className="text-sm text-slate-900 mb-3">
                      These Monday.com tables haven&apos;t been migrated yet:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {schema.expectedTables
                        .filter(tableName => !schema.tableStatus[tableName]?.exists)
                        .map(tableName => (
                          <span key={tableName} className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-sm">
                            {tableName}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {schema.summary.totalRecords === 0 && schema.summary.tablesFound > 0 && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Tables Created But No Data</h3>
                    <div className="text-sm text-slate-900">
                      Database structure exists but no records have been migrated from Monday.com yet.
                    </div>
                  </div>
                )}

                {migrationProgress.percentage === 100 && schema.summary.totalRecords > 0 && (
                  <div>
                    <h3 className="font-medium text-primary mb-2">Migration Complete! 🎉</h3>
                    <div className="text-sm text-slate-900">
                      All expected tables are present with data. You can now use the full application functionality.
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}