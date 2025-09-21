'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'
import { formatCurrency as formatCurrencyUtil, ERROR_MESSAGES } from '@/lib/utils/dashboard-ui-standards'
import { PageLoading } from '@/components/ui/enhanced-loading-states'

interface Collection {
  id: string
  name: string
  prefix: string
}

interface Item {
  id: string
  name: string
  sku_base: string  // Base product SKU from catalog
  sku?: string      // Full SKU with materials (optional)
  client_sku?: string // Client-specific tracking ID
  project_sku?: string // Project-level grouping
  collection_id: string
  collections?: Collection
  description?: string
  dimensions?: string
  base_price: number
  is_active: boolean
  created_at: string
  updated_at?: string
  type?: 'Concept' | 'Prototype' | 'Production Ready'
  
  // Inventory Management
  stock_quantity: number
  reserved_quantity: number
  available_quantity: number
  min_stock_level: number
  max_stock_level: number
  reorder_point: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued'
  last_restocked?: string
  supplier: string
  supplier_sku?: string
  unit_cost: number
  
  // Dimensions
  width?: number
  depth?: number
  height?: number
  dimension_units: 'inches' | 'cm'
  
  // Seating dimensions
  seat_height?: number
  seat_depth?: number
  seat_width?: number
  arm_height?: number
  back_height?: number
  
  // Detail dimensions
  clearance_height?: number
  cushion_thickness?: number
  table_top_thickness?: number
  shelf_heights?: number[] // JSON array
  
  // Shipping dimensions
  boxed_width?: number
  boxed_depth?: number
  boxed_height?: number
  weight_lbs?: number
  num_boxes: number
  assembly_required: boolean
  
  // Storage dimensions
  interior_width?: number
  interior_depth?: number
  interior_height?: number
  drawer_dimensions?: unknown // JSON object
  
  // Materials and options
  primary_material?: string
  secondary_materials?: string[]
  available_finishes?: string[]
  available_fabrics?: string[]
  metal_options?: string[]
  stone_options?: string[]
  
  // Images
  primary_image_url?: string
  gallery_images?: string[]
  technical_drawings?: string[]
  
  // Variations
  size_variants?: string[]
  configuration_options?: string[]
}


export default function ItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [, setEditingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    sku_base: '',
    collection_id: '',
    description: '',
    base_price: 0,
    type: 'Production Ready'
  })

  // New collection creation state
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false)
  const [newCollectionData, setNewCollectionData] = useState({
    name: '',
    prefix: '',
    description: ''
  })
  const [actionLoading, setActionLoading] = useState(false)
  
  // Filters
  const [selectedCollection, setSelectedCollection] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  

  useEffect(() => {
    fetchInitialData()
  }, [])

  // Helper function to safely create SKU codes from strings (from create order page)
  const createSKUCode = (text: string, fallback = 'UNK'): string => {
    if (!text || typeof text !== 'string') return fallback
    return text.trim().substring(0, 3).toUpperCase() || fallback
  }

  // Auto-generate SKU when item name or collection changes
  const generateSKU = useCallback((itemName: string, collectionId: string) => {
    if (!itemName || !collectionId) return ''

    const collection = collections.find(c => c.id === collectionId)
    if (!collection) return ''

    const collectionCode = collection.prefix || createSKUCode(collection.name, 'COL')
    const itemCode = createSKUCode(itemName, 'ITM')

    // Find next version number for this item in this collection
    const existingItems = items.filter(item =>
      item.collection_id === collectionId &&
      item.sku_base?.startsWith(`${collectionCode}-${itemCode}`)
    )
    const nextVersion = String(existingItems.length + 1).padStart(3, '0')

    return `${collectionCode}-${itemCode}-${nextVersion}`
  }, [collections, items])

  // Auto-generate SKU when name or collection changes
  useEffect(() => {
    if (formData.name && formData.collection_id) {
      const generatedSKU = generateSKU(formData.name, formData.collection_id)
      setFormData(prev => ({ ...prev, sku_base: generatedSKU }))
    }
  }, [formData.name, formData.collection_id, collections, items, generateSKU])

  // Create new collection function
  const createNewCollection = async () => {
    if (!newCollectionData.name || !newCollectionData.prefix) {
      setError('Please fill in collection name and prefix')
      return
    }

    if (newCollectionData.prefix.length !== 2) {
      setError('Prefix must be exactly 2 characters')
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionData.name,
          prefix: newCollectionData.prefix.toUpperCase(),
          description: newCollectionData.description,
          is_active: true,
          display_order: collections.length + 1
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create collection')
        return
      }

      // Refresh collections
      await fetchInitialData()

      // Set the new collection as selected
      setFormData(prev => ({ ...prev, collection_id: data.data.id }))

      // Close new collection form
      setShowNewCollectionForm(false)
      setNewCollectionData({ name: '', prefix: '', description: '' })
      setSuccess('Collection created successfully!')

    } catch (err) {
      setError('Failed to create collection')
      console.error('Create collection error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      console.log('Items Page: Fetching initial data...')
      
      // Fetch collections and items (Production Ready only) in parallel
      const [collectionsResponse, itemsResponse] = await Promise.all([
        fetch('/api/collections', { credentials: 'include' }),
        fetch('/api/items?type=Production Ready', { credentials: 'include' })
      ])

      const collectionsData = await collectionsResponse.json()
      const itemsData = await itemsResponse.json()

      console.log('Items Page: Collections response:', collectionsData)
      console.log('Items Page: Items response:', itemsData)

      if (!collectionsResponse.ok) {
        setError(collectionsData.error || 'Failed to fetch collections')
        return
      }

      if (!itemsResponse.ok) {
        setError(itemsData.error || 'Failed to fetch items')
        return
      }

      setCollections(collectionsData.data || [])
      
      // Handle different response formats from items API
      let itemsList = []
      if (itemsData.items) {
        // Simple format: { items: [...] }
        itemsList = itemsData.items
        console.log('Items Page: Using simple items format')
      } else if (itemsData.data) {
        // Complex format: { success: true, data: [...] }
        itemsList = itemsData.data
        console.log('Items Page: Using complex items format')
      } else if (Array.isArray(itemsData)) {
        // Direct array format
        itemsList = itemsData
        console.log('Items Page: Using direct array format')
      } else {
        // No data available - show empty state
        itemsList = []
        console.log('Items Page: No data available, showing empty state')
        setError(ERROR_MESSAGES.noData)
      }

      setItems(itemsList)
      setError('')
      
      console.log('Items Page: Loaded', collectionsData.data?.length || 0, 'collections and', itemsList.length || 0, 'items')
      
    } catch (err) {
      setError('Failed to load data')
      console.error('Items Page: Load error:', err)
    } finally {
      setLoading(false)
    }
  }




  const filteredItems = items.filter(item => {
    const matchesCollection = selectedCollection === 'all' || item.collection_id === selectedCollection
    const matchesSearch = searchTerm === '' ||
      (item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku_base || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.collections?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesCollection && matchesSearch
  })

  const formatCurrency = formatCurrencyUtil

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.sku_base || !formData.collection_id) {
      setError('Please fill in all required fields')
      return
    }

    setActionLoading(true)
    setError('')

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create item')
      } else {
        setSuccess('Item created successfully!')
        setShowCreateForm(false)
        resetForm()
        await fetchInitialData()
      }
    } catch (err) {
      setError('Failed to create item')
      console.error('Create item error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sku_base: '',
      collection_id: '',
      description: '',
      base_price: 0,
      type: 'Production Ready'
    })
    setEditingItem(null)
    setShowNewCollectionForm(false)
    setNewCollectionData({ name: '', prefix: '', description: '' })
    setError('')
    setSuccess('')
  }

  const handleCancel = () => {
    setShowCreateForm(false)
    resetForm()
    setError('')
    setSuccess('')
  }

  const formatDimensions = (item: Item) => {
    // Handle JSON dimensions object from API
    if (item.dimensions && typeof item.dimensions === 'object' && item.dimensions !== null) {
      const dims = item.dimensions as Record<string, unknown>
      const width = dims.width as number
      const depth = dims.depth as number
      const height = dims.height as number
      const unit = dims.unit === 'inches' ? '"' : 'cm'

      if (width && depth && height) {
        return `${width}${unit} × ${depth}${unit} × ${height}${unit}`
      }
    }

    // Fallback for direct properties (if they exist)
    if (item.width && item.depth && item.height) {
      const unit = item.dimension_units === 'inches' ? '"' : 'cm'
      return `${item.width}${unit} × ${item.depth}${unit} × ${item.height}${unit}`
    }

    return '—'
  }

  const updateItemType = async (itemId: string, newType: string) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType })
      })

      if (!response.ok) throw new Error('Failed to update item type')

      // Refresh the list to remove the item (since it no longer belongs on this page)
      await fetchInitialData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item type')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog Items"
        description="Production-ready items in the catalog with comprehensive dimensional tracking"
        actions={
          <>
            <Button onClick={fetchInitialData} disabled={loading} variant="outline">
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              onClick={() => {
                resetForm()
                setShowCreateForm(true)
                setError('')
                setSuccess('')
              }}
              disabled={showCreateForm}
            >
              New Item
            </Button>
          </>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {success && (
        <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
          <div className="text-primary text-sm">
            <strong>Success:</strong> {success}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="collection-filter" className="mb-1">
                Filter by Collection
              </Label>
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger id="collection-filter">
                  <SelectValue placeholder="All Collections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {collections.map((collection, index) => (
                    <SelectItem key={`items-collection-${index}-${collection.id || 'no-id'}`} value={collection.id}>
                      {collection.name}{collection.prefix ? ` (${collection.prefix})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by name, SKU, or collection..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-stone-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCollection === 'all' 
              ? `All Items (${filteredItems.length})`
              : `${collections.find(c => c.id === selectedCollection)?.name || 'Collection'} Items (${filteredItems.length})`
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading />
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-600 mb-4">
                {searchTerm || selectedCollection !== 'all' 
                  ? 'No items match your filters' 
                  : 'No items found'
                }
              </div>
              <Button onClick={() => {
                resetForm()
                setShowCreateForm(true)
              }}>
                Create First Item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, index) => (
                  <TableRow key={`items-table-${index}-${item.id || 'no-id'}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {item.primary_image_url && (
                          <div className="w-10 h-10 bg-stone-100 rounded-md flex items-center justify-center text-slate-500 text-xs">
                            IMG
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{item.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.collections?.name}</div>
                        {item.collections?.prefix && (
                          <span className="text-xs font-mono text-primary bg-primary/10 px-1 rounded">
                            {item.collections?.prefix}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{item.sku_base}</span>
                      {item.sku && item.sku !== item.sku_base && (
                        <div className="text-xs text-slate-500">Full: {item.sku}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDimensions(item)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatCurrency(item.base_price)}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.type || 'Production Ready'}
                        onValueChange={(newType) => updateItemType(item.id, newType)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Concept">Concept</SelectItem>
                          <SelectItem value="Prototype">Prototype</SelectItem>
                          <SelectItem value="Production Ready">Production Ready</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${
                        item.is_active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/dashboard/items/${item.id}`)}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/dashboard/items/${item.id}?edit=true`)}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Item Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Item</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Item Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter item name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="sku_base">SKU Base (Auto-Generated) *</Label>
                    <Input
                      id="sku_base"
                      value={formData.sku_base}
                      onChange={(e) => setFormData({ ...formData, sku_base: e.target.value })}
                      placeholder="Will auto-generate based on collection + item name"
                      className={formData.sku_base ? "bg-slate-50 font-mono" : ""}
                    />
                    {formData.sku_base && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ Generated: Collection prefix + Item name + Version number
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="collection_id">Collection *</Label>
                    {!showNewCollectionForm ? (
                      <div className="space-y-2">
                        <Select
                          value={formData.collection_id}
                          onValueChange={(value) => setFormData({ ...formData, collection_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select existing collection" />
                          </SelectTrigger>
                          <SelectContent>
                            {collections.map(collection => (
                              <SelectItem key={collection.id} value={collection.id}>
                                {collection.name} ({collection.prefix})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNewCollectionForm(true)}
                          className="w-full"
                        >
                          + Create New Collection
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 border border-primary/20 rounded-lg bg-primary/5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-primary">Create New Collection</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowNewCollectionForm(false)
                              setNewCollectionData({ name: '', prefix: '', description: '' })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="new_collection_name" className="text-xs">Collection Name *</Label>
                            <Input
                              id="new_collection_name"
                              value={newCollectionData.name}
                              onChange={(e) => setNewCollectionData(prev => ({
                                ...prev,
                                name: e.target.value,
                                prefix: prev.prefix || e.target.value.substring(0, 2).toUpperCase()
                              }))}
                              placeholder="e.g., Coastal Collection"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="new_collection_prefix" className="text-xs">2-Letter Prefix *</Label>
                            <Input
                              id="new_collection_prefix"
                              value={newCollectionData.prefix}
                              onChange={(e) => setNewCollectionData(prev => ({
                                ...prev,
                                prefix: e.target.value.toUpperCase().substring(0, 2)
                              }))}
                              placeholder="CC"
                              maxLength={2}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="new_collection_description" className="text-xs">Description</Label>
                          <Input
                            id="new_collection_description"
                            value={newCollectionData.description}
                            onChange={(e) => setNewCollectionData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe this collection..."
                            className="mt-1"
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={createNewCollection}
                          disabled={actionLoading}
                          className="w-full"
                          size="sm"
                        >
                          {actionLoading ? 'Creating...' : 'Create Collection & Continue'}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="base_price">Base Price</Label>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Concept">Concept</SelectItem>
                        <SelectItem value="Prototype">Prototype</SelectItem>
                        <SelectItem value="Production Ready">Production Ready</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter item description"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="min-w-[120px]"
                  >
                    {actionLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      'Create Item'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}