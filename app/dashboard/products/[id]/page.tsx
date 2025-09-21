'use client';
 

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { safeFormatString } from '@/lib/utils/string-helpers';

interface SKU {
  id: string;
  sku_code: string;
  base_item_id: string;
  base_item_name: string;
  collection_name: string;
  order_id?: string;
  customer_name?: string;
  
  // Material & Finish Selections
  primary_material: string;
  material_finish: string;
  fabric_selection?: string;
  leather_type?: string;
  wood_stain?: string;
  metal_finish?: string;
  
  // Dimensions & Specifications
  final_width: number;
  final_depth: number;
  final_height: number;
  dimension_units: string;
  
  // Seating dimensions
  seat_height?: number;
  seat_depth?: number;
  seat_width?: number;
  arm_height?: number;
  back_height?: number;
  
  // Detail dimensions
  clearance_height?: number;
  cushion_thickness?: number;
  table_top_thickness?: number;
  
  // Storage dimensions
  interior_width?: number;
  interior_depth?: number;
  interior_height?: number;
  
  // Packaging & Shipping
  boxed_width: number;
  boxed_depth: number;
  boxed_height: number;
  weight_lbs: number;
  shipping_weight_lbs: number;
  num_boxes: number;
  
  // Production Details
  production_status: 'pending' | 'in_production' | 'quality_check' | 'ready_to_ship' | 'shipped' | 'delivered';
  estimated_completion: string;
  actual_completion?: string;
  
  // Pricing
  base_price: number;
  material_upcharge: number;
  customization_fee: number;
  final_price: number;
  
  // Tracking
  created_at: string;
  updated_at: string;
  qr_code?: string;
  label_printed: boolean;
  
  // Additional details for detail view
  production_notes?: string;
  quality_check_notes?: string;
  shipping_tracking?: string;
  manufacturer_assigned?: string;
  estimated_production_hours?: number;
  actual_production_hours?: number;
}

export default function SKUDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [sku, setSKU] = useState<SKU | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  // State for data fetched from API
  const [allProducts, setAllProducts] = useState<{ [key: string]: SKU }>({});

  const loadSKU = useCallback(async () => {
    if (!resolvedParams) return;

    try {
      setLoading(true);

      // First, try to find the SKU in already loaded products
      if (allProducts[resolvedParams.id]) {
        setSKU(allProducts[resolvedParams.id]);
        setLoading(false);
        return;
      }

      // If not found locally, fetch products from API
      const response = await fetch('/api/products', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // Transform API response to match SKU interface
          const transformedProducts: { [key: string]: SKU } = {};

          data.data.forEach((product: Record<string, unknown>, index: number) => {
            const transformedSKU: SKU = {
              id: String(product.id || String(index + 1)),
              sku_code: String(product.sku_full || product.base_sku || 'Unknown SKU'),
              base_item_id: String(product.item_id || 'unknown'),
              base_item_name: String(product.item_name || 'Unknown Item'),
              collection_name: String(product.collection_name || 'General'),
              order_id: String(product.order_number || product.order_id || 'Unknown Order'),
              customer_name: String(product.customer_name || 'Unknown Customer'),
              primary_material: String((product.materials as Record<string, unknown>)?.wood || (product.materials as Record<string, unknown>)?.fabric || 'Unknown'),
              material_finish: String((product.materials as Record<string, unknown>)?.finish || 'Natural'),
              fabric_selection: (product.materials as Record<string, unknown>)?.fabric ? String((product.materials as Record<string, unknown>).fabric) : undefined,
              leather_type: (product.materials as Record<string, unknown>)?.leather_type ? String((product.materials as Record<string, unknown>).leather_type) : undefined,
              wood_stain: (product.materials as Record<string, unknown>)?.wood_stain ? String((product.materials as Record<string, unknown>).wood_stain) : undefined,
              metal_finish: (product.materials as Record<string, unknown>)?.metal_finish ? String((product.materials as Record<string, unknown>).metal_finish) : undefined,
              final_width: Number((product.dimensions as Record<string, unknown>)?.width || 100),
              final_depth: Number((product.dimensions as Record<string, unknown>)?.depth || 100),
              final_height: Number((product.dimensions as Record<string, unknown>)?.height || 100),
              dimension_units: String((product.dimensions as Record<string, unknown>)?.units || 'cm'),
              seat_height: (product.dimensions as Record<string, unknown>)?.seat_height ? Number((product.dimensions as Record<string, unknown>).seat_height) : undefined,
              seat_depth: (product.dimensions as Record<string, unknown>)?.seat_depth ? Number((product.dimensions as Record<string, unknown>).seat_depth) : undefined,
              seat_width: (product.dimensions as Record<string, unknown>)?.seat_width ? Number((product.dimensions as Record<string, unknown>).seat_width) : undefined,
              arm_height: (product.dimensions as Record<string, unknown>)?.arm_height ? Number((product.dimensions as Record<string, unknown>).arm_height) : undefined,
              back_height: (product.dimensions as Record<string, unknown>)?.back_height ? Number((product.dimensions as Record<string, unknown>).back_height) : undefined,
              clearance_height: (product.dimensions as Record<string, unknown>)?.clearance_height ? Number((product.dimensions as Record<string, unknown>).clearance_height) : undefined,
              cushion_thickness: (product.dimensions as Record<string, unknown>)?.cushion_thickness ? Number((product.dimensions as Record<string, unknown>).cushion_thickness) : undefined,
              table_top_thickness: (product.dimensions as Record<string, unknown>)?.table_top_thickness ? Number((product.dimensions as Record<string, unknown>).table_top_thickness) : undefined,
              interior_width: (product.dimensions as Record<string, unknown>)?.interior_width ? Number((product.dimensions as Record<string, unknown>).interior_width) : undefined,
              interior_depth: (product.dimensions as Record<string, unknown>)?.interior_depth ? Number((product.dimensions as Record<string, unknown>).interior_depth) : undefined,
              interior_height: (product.dimensions as Record<string, unknown>)?.interior_height ? Number((product.dimensions as Record<string, unknown>).interior_height) : undefined,
              boxed_width: Number((product.dimensions as Record<string, unknown>)?.boxed_width || Number((product.dimensions as Record<string, unknown>)?.width || 100) + 10),
              boxed_depth: Number((product.dimensions as Record<string, unknown>)?.boxed_depth || Number((product.dimensions as Record<string, unknown>)?.depth || 100) + 10),
              boxed_height: Number((product.dimensions as Record<string, unknown>)?.boxed_height || Number((product.dimensions as Record<string, unknown>)?.height || 100) + 10),
              weight_lbs: Number((product.dimensions as Record<string, unknown>)?.weight_lbs || 50),
              shipping_weight_lbs: Number((product.dimensions as Record<string, unknown>)?.shipping_weight_lbs || 60),
              num_boxes: Number((product.dimensions as Record<string, unknown>)?.num_boxes || 1),
              production_status: (product.status === 'pending' ? 'pending' :
                                product.status === 'in_production' ? 'in_production' :
                                product.status === 'completed' ? 'ready_to_ship' :
                                product.status === 'shipped' ? 'shipped' :
                                product.status === 'delivered' ? 'delivered' : 'pending') as SKU['production_status'],
              estimated_completion: String(product.estimated_completion || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
              actual_completion: product.actual_completion ? String(product.actual_completion) : undefined,
              base_price: Number(product.unit_price || 1000),
              material_upcharge: 0,
              customization_fee: 0,
              final_price: Number(product.total_price || product.unit_price || 1000),
              created_at: String(product.created_at || new Date().toISOString()),
              updated_at: String(product.updated_at || new Date().toISOString()),
              qr_code: undefined,
              label_printed: false,
              production_notes: product.custom_specifications ? String(product.custom_specifications) : undefined,
              quality_check_notes: undefined,
              shipping_tracking: undefined,
              manufacturer_assigned: undefined,
              estimated_production_hours: undefined,
              actual_production_hours: undefined
            };
            transformedProducts[transformedSKU.id] = transformedSKU;
          });

          setAllProducts(transformedProducts);

          // Find the requested SKU
          const foundSKU = transformedProducts[resolvedParams.id];
          if (foundSKU) {
            setSKU(foundSKU);
          } else {
            setSKU(null);
          }
        } else {
          setSKU(null);
        }
      } else {
        console.error('Failed to fetch products:', response.status);
        setSKU(null);
      }
    } catch (error) {
      console.error('Error loading SKU:', error);
      setSKU(null);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams, allProducts]);

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (resolvedParams) {
      loadSKU();
    }
  }, [resolvedParams, loadSKU]);

  const getStatusColor = (status: SKU['production_status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-slate-900';
      case 'in_production': return 'bg-blue-100 text-blue-800';
      case 'quality_check': return 'bg-yellow-100 text-yellow-800';
      case 'ready_to_ship': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-slate-900';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const generateLabel = async () => {
    if (!sku) return;
    console.log('Generating label for SKU:', sku.sku_code);
    alert(`Label generation initiated for ${sku.sku_code}`);
  };

  const generateQRCode = async () => {
    if (!sku) return;
    console.log('Generating QR code for SKU:', sku.sku_code);
    alert(`QR code generated for ${sku.sku_code}`);
  };

  const printShippingLabel = async () => {
    if (!sku) return;
    console.log('Generating shipping label for SKU:', sku.sku_code);
    alert(`Shipping label generated for ${sku.sku_code}`);
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading SKU details...</div>;
  }

  if (!sku) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>SKU not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Products', href: '/dashboard/products' },
          { label: sku.sku_code }
        ]}
      />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{sku.sku_code}</h1>
          <p className="text-slate-600">{sku.base_item_name} - {sku.collection_name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back to SKUs
          </Button>
          <Button onClick={generateLabel}>
            {sku.label_printed ? 'Reprint Label' : 'Print Label'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="materials">Materials & Specs</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>SKU Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">SKU Code</label>
                  <p className="font-mono text-lg">{sku.sku_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Base Item</label>
                  <p className="font-medium">{sku.base_item_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Collection</label>
                  <p>{sku.collection_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(sku.production_status)}>
                      {safeFormatString(sku.production_status, 'pending')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Final Dimensions</label>
                  <p>{sku.final_width} × {sku.final_depth} × {sku.final_height} {sku.dimension_units}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order & Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Order ID</label>
                  <p className="font-mono">{sku.order_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Customer</label>
                  <p className="font-medium">{sku.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Created</label>
                  <p>{formatDate(sku.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Last Updated</label>
                  <p>{formatDate(sku.updated_at)}</p>
                </div>
                {sku.qr_code && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">QR Code</label>
                    <p className="font-mono">{sku.qr_code}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Production Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Current Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(sku.production_status)}>
                      {safeFormatString(sku.production_status, 'pending')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Estimated Completion</label>
                  <p>{formatDate(sku.estimated_completion)}</p>
                </div>
                {sku.actual_completion && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Actual Completion</label>
                    <p>{formatDate(sku.actual_completion)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-500">Assigned Workshop</label>
                  <p>{sku.manufacturer_assigned || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Production Hours</label>
                  <p>
                    {sku.actual_production_hours || 0} / {sku.estimated_production_hours || 0} hours
                    {sku.actual_production_hours && sku.estimated_production_hours && 
                      ` (${((sku.actual_production_hours / sku.estimated_production_hours) * 100).toFixed(1)}%)`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sku.production_notes && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Production Notes</label>
                    <p className="text-sm bg-gray-50 p-3 rounded-md">{sku.production_notes}</p>
                  </div>
                )}
                {sku.quality_check_notes && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Quality Check Notes</label>
                    <p className="text-sm bg-yellow-50 p-3 rounded-md">{sku.quality_check_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="materials">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Materials & Finishes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-500">Primary Material</label>
                      <p className="font-medium">{sku.primary_material}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-500">Material Finish</label>
                      <p>{sku.material_finish}</p>
                    </div>
                    {sku.fabric_selection && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Fabric Selection</label>
                        <p>{sku.fabric_selection}</p>
                      </div>
                    )}
                    {sku.leather_type && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Leather Type</label>
                        <p>{sku.leather_type}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-500">Weight Information</label>
                      <div className="space-y-1">
                        <p>Item Weight: {sku.weight_lbs} lbs</p>
                        <p>Shipping Weight: {sku.shipping_weight_lbs} lbs</p>
                        <p>Number of Boxes: {sku.num_boxes}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Overall Dimensions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Width</label>
                    <p>{sku.final_width} {sku.dimension_units}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Depth</label>
                    <p>{sku.final_depth} {sku.dimension_units}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Height</label>
                    <p>{sku.final_height} {sku.dimension_units}</p>
                  </div>
                </CardContent>
              </Card>

              {(sku.seat_height || sku.seat_depth || sku.seat_width || sku.arm_height || sku.back_height) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Seating Dimensions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sku.seat_height && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Seat Height</label>
                        <p>{sku.seat_height} {sku.dimension_units}</p>
                      </div>
                    )}
                    {sku.seat_depth && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Seat Depth</label>
                        <p>{sku.seat_depth} {sku.dimension_units}</p>
                      </div>
                    )}
                    {sku.seat_width && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Seat Width</label>
                        <p>{sku.seat_width} {sku.dimension_units}</p>
                      </div>
                    )}
                    {sku.arm_height && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Arm Height</label>
                        <p>{sku.arm_height} {sku.dimension_units}</p>
                      </div>
                    )}
                    {sku.back_height && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Back Height</label>
                        <p>{sku.back_height} {sku.dimension_units}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(sku.clearance_height || sku.cushion_thickness || sku.table_top_thickness) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detail Dimensions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sku.clearance_height && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Clearance Height</label>
                        <p>{sku.clearance_height} {sku.dimension_units}</p>
                      </div>
                    )}
                    {sku.cushion_thickness && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Cushion Thickness</label>
                        <p>{sku.cushion_thickness} {sku.dimension_units}</p>
                      </div>
                    )}
                    {sku.table_top_thickness && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Table Top Thickness</label>
                        <p>{sku.table_top_thickness} {sku.dimension_units}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(sku.interior_width || sku.interior_depth || sku.interior_height) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Storage Dimensions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sku.interior_width && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Interior Width</label>
                        <p>{sku.interior_width} {sku.dimension_units}</p>
                      </div>
                    )}
                    {sku.interior_depth && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Interior Depth</label>
                        <p>{sku.interior_depth} {sku.dimension_units}</p>
                      </div>
                    )}
                    {sku.interior_height && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Interior Height</label>
                        <p>{sku.interior_height} {sku.dimension_units}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Packaging Dimensions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Boxed Width</label>
                    <p>{sku.boxed_width} {sku.dimension_units}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Boxed Depth</label>
                    <p>{sku.boxed_depth} {sku.dimension_units}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Boxed Height</label>
                    <p>{sku.boxed_height} {sku.dimension_units}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-500">Base Price</label>
                  <p className="font-medium">{formatCurrency(sku.base_price)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-500">Material Upcharge</label>
                  <p className="font-medium">+ {formatCurrency(sku.material_upcharge)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-500">Customization Fee</label>
                  <p className="font-medium">+ {formatCurrency(sku.customization_fee)}</p>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-lg font-semibold">Final Price</label>
                    <p className="text-xl font-bold">{formatCurrency(sku.final_price)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Labels & Codes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Production Label</label>
                  <div className="flex items-center justify-between">
                    <p>{sku.label_printed ? 'Printed' : 'Not printed'}</p>
                    <Button size="sm" variant="outline" onClick={generateLabel}>
                      {sku.label_printed ? 'Reprint' : 'Print Label'}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">QR Code</label>
                  <div className="flex items-center justify-between">
                    <p className="font-mono">{sku.qr_code || 'Not generated'}</p>
                    <Button size="sm" variant="outline" onClick={generateQRCode}>
                      {sku.qr_code ? 'Update' : 'Generate'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sku.shipping_tracking && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Tracking Number</label>
                    <p className="font-mono">{sku.shipping_tracking}</p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-500">Shipping Label</label>
                  <Button size="sm" variant="outline" onClick={printShippingLabel}>
                    Print Shipping Label
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}