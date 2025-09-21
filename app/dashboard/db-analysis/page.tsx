'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { hasProperty, safeGet, safeArrayAccess } from '@/lib/utils/bulk-type-fixes'

export default function DatabaseAnalysisPage() {
  const [analysis, setAnalysis] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnalysis()
  }, [])

  const fetchAnalysis = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analyze-structure', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to analyze database')
      } else {
        setAnalysis(data)
        setError('')
        console.log('Database analysis:', data)
      }
    } catch (err) {
      setError('Failed to connect to API')
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <div className="text-slate-900">Analyzing database structure...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800 text-sm">
          <strong>Error:</strong> {error}
        </div>
        <Button onClick={fetchAnalysis} className="mt-4">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Database Analysis</h1>
        <p className="text-slate-900 mt-1">Current database structure and sample data</p>
      </div>

      {hasProperty(analysis, 'collections') && (
        <>
          {/* Collections */}
          <Card>
            <CardHeader>
              <CardTitle>Collections Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Exists:</strong> {safeGet<boolean>(analysis, ['collections', 'exists']) ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <strong>Records:</strong> {safeGet<number>(analysis, ['collections', 'count']) || 0}
                  </div>
                </div>
                
                <div>
                  <strong>Columns:</strong>
                  <div className="bg-stone-50 p-2 rounded-md mt-1">
                    <code className="text-sm">
                      {safeArrayAccess<string>(safeGet(analysis, ['collections', 'columns'])).join(', ')}
                    </code>
                  </div>
                </div>

                {safeGet(analysis, ['collections', 'sampleRow']) ? (
                  <div>
                    <strong>Sample Data:</strong>
                    <pre className="bg-stone-50 p-4 rounded-md mt-1 text-sm overflow-x-auto">
                      {JSON.stringify(safeGet(analysis, ['collections', 'sampleRow']), null, 2)}
                    </pre>
                  </div>
                ) : null}

                {safeArrayAccess(safeGet(analysis, ['collections', 'data'])).length > 0 && (
                  <div>
                    <strong>All Collections:</strong>
                    <div className="grid gap-2 mt-2">
                      {safeArrayAccess(safeGet(analysis, ['collections', 'data'])).map((collection: unknown, index: number) => {
                        return (
                        <div key={index} className="bg-stone-50 p-3 rounded-md">
                          <div className="font-medium">{safeGet<string>(collection, ['name']) || 'Unnamed Collection'}</div>
                          {safeGet<string>(collection, ['description']) && (
                            <div className="text-sm text-slate-900">{safeGet<string>(collection, ['description'])}</div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Exists:</strong> {safeGet<boolean>(analysis, ['items', 'exists']) ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <strong>Records:</strong> {safeGet<number>(analysis, ['items', 'count']) || 0}
                  </div>
                </div>
                
                <div>
                  <strong>Columns:</strong>
                  <div className="bg-stone-50 p-2 rounded-md mt-1">
                    <code className="text-sm">
                      {safeArrayAccess<string>(safeGet(analysis, ['items', 'columns'])).join(', ')}
                    </code>
                  </div>
                </div>

                {safeGet(analysis, ['items', 'sampleRow']) ? (
                  <div>
                    <strong>Sample Item:</strong>
                    <pre className="bg-stone-50 p-4 rounded-md mt-1 text-sm overflow-x-auto">
                      {JSON.stringify(safeGet(analysis, ['items', 'sampleRow']), null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Related Tables */}
          <Card>
            <CardHeader>
              <CardTitle>Related Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(safeGet<Record<string, unknown>>(analysis, ['relatedTables']) || {}).map(([tableName, tableInfo]: [string, unknown]) => (
                  <div key={tableName} className="border border-stone-200 rounded-md p-4">
                    <div className="font-medium text-slate-900 mb-2">{tableName}</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Exists:</strong> {safeGet<boolean>(tableInfo, ['exists']) ? 'Yes' : 'No'}
                      </div>
                      <div>
                        <strong>Records:</strong> {safeArrayAccess(safeGet(tableInfo, ['data'])).length || 0}
                      </div>
                    </div>
                    
                    {safeArrayAccess(safeGet(tableInfo, ['columns'])).length > 0 && (
                      <div className="mt-2">
                        <strong>Columns:</strong>
                        <div className="bg-stone-50 p-2 rounded-md mt-1">
                          <code className="text-xs">
                            {safeArrayAccess<string>(safeGet(tableInfo, ['columns'])).join(', ')}
                          </code>
                        </div>
                      </div>
                    )}

                    {safeGet<string>(tableInfo, ['error']) && (
                      <div className="text-red-600 text-sm mt-2">
                        Error: {safeGet<string>(tableInfo, ['error'])}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>      )}
    </div>
  )
}