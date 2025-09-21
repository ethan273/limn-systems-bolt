'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Type definition for seed data result
interface SeedDataResult {
  data?: {
    collections?: {
      count: number
      names?: string[]
    }
    tasks?: {
      count: number
      titles?: string[]
    }
    items?: {
      count: number
      names?: string[]
    }
  }
  error?: string
  success?: boolean
}

export default function SeedTestDataPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SeedDataResult | null>(null)
  const [error, setError] = useState('')

  const handleSeedData = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      console.log('Seeding test data...')
      
      const response = await fetch('/api/seed-data', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to seed data')
        console.error('Seed data error:', data)
      } else {
        setResult(data)
        console.log('Seed data success:', data)
      }
    } catch (err) {
      setError('Failed to seed data')
      console.error('Seed data error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Seed Test Data</h1>
        <p className="text-slate-900 mt-2">
          Add test data to verify the database integration is working correctly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Test Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">This will create:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-900">
              <li><strong>1 Test Collection:</strong> &quot;Hotel Furniture&quot; collection</li>
              <li><strong>3 Tasks:</strong> Hotel renovation project tasks with different priorities</li>
              <li><strong>1 Item:</strong> Sample hotel lobby chair (if items table exists)</li>
            </ul>
          </div>

          <Button 
            onClick={handleSeedData}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Seeding Data...' : 'Seed Test Data'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 font-medium">Error:</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!!(result && typeof result === 'object') && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-3">
              <p className="text-green-700 font-medium">✅ Success! Test data created:</p>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-green-800">Collections:</span>
                  <span className="ml-2 text-green-600">
                    {result.data?.collections?.count || 0} created
                  </span>
                  {result.data?.collections?.names && (result.data?.collections?.names || []).length > 0 && (
                    <ul className="ml-4 mt-1">
                      {(result.data?.collections?.names || []).map((name: string, index: number) => (
                        <li key={index} className="text-green-600">• {name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div>
                  <span className="font-medium text-green-800">Tasks:</span>
                  <span className="ml-2 text-green-600">
                    {result.data?.tasks?.count || 0} created
                  </span>
                  {result.data?.tasks?.titles && (result.data?.tasks?.titles || []).length > 0 && (
                    <ul className="ml-4 mt-1">
                      {(result.data?.tasks?.titles || []).map((title: string, index: number) => (
                        <li key={index} className="text-green-600">• {title}</li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div>
                  <span className="font-medium text-green-800">Items:</span>
                  <span className="ml-2 text-green-600">
                    {result.data?.items?.count || 0} created
                  </span>
                  {result.data?.items?.names && (result.data?.items?.names || []).length > 0 && (
                    <ul className="ml-4 mt-1">
                      {(result.data?.items?.names || []).map((name: string, index: number) => (
                        <li key={index} className="text-green-600">• {name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-green-200">
                <p className="text-green-700 text-sm">
                  <strong>Next steps:</strong> Visit the Collections, Tasks, or Items pages to see the new data!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-slate-900">After seeding data, test these pages:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-900">
              <li><strong>Collections Page:</strong> Should show &quot;Test Collection - Hotel Furniture&quot;</li>
              <li><strong>Tasks Page:</strong> Should show 3 hotel renovation tasks</li>
              <li><strong>Items Page:</strong> Should show test hotel lobby chair (if seeded)</li>
              <li><strong>Dashboard:</strong> Should show updated counts and recent activity</li>
              <li><strong>Collections CRUD:</strong> Try creating/editing more collections</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}