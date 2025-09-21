'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EnhancedExport } from '@/components/ui/enhanced-export'
import { 
  Package, 
  Edit, 
  Save, 
  X, 
  DollarSign, 
  FileText, 
  Image as ImageIcon,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'

// Proper TypeScript interfaces
interface ItemDimensions {
  length: number
  width: number
  height: number
  unit: string
}

interface ItemSpecifications {
  tolerance?: string
  surface_finish?: string
  heat_treatment?: string
  coating?: string
  [key: string]: string | undefined
}

interface Item {
  id: string
  sku: string
  name: string
  description: string
  category: string
  price: number
  cost: number
  status: 'active' | 'inactive' | 'draft'
  lead_time_days: number
  minimum_quantity: number
  weight?: number
  dimensions?: ItemDimensions
  materials?: string[]
  specifications?: ItemSpecifications
  images?: string[]
  created_at: string
  updated_at: string
}

interface ItemFormData {
  name: string
  description: string
  category: string
  price: number
  cost: number
  status: 'active' | 'inactive' | 'draft'
  lead_time_days: number
  minimum_quantity: number
  weight: number
}

export default function ItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  
  const [item, setItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    description: '',
    category: '',
    price: 0,
    cost: 0,
    status: 'active',
    lead_time_days: 0,
    minimum_quantity: 0,
    weight: 0
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params?.id) {
      fetchItem(params.id as string)
    }
  }, [params?.id])

  const fetchItem = async (itemId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/items/${itemId}`)
      const data = await response.json()

      if (response.ok && data.item) {
        const itemData = data.item
        setItem(itemData)
        setFormData({
          name: itemData.name || '',
          description: itemData.description || '',
          category: itemData.category || '',
          price: Number(itemData.price) || 0,
          cost: Number(itemData.cost) || 0,
          status: itemData.status || 'active',
          lead_time_days: Number(itemData.lead_time_days) || 0,
          minimum_quantity: Number(itemData.minimum_quantity) || 0,
          weight: Number(itemData.weight) || 0
        })
      } else {
        setError('Item not found')
      }
    } catch (err) {
      console.error('Error fetching item:', err)
      setError('Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!item) return

    try {
      setSaving(true)
      setError('')

      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.item) {
        setItem({ ...item, ...data.item })
        setEditMode(false)
      } else {
        setError('Failed to save changes')
      }
    } catch (err) {
      console.error('Error saving item:', err)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ItemFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      draft: 'bg-yellow-100 text-yellow-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="lg" text="Loading item details..." className="py-32" />
      </div>
    )
  }

  if (error && !item) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Item Not Found</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => router.push('/dashboard/items')} className="flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Items
        </Button>
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/items')}
            className="mb-4 -ml-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Items
          </Button>
          <h1 className="text-3xl font-bold text-heading">
            {editMode ? formData.name : item.name}
          </h1>
          <p className="text-graphite mt-1">SKU: {item.sku}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(editMode ? formData.status : item.status)}>
            {editMode ? formData.status : item.status}
          </Badge>
          
          {!editMode ? (
            <>
              <EnhancedExport
                data={[item as unknown as Record<string, unknown>]}
                type="inventory"
                title={`${item.name} Details`}
                onExportComplete={() => console.log('Export completed')}
                size="sm"
              />
              <Button onClick={() => setEditMode(true)} className="flex items-center">
                <Edit className="w-4 h-4 mr-2" />
                Edit Item
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setEditMode(false)}
                disabled={saving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  {editMode ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  ) : (
                    <p className="text-heading font-medium">{item.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  {editMode ? (
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                    />
                  ) : (
                    <p className="text-heading font-medium">{item.category}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                {editMode ? (
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-graphite">{item.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  {editMode ? (
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value as 'active' | 'inactive' | 'draft')}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
                    </select>
                  ) : (
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  )}
                </div>
                <div>
                  <Label htmlFor="lead_time">Lead Time (days)</Label>
                  {editMode ? (
                    <Input
                      id="lead_time"
                      type="number"
                      value={formData.lead_time_days}
                      onChange={(e) => handleInputChange('lead_time_days', Number(e.target.value))}
                    />
                  ) : (
                    <p className="text-heading font-medium">{item.lead_time_days} days</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Pricing & Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  {editMode ? (
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', Number(e.target.value))}
                    />
                  ) : (
                    <p className="text-2xl font-bold text-primary">{formatCurrency(item.price)}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cost">Cost</Label>
                  {editMode ? (
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => handleInputChange('cost', Number(e.target.value))}
                    />
                  ) : (
                    <p className="text-xl font-semibold text-graphite">{formatCurrency(item.cost)}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="min_quantity">Min. Quantity</Label>
                  {editMode ? (
                    <Input
                      id="min_quantity"
                      type="number"
                      value={formData.minimum_quantity}
                      onChange={(e) => handleInputChange('minimum_quantity', Number(e.target.value))}
                    />
                  ) : (
                    <p className="text-heading font-medium">{item.minimum_quantity}</p>
                  )}
                </div>
              </div>

              {!editMode && (
                <div className="mt-4 grid grid-cols-2 text-sm">
                  <div>
                    <span className="text-graphite">Margin:</span>
                    <span className="ml-2 font-medium">
                      {(((item.price - item.cost) / item.price) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-graphite">Profit:</span>
                    <span className="ml-2 font-medium">{formatCurrency(item.price - item.cost)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          {item.specifications && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Technical Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(item.specifications).map(([key, value]) => (
                    <div key={key}>
                      <Label className="text-sm font-medium capitalize">
                        {safeFormatString(key, 'unknown')}
                      </Label>
                      <p className="text-graphite">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Materials */}
          {item.materials && (item.materials || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(item.materials || []).map((material, index) => (
                    <Badge key={index} variant="outline">
                      {material}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.weight && (
                <div className="flex justify-between">
                  <span className="text-graphite">Weight:</span>
                  <span className="font-medium">{item.weight} kg</span>
                </div>
              )}
              {item.dimensions && (
                <div>
                  <span className="text-graphite">Dimensions:</span>
                  <div className="text-sm font-medium mt-1">
                    {(item.dimensions || []).length} × {item.dimensions.width} × {item.dimensions.height} {item.dimensions.unit}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          {item.images && (item.images || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(item.images || []).map((image, index) => (
                    <div key={index} className="h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Image {index + 1}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Information */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-graphite">Created</p>
                <p className="font-medium">{formatDate(item.created_at)}</p>
              </div>
              <div>
                <p className="text-graphite">Last Updated</p>
                <p className="font-medium">{formatDate(item.updated_at)}</p>
              </div>
              <div>
                <p className="text-graphite">Item ID</p>
                <p className="font-mono text-xs">{item.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}