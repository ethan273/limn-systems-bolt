'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Grid, List, Search, Edit, Trash2, 
  Package, DollarSign, BarChart3, Filter 
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { safeFormatString } from '@/lib/utils/string-helpers'
import { PageLoading } from '@/components/ui/enhanced-loading-states'
import { TYPOGRAPHY_STANDARDS } from '@/lib/utils/dashboard-ui-standards'

interface OrderSKU {
  id: string
  sku: string
  base_sku: string
  client_sku: string
  item_name: string
  collection_name: string
  client_name: string
  order_id: string
  order_number: string
  quantity: number
  unit_price: number
  total_price: number
  is_rush: boolean
  status: string
  materials: {
    fabric?: string
    wood?: string
    metal?: string
    stone?: string
    weave?: string
    carving?: string
  }
  dimensions?: {
    width?: number
    height?: number
    depth?: number
    weight?: number
  }
  created_at: string
  custom_specifications?: string
}

export default function ProductsPage() {
  const [orderSKUs, setOrderSKUs] = useState<OrderSKU[]>([])
  const [loading, setLoading] = useState(true)
  const [, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSKU, setEditingSKU] = useState<OrderSKU | null>(null)


  const fetchOrderSKUs = useCallback(async () => {
    try {
      // Use proper Products API endpoint that fetches order_items with material selections
      const response = await fetch('/api/products', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      const products = result.data || []
      
      // Products API already returns the proper format, just map to OrderSKU interface
      const formattedSKUs = products.map((product: any) => ({
        id: product.id,
        sku: product.sku_full, // Display the full SKU, not base SKU
        base_sku: product.base_sku,
        client_sku: product.client_sku,
        item_name: product.item_name,
        collection_name: product.collection_name,
        client_name: product.customer_name,
        order_id: product.order_id,
        order_number: product.order_number,
        quantity: product.quantity,
        unit_price: product.unit_price,
        total_price: product.total_price,
        is_rush: product.is_rush,
        status: product.status,
        materials: product.materials || {},
        dimensions: product.dimensions || {},
        created_at: product.created_at,
        custom_specifications: product.custom_specifications || ''
      })) || []
      
      setOrderSKUs(formattedSKUs)
    } catch (error) {
      console.error('Error fetching order SKUs:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrderSKUs()
  }, [fetchOrderSKUs])

  const handleSaveSKU = async (skuData: Partial<OrderSKU>) => {
    try {
      if (editingSKU) {
        const response = await fetch('/api/products', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            id: editingSKU.id,
            ...skuData
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update product')
        }

        const result = await response.json()
        if (result.success) {
          // Refresh the data to get updated information
          await fetchOrderSKUs()
          setError('')
        } else {
          throw new Error(result.error || 'Failed to update product')
        }
      }

      setShowEditDialog(false)
      setEditingSKU(null)
    } catch (error) {
      console.error('Error saving SKU:', error)
      setError('Failed to save changes. Please try again.')
    }
  }

  const handleDeleteSKU = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SKU? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete product')
      }

      const result = await response.json()
      if (result.success) {
        // Refresh the data to get updated list
        await fetchOrderSKUs()
        setError('')
      } else {
        throw new Error(result.error || 'Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting SKU:', error)
      setError('Failed to delete product. Please try again.')
    }
  }

  const filteredSKUs = orderSKUs.filter(sku =>
    sku.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.collection_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={TYPOGRAPHY_STANDARDS.pageTitle}>Ordered Items</h1>
          <p className={TYPOGRAPHY_STANDARDS.pageDescription}>All SKUs generated from customer orders with material specifications</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderSKUs.length}</div>
            <div className="text-xs text-slate-500 mt-1">Unique product configurations</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              In Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orderSKUs.filter(s => s.status === 'in_production').length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Currently being made</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${orderSKUs.reduce((sum, s) => sum + s.total_price, 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Across all orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(orderSKUs.map(s => s.collection_name)).size}
            </div>
            <div className="text-xs text-slate-500 mt-1">Product categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
          <Input
            placeholder="Search by SKU, item name, client, or collection..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* SKUs Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSKUs.map((sku) => (
            <Card key={sku.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{sku.item_name}</h3>
                    <p className="text-sm text-slate-600 mb-2">{sku.collection_name}</p>
                    <div className="space-y-1">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-500">Full SKU:</div>
                        <code className="bg-blue-50 px-2 py-1 rounded text-xs">
                          {sku.sku}
                        </code>
                        {sku.client_sku && sku.client_sku !== sku.sku && (
                          <>
                            <div className="text-xs text-slate-500 mt-1">Client SKU:</div>
                            <code className="bg-green-50 px-2 py-1 rounded text-xs">
                              {sku.client_sku}
                            </code>
                          </>
                        )}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Client:</span>
                        <span className="ml-2">{sku.client_name}</span>
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={
                      sku.status === 'completed' ? 'secondary' :
                      sku.status === 'in_production' ? 'default' : 'outline'
                    }
                  >
                    {safeFormatString(sku.status, 'unknown')}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Quantity:</span>
                      <span className="ml-2 font-medium">{sku.quantity}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Unit Price:</span>
                      <span className="ml-2 font-medium">${sku.unit_price}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">Total Value:</span>
                      <span className="ml-2 font-bold text-lg">${(sku.total_price || 0).toLocaleString()}</span>
                      {sku.is_rush && <Badge variant="destructive" className="ml-2">Rush</Badge>}
                    </div>
                  </div>

                  {Object.values(sku.materials).some(m => m) && (
                    <div className="border-t pt-3">
                      <div className="text-sm text-slate-500 mb-2">Materials:</div>
                      <div className="space-y-1">
                        {Object.entries(sku.materials).map(([type, value]) => 
                          value && (
                            <div key={type} className="text-xs bg-slate-50 px-2 py-1 rounded">
                              <span className="font-medium capitalize">{type}:</span> {value}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setEditingSKU(sku)
                      setShowEditDialog(true)
                    }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteSKU(sku.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="text-left p-4">Item & SKU</th>
                  <th className="text-left p-4">Client & Order</th>
                  <th className="text-left p-4">Specifications</th>
                  <th className="text-left p-4">Quantity & Price</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSKUs.map((sku) => (
                  <tr key={sku.id} className="border-b hover:bg-slate-50">
                    <td className="p-4">
                      <div>
                        <div className="font-semibold">{sku.item_name}</div>
                        <div className="text-sm text-slate-600 mb-1">{sku.collection_name}</div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">Full SKU:</div>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">
                            {sku.sku}
                          </code>
                          {sku.client_sku && sku.client_sku !== sku.sku && (
                            <>
                              <div className="text-xs text-slate-500 mt-1">Client SKU:</div>
                              <code className="text-xs bg-green-50 px-2 py-1 rounded">
                                {sku.client_sku}
                              </code>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{sku.client_name}</div>
                        <div className="text-sm text-slate-600">{sku.order_number}</div>
                        <div className="text-xs text-slate-500 mt-1">{new Date(sku.created_at).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1 max-w-sm">
                        {sku.dimensions && (
                          <div className="text-xs text-slate-600">
                            {sku.dimensions.width}&quot;W × {sku.dimensions.height}&quot;H × {sku.dimensions.depth}&quot;D
                          </div>
                        )}
                        {Object.values(sku.materials).some(m => m) && (
                          <div className="space-y-1">
                            {Object.entries(sku.materials).map(([type, value]) => 
                              value && (
                                <div key={type} className="text-xs bg-slate-50 px-2 py-1 rounded">
                                  <span className="font-medium capitalize">{type}:</span> {value}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-semibold">Qty: {sku.quantity}</div>
                        <div className="text-sm text-slate-600">@ ${sku.unit_price}</div>
                        <div className="font-bold text-lg">${(sku.total_price || 0).toLocaleString()}</div>
                        {sku.is_rush && <Badge variant="destructive" className="mt-1">Rush</Badge>}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant={
                          sku.status === 'completed' ? 'secondary' :
                          sku.status === 'in_production' ? 'default' : 'outline'
                        }
                      >
                        {safeFormatString(sku.status, 'unknown')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setEditingSKU(sku)
                            setShowEditDialog(true)
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeleteSKU(sku.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Edit SKU Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Edit SKU: {editingSKU?.sku}
            </DialogTitle>
          </DialogHeader>
          {editingSKU && (
            <SKUEditForm 
              sku={editingSKU}
              onSave={handleSaveSKU}
              onCancel={() => {
                setShowEditDialog(false)
                setEditingSKU(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// SKU Edit Form Component
function SKUEditForm({ 
  sku, 
  onSave, 
  onCancel 
}: { 
  sku: OrderSKU
  onSave: (data: Partial<OrderSKU>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    status: sku.status,
    custom_specifications: sku.custom_specifications || '',
    dimensions: {
      width: sku.dimensions?.width || 0,
      height: sku.dimensions?.height || 0,
      depth: sku.dimensions?.depth || 0,
      weight: sku.dimensions?.weight || 0
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Item Information</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Item:</span> {sku.item_name}</div>
              <div><span className="font-medium">Collection:</span> {sku.collection_name}</div>
              <div><span className="font-medium">Client:</span> {sku.client_name}</div>
              <div><span className="font-medium">Order:</span> {sku.order_number}</div>
              <div><span className="font-medium">Quantity:</span> {sku.quantity}</div>
              <div><span className="font-medium">Unit Price:</span> ${sku.unit_price}</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Materials</h3>
            <div className="space-y-1">
              {Object.entries(sku.materials).map(([type, value]) => 
                value && (
                  <div key={type} className="text-sm bg-slate-50 px-3 py-2 rounded">
                    <span className="font-medium capitalize">{type}:</span> {value}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Dimensions</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Width (inches)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.dimensions.width}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dimensions: { ...formData.dimensions, width: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div>
                <Label className="text-xs">Height (inches)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.dimensions.height}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dimensions: { ...formData.dimensions, height: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div>
                <Label className="text-xs">Depth (inches)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.dimensions.depth}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dimensions: { ...formData.dimensions, depth: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div>
                <Label className="text-xs">Weight (lbs)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.dimensions.weight}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dimensions: { ...formData.dimensions, weight: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Custom Specifications</Label>
            <Textarea
              value={formData.custom_specifications}
              onChange={(e) => setFormData({ ...formData, custom_specifications: e.target.value })}
              rows={4}
              placeholder="Enter any custom specifications, requirements, or notes..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Update SKU
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}