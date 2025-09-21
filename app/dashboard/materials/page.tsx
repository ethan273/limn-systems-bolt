/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageHeader from '@/components/shared/PageHeader'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Palette,
  TreePine,
  Hammer,
  Mountain,
  Package,
  Zap,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

// Define interfaces for the new cascading structure
interface FabricBrand {
  id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
}

interface FabricCollection {
  id: string
  brand_id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
  brand?: { name: string }
}

interface FabricColor {
  id: string
  collection_id: string
  name: string
  hex_code?: string
  price_modifier: number
  active: boolean
  sort_order?: number
  collection?: { name: string; brand?: { name: string } }
}

interface WoodType {
  id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
}

interface WoodFinish {
  id: string
  wood_type_id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
  wood_type?: { name: string }
}

interface MetalType {
  id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
}

interface MetalFinish {
  id: string
  metal_type_id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
  metal_type?: { name: string }
}

interface MetalColor {
  id: string
  metal_finish_id: string
  name: string
  hex_code?: string
  price_modifier: number
  active: boolean
  sort_order?: number
  metal_finish?: { name: string; metal_type?: { name: string } }
}

interface StoneType {
  id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
}

interface StoneFinish {
  id: string
  stone_type_id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
  stone_type?: { name: string }
}

interface WeavingMaterial {
  id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
}

interface WeavingPattern {
  id: string
  material_id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
  weaving_material?: { name: string }
}

interface WeavingColor {
  id: string
  pattern_id: string
  name: string
  hex_code?: string
  price_modifier: number
  active: boolean
  sort_order?: number
  weaving_pattern?: { name: string; weaving_material?: { name: string } }
}

interface CarvingStyle {
  id: string
  name: string
  description?: string
  price_modifier: number
  active: boolean
  sort_order?: number
}

// Material categories with their hierarchical structure
const materialCategories = [
  {
    key: 'fabric',
    label: 'Fabrics',
    icon: Palette,
    description: 'Brand → Collection → Color',
    tables: ['fabric_brands', 'fabric_collections', 'fabric_colors'],
    hierarchy: [
      { table: 'fabric_brands', label: 'Brands', parent: null },
      { table: 'fabric_collections', label: 'Collections', parent: 'brand_id' },
      { table: 'fabric_colors', label: 'Colors', parent: 'collection_id' }
    ]
  },
  {
    key: 'wood',
    label: 'Wood',
    icon: TreePine,
    description: 'Type → Finish',
    tables: ['wood_types', 'wood_finishes'],
    hierarchy: [
      { table: 'wood_types', label: 'Types', parent: null },
      { table: 'wood_finishes', label: 'Finishes', parent: 'wood_type_id' }
    ]
  },
  {
    key: 'metal',
    label: 'Metal',
    icon: Hammer,
    description: 'Type → Finish → Color',
    tables: ['metal_types', 'metal_finishes', 'metal_colors'],
    hierarchy: [
      { table: 'metal_types', label: 'Types', parent: null },
      { table: 'metal_finishes', label: 'Finishes', parent: 'metal_type_id' },
      { table: 'metal_colors', label: 'Colors', parent: 'metal_finish_id' }
    ]
  },
  {
    key: 'stone',
    label: 'Stone',
    icon: Mountain,
    description: 'Type → Finish',
    tables: ['stone_types', 'stone_finishes'],
    hierarchy: [
      { table: 'stone_types', label: 'Types', parent: null },
      { table: 'stone_finishes', label: 'Finishes', parent: 'stone_type_id' }
    ]
  },
  {
    key: 'weaving',
    label: 'Weaving',
    icon: Package,
    description: 'Material → Pattern → Color',
    tables: ['weaving_materials', 'weaving_patterns', 'weaving_colors'],
    hierarchy: [
      { table: 'weaving_materials', label: 'Materials', parent: null },
      { table: 'weaving_patterns', label: 'Patterns', parent: 'material_id' },
      { table: 'weaving_colors', label: 'Colors', parent: 'pattern_id' }
    ]
  },
  {
    key: 'carving',
    label: 'Carving',
    icon: Zap,
    description: 'Styles Only',
    tables: ['carving_styles'],
    hierarchy: [
      { table: 'carving_styles', label: 'Styles', parent: null }
    ]
  }
]

export default function MaterialsManagementPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('fabric')
  const [activeSubTab, setActiveSubTab] = useState('fabric_brands')
  const [materialData, setMaterialData] = useState<Record<string, any[]>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [newItem, setNewItem] = useState<any>({})
  const [parentOptions, setParentOptions] = useState<any[]>([])

  const activeCategory = materialCategories.find(cat => cat.key === activeTab)
  const activeHierarchy = activeCategory?.hierarchy.find(h => h.table === activeSubTab)
  
  const loadMaterialData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/materials', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to load materials: ${response.status}`)
      }

      const result = await response.json()
      if (result.success && result.data) {
        // Transform the hierarchical API data into flat table format for the UI
        const data: Record<string, any[]> = {}

        // Flatten fabric hierarchy: Brand → Collection → Color
        data.fabric_brands = result.data.fabric_brands || []
        data.fabric_collections = []
        data.fabric_colors = []

        result.data.fabric_brands?.forEach((brand: any) => {
          brand.collections?.forEach((collection: any) => {
            data.fabric_collections.push({
              ...collection,
              brand_id: brand.id,
              brand: { name: brand.name }
            })

            collection.colors?.forEach((color: any) => {
              data.fabric_colors.push({
                ...color,
                collection_id: collection.id,
                collection: {
                  name: collection.name,
                  brand: { name: brand.name }
                }
              })
            })
          })
        })

        // Flatten wood hierarchy: Type → Finish
        data.wood_types = result.data.wood_types || []
        data.wood_finishes = []

        result.data.wood_types?.forEach((type: any) => {
          type.finishes?.forEach((finish: any) => {
            data.wood_finishes.push({
              ...finish,
              wood_type_id: type.id,
              wood_type: { name: type.name }
            })
          })
        })

        // Flatten metal hierarchy: Type → Finish → Color
        data.metal_types = result.data.metal_types || []
        data.metal_finishes = []
        data.metal_colors = []

        result.data.metal_types?.forEach((type: any) => {
          type.finishes?.forEach((finish: any) => {
            data.metal_finishes.push({
              ...finish,
              metal_type_id: type.id,
              metal_type: { name: type.name }
            })

            finish.colors?.forEach((color: any) => {
              data.metal_colors.push({
                ...color,
                metal_finish_id: finish.id,
                metal_finish: {
                  name: finish.name,
                  metal_type: { name: type.name }
                }
              })
            })
          })
        })

        // Flatten stone hierarchy: Type → Finish
        data.stone_types = result.data.stone_types || []
        data.stone_finishes = []

        result.data.stone_types?.forEach((type: any) => {
          type.finishes?.forEach((finish: any) => {
            data.stone_finishes.push({
              ...finish,
              stone_type_id: type.id,
              stone_type: { name: type.name }
            })
          })
        })

        // Flatten weaving hierarchy: Material → Pattern → Color
        data.weaving_materials = result.data.weaving_materials || []
        data.weaving_patterns = []
        data.weaving_colors = []

        result.data.weaving_materials?.forEach((material: any) => {
          material.patterns?.forEach((pattern: any) => {
            data.weaving_patterns.push({
              ...pattern,
              material_id: material.id,
              weaving_material: { name: material.name }
            })

            pattern.colors?.forEach((color: any) => {
              data.weaving_colors.push({
                ...color,
                pattern_id: pattern.id,
                weaving_pattern: {
                  name: pattern.name,
                  weaving_material: { name: material.name }
                }
              })
            })
          })
        })

        // Carving styles (flat structure)
        data.carving_styles = result.data.carving_styles || []

        setMaterialData(data)
        setError('')

        // If we don't have a subtab set, set it to the first table
        if (!activeSubTab || !activeCategory?.tables.includes(activeSubTab)) {
          setActiveSubTab(activeCategory?.tables[0] || 'fabric_brands')
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error loading material data:', error)
      setError('Failed to load materials. Please try again.')
      setMaterialData({})
    } finally {
      setLoading(false)
    }
  }, [activeCategory, activeSubTab])

  // Load parent options when dialog opens for hierarchical items
  const loadParentOptions = useCallback(async () => {
    if (!activeHierarchy?.parent || !activeCategory) return
    
    const parentTable = activeCategory.hierarchy.find(h => 
      h.table + '_id' === activeHierarchy.parent || 
      h.table.replace(/s$/, '') + '_id' === activeHierarchy.parent ||
      (activeHierarchy.parent === 'brand_id' && h.table === 'fabric_brands') ||
      (activeHierarchy.parent === 'material_id' && h.table === 'weaving_materials') ||
      (activeHierarchy.parent === 'pattern_id' && h.table === 'weaving_patterns') ||
      (activeHierarchy.parent === 'metal_finish_id' && h.table === 'metal_finishes')
    )?.table
    
    if (parentTable && materialData[parentTable]) {
      setParentOptions(materialData[parentTable])
    }
  }, [activeHierarchy, activeCategory, materialData])

  useEffect(() => {
    loadMaterialData()
  }, [loadMaterialData])

  useEffect(() => {
    loadParentOptions()
  }, [loadParentOptions, isAddDialogOpen])

  // Update activeSubTab when activeTab changes
  useEffect(() => {
    if (activeCategory) {
      setActiveSubTab(activeCategory.tables[0])
    }
  }, [activeTab, activeCategory])

  const currentData = materialData[activeSubTab] || []
  const filteredData = currentData.filter(item => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.hex_code?.toLowerCase().includes(searchLower)
    )
  })

  const handleAddItem = async () => {
    if (!activeHierarchy || !newItem.name) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(activeSubTab)
        .insert([{
          name: newItem.name,
          description: newItem.description || null,
          price_modifier: newItem.price_modifier || 0,
          hex_code: newItem.hex_code || null,
          sort_order: newItem.sort_order || null,
          active: true,
          ...(activeHierarchy.parent && newItem[activeHierarchy.parent] && {
            [activeHierarchy.parent]: newItem[activeHierarchy.parent]
          })
        }])
        .select()

      if (error) throw error

      // Reload data to get updated list
      await loadMaterialData()
      
      setNewItem({})
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Error adding item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem || !activeHierarchy) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from(activeSubTab)
        .update({
          name: newItem.name,
          description: newItem.description || null,
          price_modifier: newItem.price_modifier || 0,
          hex_code: newItem.hex_code || null,
          sort_order: newItem.sort_order || null,
          ...(activeHierarchy.parent && newItem[activeHierarchy.parent] && {
            [activeHierarchy.parent]: newItem[activeHierarchy.parent]
          })
        })
        .eq('id', editingItem.id)

      if (error) throw error

      // Reload data to get updated list
      await loadMaterialData()
      
      setEditingItem(null)
      setNewItem({})
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Error updating item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async (item: any) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from(activeSubTab)
        .delete()
        .eq('id', item.id)

      if (error) throw error

      await loadMaterialData()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error deleting item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditItem = (item: any) => {
    setEditingItem(item)
    setNewItem({
      name: item.name,
      description: item.description || '',
      price_modifier: item.price_modifier || 0,
      hex_code: item.hex_code || '',
      sort_order: item.sort_order || '',
      ...(activeHierarchy?.parent && {
        [activeHierarchy.parent]: item[activeHierarchy.parent]
      })
    })
    setIsAddDialogOpen(true)
  }

  const getParentName = (item: any) => {
    if (!activeHierarchy?.parent) return ''
    
    if (activeSubTab === 'fabric_collections') return item.brand?.name
    if (activeSubTab === 'fabric_colors') return `${item.collection?.brand?.name} > ${item.collection?.name}`
    if (activeSubTab === 'wood_finishes') return item.wood_type?.name
    if (activeSubTab === 'metal_finishes') return item.metal_type?.name
    if (activeSubTab === 'metal_colors') return `${item.metal_finish?.metal_type?.name} > ${item.metal_finish?.name}`
    if (activeSubTab === 'stone_finishes') return item.stone_type?.name
    if (activeSubTab === 'weaving_patterns') return item.weaving_material?.name
    if (activeSubTab === 'weaving_colors') return `${item.weaving_pattern?.weaving_material?.name} > ${item.weaving_pattern?.name}`
    
    return ''
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Materials Management"
        description="Manage all material options and their cascading relationships for order configuration"
        actions={
          <Button onClick={() => loadMaterialData()}>
            Refresh Data
          </Button>
        }
      />

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadMaterialData}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200">
            <TabsList className="grid w-full grid-cols-6 bg-transparent p-0 h-auto">
              {materialCategories.map(category => {
                const Icon = category.icon
                return (
                  <TabsTrigger 
                    key={category.key} 
                    value={category.key}
                    className="flex items-center justify-center px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{category.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {materialCategories.map(category => (
            <TabsContent key={category.key} value={category.key} className="p-0">
              {/* Sub-tabs for hierarchical categories */}
              {category.tables.length > 1 && (
                <div className="border-b border-gray-100 px-6 pt-4">
                  <div className="flex space-x-1">
                    {category.hierarchy.map((level, index) => (
                      <Button
                        key={level.table}
                        variant={activeSubTab === level.table ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveSubTab(level.table)}
                        className="h-8"
                      >
                        {index > 0 && <ChevronRight className="h-3 w-3 mr-1" />}
                        {level.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                      <category.icon className="h-5 w-5 mr-2" />
                      {activeHierarchy?.label || category.label}
                    </h2>
                    <p className="text-sm text-slate-600">{category.description}</p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                      <Input
                        placeholder={`Search ${activeHierarchy?.label.toLowerCase() || category.label.toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    
                    <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                      setIsAddDialogOpen(open)
                      if (!open) {
                        setEditingItem(null)
                        setNewItem({})
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add {activeHierarchy?.label.slice(0, -1) || category.label}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            {editingItem ? 'Edit' : 'Add New'} {activeHierarchy?.label.slice(0, -1) || category.label}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Parent selector for hierarchical items */}
                          {activeHierarchy?.parent && (
                            <div className="col-span-2">
                              <Label htmlFor="parent" className="text-sm font-medium">
                                Parent {activeHierarchy.parent.replace('_id', '').replace('_', ' ')}
                              </Label>
                              <Select
                                value={newItem[activeHierarchy.parent] || ''}
                                onValueChange={(value) => setNewItem((prev: Record<string, unknown>) => ({
                                  ...prev,
                                  [activeHierarchy.parent]: value
                                }))}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select parent..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {parentOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div>
                            <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
                            <Input
                              id="name"
                              value={newItem.name || ''}
                              onChange={(e) => setNewItem((prev: Record<string, unknown>) => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter name"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="price_modifier" className="text-sm font-medium">Price Modifier ($)</Label>
                            <Input
                              id="price_modifier"
                              type="number"
                              step="0.01"
                              value={newItem.price_modifier || ''}
                              onChange={(e) => setNewItem((prev: Record<string, unknown>) => ({ 
                                ...prev, 
                                price_modifier: parseFloat(e.target.value) || 0 
                              }))}
                              placeholder="0.00"
                              className="mt-1"
                            />
                          </div>

                          <div className="col-span-2">
                            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                            <Input
                              id="description"
                              value={newItem.description || ''}
                              onChange={(e) => setNewItem((prev: Record<string, unknown>) => ({ ...prev, description: e.target.value }))}
                              placeholder="Enter description (optional)"
                              className="mt-1"
                            />
                          </div>

                          {/* Color picker for color items */}
                          {(activeSubTab.includes('colors') || activeSubTab.includes('color')) && (
                            <div>
                              <Label htmlFor="hex_code" className="text-sm font-medium">Color Code</Label>
                              <Input
                                id="hex_code"
                                value={newItem.hex_code || ''}
                                onChange={(e) => setNewItem((prev: Record<string, unknown>) => ({ ...prev, hex_code: e.target.value }))}
                                placeholder="#ffffff"
                                className="mt-1"
                              />
                            </div>
                          )}

                          <div>
                            <Label htmlFor="sort_order" className="text-sm font-medium">Sort Order</Label>
                            <Input
                              id="sort_order"
                              type="number"
                              value={newItem.sort_order || ''}
                              onChange={(e) => setNewItem((prev: Record<string, unknown>) => ({ 
                                ...prev, 
                                sort_order: parseInt(e.target.value) || null 
                              }))}
                              placeholder="Optional"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-6">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsAddDialogOpen(false)
                              setEditingItem(null)
                              setNewItem({})
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={editingItem ? handleUpdateItem : handleAddItem} 
                            disabled={loading || !newItem.name}
                          >
                            {loading ? 'Saving...' : editingItem ? 'Update' : 'Add'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {activeHierarchy?.parent && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Parent
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Price Modifier
                        </th>
                        {(activeSubTab.includes('colors') || activeSubTab.includes('color')) && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Color
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            Loading...
                          </td>
                        </tr>
                      ) : filteredData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            No {activeHierarchy?.label.toLowerCase() || category.label.toLowerCase()} found. Add your first item to get started.
                          </td>
                        </tr>
                      ) : (
                        filteredData.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            {activeHierarchy?.parent && (
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {getParentName(item)}
                              </td>
                            )}
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              ${item.price_modifier || 0}
                            </td>
                            {(activeSubTab.includes('colors') || activeSubTab.includes('color')) && (
                              <td className="px-4 py-3 text-sm">
                                {item.hex_code ? (
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-6 h-6 rounded border border-gray-300" 
                                      style={{ backgroundColor: item.hex_code }}
                                    />
                                    <span className="text-slate-600">{item.hex_code}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-500">No color</span>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <Badge variant={item.active ? "default" : "secondary"} className="text-xs">
                                {item.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <Button size="sm" variant="ghost" onClick={() => handleEditItem(item)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(item)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}