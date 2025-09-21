'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Package, Settings, Plus } from 'lucide-react'

interface Item {
  id: string
  name: string
  sku_base: string
  type: 'Concept' | 'Prototype' | 'Production Ready'
  prototype_status: string
  collection_id: string
  collections?: { name: string }
  description?: string
  base_price: number
  is_active: boolean
  created_at: string
  project_manager?: string
  prototype_cost?: number
  assigned_manufacturer_id?: string
  target_completion?: string
  prototype_notes?: string
  prototype_started_at?: string
  prototype_completed_at?: string
}

interface Collection {
  id: string
  name: string
}

export default function PrototypesPage() {
  const [items, setItems] = useState<Item[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [availablePrototypes, setAvailablePrototypes] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState('')
  const [selectedPrototype, setSelectedPrototype] = useState('')

  useEffect(() => {
    Promise.all([
      fetchItems(),
      fetchCollections(),
      fetchAvailablePrototypes()
    ])
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      // Fetch prototype items that are currently in factory prototyping
      const response = await fetch('/api/items?type=Prototype')
      if (!response.ok) throw new Error('Failed to fetch prototype items')

      const data = await response.json()
      const itemsList = data.data || []

      // Filter for items currently in prototyping stages
      const prototypeItems = itemsList.filter((item: Item) =>
        item.prototype_status &&
        ['design', 'factory_queue', 'in_production', 'testing', 'review'].includes(item.prototype_status)
      )

      setItems(prototypeItems)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prototype items')
    } finally {
      setLoading(false)
    }
  }

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections')
      if (!response.ok) throw new Error('Failed to fetch collections')
      const data = await response.json()
      setCollections(data.data || [])
    } catch (err) {
      console.error('Error fetching collections:', err)
    }
  }

  const fetchAvailablePrototypes = async () => {
    try {
      // Fetch all items that can be added to prototype queue (Concept and Prototype types)
      const response = await fetch('/api/items')
      if (!response.ok) throw new Error('Failed to fetch items')
      const data = await response.json()
      const allItems = data.data || []

      // Filter for items that can be prototyped: Concept or Prototype type, not already in active build queue
      const available = allItems.filter((item: Item) =>
        (item.type === 'Concept' || item.type === 'Prototype') &&
        (!item.prototype_status || item.prototype_status === 'not_started')
      )

      setAvailablePrototypes(available)
    } catch (err) {
      console.error('Error fetching available prototypes:', err)
    }
  }

  const addPrototypeToQueue = async () => {
    if (!selectedPrototype) return

    try {
      const response = await fetch(`/api/items/${selectedPrototype}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Prototype',
          prototype_status: 'design',
          prototype_started_at: new Date().toISOString()
        })
      })

      if (!response.ok) throw new Error('Failed to add prototype to queue')

      // Refresh all data
      await Promise.all([
        fetchItems(),
        fetchAvailablePrototypes()
      ])

      // Reset form
      setShowAddForm(false)
      setSelectedCollection('')
      setSelectedPrototype('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add prototype to queue')
    }
  }

  const updatePrototypeStatus = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prototype_status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update prototype status')

      // Refresh the list
      await fetchItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update prototype status')
    }
  }


  const filteredItems = items


  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype Build Tracking"
        description="Track prototypes currently in factory production and testing"
        actions={
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Prototype to Queue
          </Button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              In Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {items.filter(i => i.prototype_status === 'in_production').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              In Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {items.filter(i => i.prototype_status === 'factory_queue').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Testing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {items.filter(i => i.prototype_status === 'testing').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Under Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {items.filter(i => i.prototype_status === 'review').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {items.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prototypes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Active Prototypes ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div>Loading prototypes...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Error: {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No active prototypes found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-slate-500 mt-1">{item.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{item.sku_base}</span>
                    </TableCell>
                    <TableCell>{item.collections?.name}</TableCell>
                    <TableCell>
                      <Select
                        value={item.prototype_status || 'not_started'}
                        onValueChange={(newStatus) => updatePrototypeStatus(item.id, newStatus)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="factory_queue">Factory Queue</SelectItem>
                          <SelectItem value="in_production">In Production</SelectItem>
                          <SelectItem value="testing">Testing</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{item.project_manager || '-'}</TableCell>
                    <TableCell>
                      {item.prototype_cost ? `$${item.prototype_cost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {item.prototype_started_at
                        ? new Date(item.prototype_started_at).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {item.target_completion
                        ? new Date(item.target_completion).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/dashboard/items/${item.id}`}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Prototype to Queue Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add Item to Prototype Build Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="collection-select">Collection *</Label>
                  <Select
                    value={selectedCollection}
                    onValueChange={setSelectedCollection}
                  >
                    <SelectTrigger id="collection-select">
                      <SelectValue placeholder="Select collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map(collection => (
                        <SelectItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="prototype-select">Item to Prototype *</Label>
                  <Select
                    value={selectedPrototype}
                    onValueChange={setSelectedPrototype}
                    disabled={!selectedCollection}
                  >
                    <SelectTrigger id="prototype-select">
                      <SelectValue placeholder={selectedCollection ? "Select item to prototype" : "Select collection first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrototypes
                        .filter(item => selectedCollection === '' || item.collection_id === selectedCollection)
                        .map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.sku_base}) - {item.type}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPrototype && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="text-blue-800 text-sm">
                      <strong>Selected:</strong>{' '}
                      {availablePrototypes.find(i => i.id === selectedPrototype)?.name}
                      <br />
                      <strong>Collection:</strong>{' '}
                      {collections.find(c => c.id === selectedCollection)?.name}
                      <br />
                      <span className="text-xs text-blue-600">
                        This item will be promoted to &quot;Prototype&quot; type and added to the build tracking queue with &quot;design&quot; status.
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false)
                      setSelectedCollection('')
                      setSelectedPrototype('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addPrototypeToQueue}
                    disabled={!selectedPrototype}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add to Queue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}