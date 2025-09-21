'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { safeFormatString } from '@/lib/utils/string-helpers';

interface Item {
  id: string;
  name: string;
  sku_base: string;
  collection_id: string;
  description: string;
  lead_time_days: number;
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Inventory Management
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backordered';
  last_restocked: string | null;
  supplier: string;
  supplier_sku: string;
  unit_cost: number;
  
  // Dimensions
  width: number | null;
  depth: number | null;
  height: number | null;
  dimension_units: 'cm' | 'in';
  
  // Seating dimensions
  seat_height: number | null;
  seat_depth: number | null;
  seat_width: number | null;
  arm_height: number | null;
  back_height: number | null;
  
  // Detail dimensions
  clearance_height: number | null;
  cushion_thickness: number | null;
  table_top_thickness: number | null;
  
  // Shipping
  boxed_width: number | null;
  boxed_depth: number | null;
  boxed_height: number | null;
  weight_lbs: number | null;
  num_boxes: number;
  assembly_required: boolean;
  
  // Storage
  interior_width: number | null;
  interior_depth: number | null;
  interior_height: number | null;
  
  // Materials
  primary_material: string;
  secondary_materials: string;
  available_finishes: string;
  available_fabrics: string;
  
  // Images
  primary_image_url: string;
  
  // Collection info
  collections?: {
    id: string;
    name: string;
    prefix: string;
  } | null;
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams?.get('edit') === 'true';
  
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Item>>({});

  const loadItem = useCallback(async function() {
    try {
      const response = await fetch(`/api/items?collection_id=all`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const foundItem = data.data.find((i: Item) => i.id === resolvedParams.id);
        if (foundItem) {
          setItem(foundItem);
          setEditData(foundItem);
        }
      }
    } catch (error) {
      console.error('Error loading item:', error);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    loadItem();
  }, [resolvedParams.id, loadItem]);

  async function handleSave() {
    if (!item) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      
      if (response.ok) {
        const updatedItem = await response.json();
        setItem(updatedItem.data);
        router.push(`/dashboard/items/${item.id}`);
      }
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  }

  const handleInputChange = (field: keyof Item, value: unknown) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading item...</div>;
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Item not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const displayValue = (field: keyof Item) => isEditMode ? editData[field] : item[field];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Items', href: '/dashboard/items' },
          { label: item.name }
        ]}
      />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <p className="text-slate-600">SKU: {item.sku_base}</p>
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={() => router.push(`/dashboard/items/${item.id}`)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
              <Button onClick={() => router.push(`/dashboard/items/${item.id}?edit=true`)}>
                Edit Item
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label>Name</Label>
                  {isEditMode ? (
                    <Input
                      value={displayValue('name') as string}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  ) : (
                    <p className="font-medium">{item.name}</p>
                  )}
                </div>
                
                <div>
                  <Label>SKU Base</Label>
                  {isEditMode ? (
                    <Input
                      value={displayValue('sku_base') as string}
                      onChange={(e) => handleInputChange('sku_base', e.target.value)}
                    />
                  ) : (
                    <p className="font-mono">{item.sku_base}</p>
                  )}
                </div>
                
                <div>
                  <Label>Collection</Label>
                  <p>{item.collections?.name || 'No Collection'}</p>
                </div>
                
                <div>
                  <Label>Description</Label>
                  {isEditMode ? (
                    <Textarea
                      value={displayValue('description') as string}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <p>{item.description || 'No description available'}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Base Price</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={displayValue('base_price') as number}
                        onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value))}
                      />
                    ) : (
                      <p className="font-semibold">${item.base_price}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Lead Time</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        value={displayValue('lead_time_days') as number}
                        onChange={(e) => handleInputChange('lead_time_days', parseInt(e.target.value))}
                      />
                    ) : (
                      <p>{item.lead_time_days} days</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Status</Label>
                  {isEditMode ? (
                    <Select
                      value={displayValue('is_active') ? 'active' : 'inactive'}
                      onValueChange={(value) => handleInputChange('is_active', value === 'active')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
              </CardHeader>
              <CardContent>
                {item.primary_image_url ? (
                  <Image
                    src={item.primary_image_url}
                    alt={item.name}
                    width={400}
                    height={256}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-slate-500">No image available</p>
                  </div>
                )}
                {isEditMode && (
                  <div className="mt-4">
                    <Label>Image URL</Label>
                    <Input
                      value={displayValue('primary_image_url') as string}
                      onChange={(e) => handleInputChange('primary_image_url', e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dimensions">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overall Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label>Width</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={displayValue('width') as number || ''}
                        onChange={(e) => handleInputChange('width', parseFloat(e.target.value) || null)}
                      />
                    ) : (
                      <p>{item.width ? `${item.width} ${item.dimension_units}` : 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Depth</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={displayValue('depth') as number || ''}
                        onChange={(e) => handleInputChange('depth', parseFloat(e.target.value) || null)}
                      />
                    ) : (
                      <p>{item.depth ? `${item.depth} ${item.dimension_units}` : 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Height</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={displayValue('height') as number || ''}
                        onChange={(e) => handleInputChange('height', parseFloat(e.target.value) || null)}
                      />
                    ) : (
                      <p>{item.height ? `${item.height} ${item.dimension_units}` : 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Dimension Units</Label>
                    {isEditMode ? (
                      <Select
                        value={displayValue('dimension_units') as string}
                        onValueChange={(value) => handleInputChange('dimension_units', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">Centimeters (cm)</SelectItem>
                          <SelectItem value="in">Inches (in)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p>{item.dimension_units === 'cm' ? 'Centimeters (cm)' : 'Inches (in)'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seating Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {['seat_height', 'seat_depth', 'seat_width', 'arm_height', 'back_height'].map((field) => (
                  <div key={field}>
                    <Label>{safeFormatString(field, 'dimension').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={displayValue(field as keyof Item) as number || ''}
                        onChange={(e) => handleInputChange(field as keyof Item, parseFloat(e.target.value) || null)}
                      />
                    ) : (
                      <p>{item[field as keyof Item] ? `${item[field as keyof Item]} ${item.dimension_units}` : 'N/A'}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detail Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {['clearance_height', 'cushion_thickness', 'table_top_thickness'].map((field) => (
                  <div key={field}>
                    <Label>{safeFormatString(field, 'dimension').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={displayValue(field as keyof Item) as number || ''}
                        onChange={(e) => handleInputChange(field as keyof Item, parseFloat(e.target.value) || null)}
                      />
                    ) : (
                      <p>{item[field as keyof Item] ? `${item[field as keyof Item]} ${item.dimension_units}` : 'N/A'}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {['interior_width', 'interior_depth', 'interior_height'].map((field) => (
                  <div key={field}>
                    <Label>{safeFormatString(field, 'dimension').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={displayValue(field as keyof Item) as number || ''}
                        onChange={(e) => handleInputChange(field as keyof Item, parseFloat(e.target.value) || null)}
                      />
                    ) : (
                      <p>{item[field as keyof Item] ? `${item[field as keyof Item]} ${item.dimension_units}` : 'N/A'}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stock Quantity</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        value={displayValue('stock_quantity') as number}
                        onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value))}
                      />
                    ) : (
                      <p>{item.stock_quantity}</p>
                    )}
                  </div>
                  <div>
                    <Label>Available Quantity</Label>
                    <p>{item.available_quantity}</p>
                  </div>
                  <div>
                    <Label>Min Stock Level</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        value={displayValue('min_stock_level') as number}
                        onChange={(e) => handleInputChange('min_stock_level', parseInt(e.target.value))}
                      />
                    ) : (
                      <p>{item.min_stock_level}</p>
                    )}
                  </div>
                  <div>
                    <Label>Reorder Point</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        value={displayValue('reorder_point') as number}
                        onChange={(e) => handleInputChange('reorder_point', parseInt(e.target.value))}
                      />
                    ) : (
                      <p>{item.reorder_point}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Stock Status</Label>
                  <Badge variant={
                    item.stock_status === 'in_stock' ? 'default' :
                    item.stock_status === 'low_stock' ? 'secondary' : 'destructive'
                  }>
                    {safeFormatString(item.stock_status, 'in stock')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supplier Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label>Supplier</Label>
                  {isEditMode ? (
                    <Input
                      value={displayValue('supplier') as string}
                      onChange={(e) => handleInputChange('supplier', e.target.value)}
                    />
                  ) : (
                    <p>{item.supplier || 'N/A'}</p>
                  )}
                </div>
                
                <div>
                  <Label>Supplier SKU</Label>
                  {isEditMode ? (
                    <Input
                      value={displayValue('supplier_sku') as string}
                      onChange={(e) => handleInputChange('supplier_sku', e.target.value)}
                    />
                  ) : (
                    <p>{item.supplier_sku || 'N/A'}</p>
                  )}
                </div>
                
                <div>
                  <Label>Unit Cost</Label>
                  {isEditMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={displayValue('unit_cost') as number}
                      onChange={(e) => handleInputChange('unit_cost', parseFloat(e.target.value))}
                    />
                  ) : (
                    <p>${item.unit_cost}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Materials & Finishes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Primary Material</Label>
                {isEditMode ? (
                  <Input
                    value={displayValue('primary_material') as string}
                    onChange={(e) => handleInputChange('primary_material', e.target.value)}
                  />
                ) : (
                  <p>{item.primary_material || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <Label>Secondary Materials</Label>
                {isEditMode ? (
                  <Textarea
                    value={displayValue('secondary_materials') as string}
                    onChange={(e) => handleInputChange('secondary_materials', e.target.value)}
                  />
                ) : (
                  <p>{item.secondary_materials || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <Label>Available Finishes</Label>
                {isEditMode ? (
                  <Textarea
                    value={displayValue('available_finishes') as string}
                    onChange={(e) => handleInputChange('available_finishes', e.target.value)}
                  />
                ) : (
                  <p>{item.available_finishes || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <Label>Available Fabrics</Label>
                {isEditMode ? (
                  <Textarea
                    value={displayValue('available_fabrics') as string}
                    onChange={(e) => handleInputChange('available_fabrics', e.target.value)}
                  />
                ) : (
                  <p>{item.available_fabrics || 'N/A'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Packaging Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Boxed Width</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={displayValue('boxed_width') as number || ''}
                        onChange={(e) => handleInputChange('boxed_width', parseFloat(e.target.value) || null)}
                      />
                    ) : (
                      <p>{item.boxed_width ? `${item.boxed_width} ${item.dimension_units}` : 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Boxed Depth</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={displayValue('boxed_depth') as number || ''}
                        onChange={(e) => handleInputChange('boxed_depth', parseFloat(e.target.value) || null)}
                      />
                    ) : (
                      <p>{item.boxed_depth ? `${item.boxed_depth} ${item.dimension_units}` : 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Boxed Height</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={displayValue('boxed_height') as number || ''}
                        onChange={(e) => handleInputChange('boxed_height', parseFloat(e.target.value) || null)}
                      />
                    ) : (
                      <p>{item.boxed_height ? `${item.boxed_height} ${item.dimension_units}` : 'N/A'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label>Weight (lbs)</Label>
                  {isEditMode ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={displayValue('weight_lbs') as number || ''}
                      onChange={(e) => handleInputChange('weight_lbs', parseFloat(e.target.value) || null)}
                    />
                  ) : (
                    <p>{item.weight_lbs ? `${item.weight_lbs} lbs` : 'N/A'}</p>
                  )}
                </div>
                
                <div>
                  <Label>Number of Boxes</Label>
                  {isEditMode ? (
                    <Input
                      type="number"
                      value={displayValue('num_boxes') as number}
                      onChange={(e) => handleInputChange('num_boxes', parseInt(e.target.value))}
                    />
                  ) : (
                    <p>{item.num_boxes}</p>
                  )}
                </div>
                
                <div>
                  <Label>Assembly Required</Label>
                  {isEditMode ? (
                    <Select
                      value={displayValue('assembly_required') ? 'true' : 'false'}
                      onValueChange={(value) => handleInputChange('assembly_required', value === 'true')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p>{item.assembly_required ? 'Yes' : 'No'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}