'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface Collection {
  id: string
  name: string
  prefix?: string
  description?: string
  image_url?: string
  display_order?: number
  is_active?: boolean
  designer?: string
  created_at: string
  updated_at?: string
}

interface CollectionWithCounts extends Collection {
  item_count?: number
}

interface CollectionFormData {
  name: string
  prefix: string
  description: string
  image_url: string
  display_order: number
  is_active: boolean
  designer: string
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [formData, setFormData] = useState<CollectionFormData>({
    name: '',
    prefix: '',
    description: '',
    image_url: '',
    display_order: 1,
    is_active: true,
    designer: ''
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      setLoading(true)
      console.log('Collections Page: Fetching collections...')
      
      const response = await fetch('/api/collections', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()
      console.log('Collections Page: API response:', data)

      if (!response.ok) {
        setError(data.error || 'Failed to fetch collections')
        console.error('Collections Page: API error:', data)
      } else {
        // Ensure display_order exists and get real item counts
        const collectionsWithCounts = await Promise.all((data.data || []).map(async (collection: Collection, index: number) => {
          // Get real item count from the items table
          let itemCount = 0
          try {
            const itemsResponse = await fetch(`/api/items?collection_id=${collection.id}`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            })
            if (itemsResponse.ok) {
              const itemsData = await itemsResponse.json()
              itemCount = itemsData.data?.length || 0
            }
          } catch (error) {
            console.warn('Failed to fetch item count for collection:', collection.id, error)
            itemCount = 0
          }

          return {
            ...collection,
            display_order: collection.display_order || (index + 1), // Fallback if column doesn't exist
            item_count: itemCount, // Real count from database
            designer: collection.designer || '' // Use actual designer from database or empty string
          }
        }))
        
        setCollections(collectionsWithCounts)
        setError('')
        setSuccess('')
        console.log('Collections Page: Successfully loaded', collectionsWithCounts.length, 'collections')
      }
    } catch (err) {
      setError('Failed to connect to API')
      console.error('Collections Page: Connection error:', err)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!(formData.name || "").trim()) {
      errors.name = 'Collection name is required'
    }

    if (!(formData.prefix || "").trim()) {
      errors.prefix = 'Prefix is required'
    } else if ((formData.prefix || []).length !== 2) {
      errors.prefix = 'Prefix must be exactly 2 characters'
    } else if (!/^[A-Z]{2}$/.test(formData.prefix)) {
      errors.prefix = 'Prefix must be 2 uppercase letters'
    }

    // Check for duplicate prefix
    const existingPrefixes = collections
      .filter(c => c.id !== editingCollection?.id)
      .map(c => c.prefix?.toUpperCase()).filter(Boolean)
    
    if (existingPrefixes.includes((formData.prefix || "").toUpperCase())) {
      errors.prefix = 'This prefix is already in use'
    }

    if (formData.display_order < 1) {
      errors.display_order = 'Display order must be at least 1'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const isEditing = !!editingCollection
    setActionLoading(isEditing ? 'update' : 'create')

    try {
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/collections/${editingCollection.id}` : '/api/collections'
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          prefix: (formData.prefix || "").toUpperCase(),
          updated_at: new Date().toISOString()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || `Failed to ${isEditing ? 'update' : 'create'} collection`)
      } else {
        setSuccess(`Collection ${isEditing ? 'updated' : 'created'} successfully!`)
        setShowCreateForm(false)
        setEditingCollection(null)
        resetForm()
        await fetchCollections()
      }
    } catch (err) {
      setError('Failed to save collection')
      console.error('Save collection error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection)
    setFormData({
      name: collection.name,
      prefix: collection.prefix || '',
      description: collection.description || '',
      image_url: collection.image_url || '',
      display_order: collection.display_order || 1,
      is_active: collection.is_active !== false,
      designer: collection.designer || ''
    })
    setFormErrors({})
    setShowCreateForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (collection: Collection) => {
    if (!confirm(`Are you sure you want to delete "${collection.name}"? This action cannot be undone.`)) {
      return
    }

    setActionLoading(`delete-${collection.id}`)

    try {
      console.log('Collections Page: Attempting to delete collection:', collection.id, collection.name)

      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      console.log('Collections Page: Delete response status:', response.status)

      const data = await response.json()
      console.log('Collections Page: Delete response data:', data)

      if (!response.ok) {
        const errorMessage = data.error || `Failed to delete collection (${response.status})`
        console.error('Collections Page: Delete failed:', errorMessage)
        setError(errorMessage)
      } else {
        console.log('Collections Page: Delete successful')
        setSuccess('Collection deleted successfully!')
        await fetchCollections()
      }
    } catch (err) {
      const errorMessage = 'Failed to delete collection - network error'
      console.error('Collections Page: Delete network error:', err)
      setError(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      prefix: '',
      description: '',
      image_url: '',
      display_order: Math.max(1, collections.length + 1),
      is_active: true,
      designer: ''
    })
    setFormErrors({})
  }

  const handleCancel = () => {
    setShowCreateForm(false)
    setEditingCollection(null)
    resetForm()
    setError('')
    setSuccess('')
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Collections</h1>
          <p className="text-slate-600 mt-1">Manage product collections and their properties</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchCollections} disabled={loading} variant="outline">
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
            New Collection
          </Button>
        </div>
      </div>

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

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {editingCollection ? 'Edit Collection' : 'Create New Collection'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Basic Information</h3>
                  
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-1">
                      Collection Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                        formErrors.name ? 'border-red-300' : 'border-stone-200'
                      }`}
                      placeholder="e.g., Pacifica Collection"
                    />
                    {formErrors.name && (
                      <div className="text-red-600 text-sm mt-1">{formErrors.name}</div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="prefix" className="block text-sm font-medium text-slate-900 mb-1">
                      Prefix (2 letters) *
                    </label>
                    <input
                      id="prefix"
                      type="text"
                      maxLength={2}
                      value={formData.prefix}
                      onChange={(e) => setFormData({ ...formData, prefix: (e.target.value || "").toUpperCase() })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                        formErrors.prefix ? 'border-red-300' : 'border-stone-200'
                      }`}
                      placeholder="PA"
                    />
                    {formErrors.prefix && (
                      <div className="text-red-600 text-sm mt-1">{formErrors.prefix}</div>
                    )}
                    <div className="text-xs text-slate-600 mt-1">
                      Used for SKU generation (e.g., PA-SOFA-001)
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-900 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Describe this collection..."
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="designer" className="block text-sm font-medium text-slate-900 mb-1">
                      Designer
                    </label>
                    <input
                      id="designer"
                      type="text"
                      value={formData.designer}
                      onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Designer name..."
                    />
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Settings</h3>

                  <div>
                    <label htmlFor="image_url" className="block text-sm font-medium text-slate-900 mb-1">
                      Image URL
                    </label>
                    <input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div>
                    <label htmlFor="display_order" className="block text-sm font-medium text-slate-900 mb-1">
                      Display Order *
                    </label>
                    <input
                      id="display_order"
                      type="number"
                      min="1"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                        formErrors.display_order ? 'border-red-300' : 'border-stone-200'
                      }`}
                    />
                    {formErrors.display_order && (
                      <div className="text-red-600 text-sm mt-1">{formErrors.display_order}</div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-primary focus:ring-primary border-stone-300 rounded"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-slate-900">
                      Active Collection
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-stone-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={!!actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!!actionLoading}
                  className="min-w-[120px]"
                >
                  {actionLoading === 'create' || actionLoading === 'update' ? (
                    <div className="flex items-center space-x-2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{editingCollection ? 'Updating...' : 'Creating...'}</span>
                    </div>
                  ) : (
                    editingCollection ? 'Update Collection' : 'Create Collection'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Collections ({collections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <div className="text-slate-600">Loading collections...</div>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-600 mb-4">No collections found</div>
              <Button onClick={() => {
                resetForm()
                setShowCreateForm(true)
              }}>
                Create First Collection
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Designer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections
                  .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
                  .map((collection, index) => (
                    <TableRow key={`collections-table-${index}-${collection.id || 'no-id'}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {collection.image_url && (
                            <Image 
                              src={collection.image_url} 
                              alt={collection.name}
                              width={40}
                              height={40}
                              className="object-cover rounded-md"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          )}
                          <div>
                            <div className="font-medium text-slate-900">{collection.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                          {collection.prefix || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700">{collection.designer || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{collection.item_count || 0} items</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${
                          collection.is_active !== false
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {collection.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{collection.display_order || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600">
                          {formatDate(collection.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(collection)}
                            disabled={!!actionLoading}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(collection)}
                            disabled={!!actionLoading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {actionLoading === `delete-${collection.id}` ? (
                              <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                            ) : (
                              'Delete'
                            )}
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
    </div>
  )
}