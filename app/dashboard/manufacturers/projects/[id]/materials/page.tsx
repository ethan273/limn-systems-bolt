'use client'

import { useState, useEffect } from 'react'
// import { createClient } from '@/lib/supabase/client' - removed unused
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  ArrowLeft,
  Plus,
  Edit
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface ProjectMaterial {
  id: string
  material_name: string
  material_type: string
  supplier_name: string
  quantity_needed: number
  quantity_ordered: number
  quantity_received: number
  unit_of_measure: string
  unit_cost: number
  total_cost: number
  order_date?: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  status: 'planning' | 'ordered' | 'partial_received' | 'received' | 'delayed' | 'cancelled'
  quality_grade?: string
  storage_location?: string
  notes?: string
}

export default function MaterialTrackingPage() {
  const params = useParams()
  const projectId = params?.id as string
  
  const [materials, setMaterials] = useState<ProjectMaterial[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)

  // const supabase = createClient() - removed unused

  useEffect(() => {
    loadMaterials()
  }, [projectId])

  const loadMaterials = async () => {
    setLoading(true)
    try {
      // Mock data - will connect to project_materials table
      const mockMaterials: ProjectMaterial[] = [
        {
          id: '1',
          material_name: 'White Oak Lumber',
          material_type: 'wood',
          supplier_name: 'Pacific Lumber Co',
          quantity_needed: 50,
          quantity_ordered: 55,
          quantity_received: 55,
          unit_of_measure: 'board_feet',
          unit_cost: 12.50,
          total_cost: 687.50,
          order_date: '2024-02-15',
          expected_delivery_date: '2024-02-28',
          actual_delivery_date: '2024-02-26',
          status: 'received',
          quality_grade: 'A+',
          storage_location: 'Warehouse A-1',
          notes: 'Premium grade lumber, excellent grain pattern'
        },
        {
          id: '2',
          material_name: 'Stainless Steel Hardware',
          material_type: 'hardware',
          supplier_name: 'Industrial Fasteners Inc',
          quantity_needed: 200,
          quantity_ordered: 250,
          quantity_received: 0,
          unit_of_measure: 'pieces',
          unit_cost: 2.75,
          total_cost: 687.50,
          order_date: '2024-03-01',
          expected_delivery_date: '2024-03-15',
          status: 'ordered',
          notes: 'Custom threading required'
        },
        {
          id: '3',
          material_name: 'Wood Stain - Walnut',
          material_type: 'finishing',
          supplier_name: 'Sherwin Williams',
          quantity_needed: 5,
          quantity_ordered: 6,
          quantity_received: 3,
          unit_of_measure: 'gallons',
          unit_cost: 45.00,
          total_cost: 270.00,
          order_date: '2024-02-20',
          expected_delivery_date: '2024-03-01',
          actual_delivery_date: '2024-03-03',
          status: 'partial_received',
          quality_grade: 'Standard',
          storage_location: 'Chemical Storage',
          notes: 'Waiting for remaining 3 gallons'
        },
        {
          id: '4',
          material_name: 'Foam Padding',
          material_type: 'upholstery',
          supplier_name: 'Comfort Materials',
          quantity_needed: 25,
          quantity_ordered: 30,
          quantity_received: 0,
          unit_of_measure: 'square_yards',
          unit_cost: 18.00,
          total_cost: 540.00,
          order_date: '2024-03-05',
          expected_delivery_date: '2024-03-20',
          status: 'delayed',
          notes: 'Supplier manufacturing delay, revised delivery 3/25'
        }
      ]

      setMaterials(mockMaterials)
      setProjectName('Scandinavian Dining Chair - Prototype')
    } catch (error) {
      console.log('Error loading materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'bg-gray-100 text-slate-900',
      ordered: 'bg-blue-100 text-blue-800',
      partial_received: 'bg-yellow-100 text-yellow-800',
      received: 'bg-green-100 text-green-800',
      delayed: 'bg-red-100 text-red-800',
      cancelled: 'bg-orange-100 text-orange-800'
    }
    return colors[status as keyof typeof colors] || colors.planning
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'partial_received':
        return <Package className="h-4 w-4 text-yellow-600" />
      case 'delayed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'ordered':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-slate-500" />
    }
  }

  const getReceivalProgress = (material: ProjectMaterial) => {
    return (material.quantity_received / material.quantity_ordered) * 100
  }

  const stats = {
    totalMaterials: materials.length,
    totalCost: materials.reduce((sum, m) => sum + m.total_cost, 0),
    receivedMaterials: materials.filter(m => m.status === 'received').length,
    delayedMaterials: materials.filter(m => m.status === 'delayed').length,
    overallProgress: Math.round(
      (materials.reduce((sum, m) => sum + getReceivalProgress(m), 0) / materials.length) || 0
    )
  }

  if (loading) {
    return <div className="p-6">Loading materials...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/manufacturers/projects/${projectId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Material Tracking</h1>
            <p className="text-slate-600">{projectName}</p>
          </div>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMaterials}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.receivedMaterials}</div>
            <div className="text-sm text-slate-600">fully received</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.delayedMaterials}</div>
            <div className="text-sm text-slate-600">behind schedule</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{stats.overallProgress}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${stats.overallProgress}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Materials</TabsTrigger>
          <TabsTrigger value="pending">Pending Delivery</TabsTrigger>
          <TabsTrigger value="delayed">Delayed</TabsTrigger>
          <TabsTrigger value="by-type">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {materials.map(material => (
            <Card key={material.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="mt-1">
                      {getStatusIcon(material.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{material.material_name}</h3>
                        <Badge className={getStatusColor(material.status)}>
                          {(material.status || 'pending').replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-slate-600">Supplier</div>
                          <div className="font-medium flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            {material.supplier_name}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-slate-600">Quantity</div>
                          <div className="font-medium">
                            {material.quantity_received}/{material.quantity_ordered} {material.unit_of_measure}
                          </div>
                          {material.status !== 'received' && (
                            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                              <div className="bg-blue-600 h-1 rounded-full transition-all duration-300" style={{ width: `${getReceivalProgress(material)}%` }}></div>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="text-slate-600">Cost</div>
                          <div className="font-medium flex items-center">
                            <DollarSign className="h-3 w-3 mr-1" />
                            ${material.total_cost.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-600">
                            ${material.unit_cost} per {material.unit_of_measure}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-slate-600">Delivery</div>
                          <div className="font-medium flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {material.actual_delivery_date 
                              ? new Date(material.actual_delivery_date).toLocaleDateString()
                              : material.expected_delivery_date 
                                ? new Date(material.expected_delivery_date).toLocaleDateString()
                                : 'TBD'
                            }
                          </div>
                        </div>
                      </div>
                      
                      {material.quality_grade && (
                        <div className="mt-3 text-sm">
                          <span className="text-slate-600">Quality Grade: </span>
                          <Badge variant="outline">{material.quality_grade}</Badge>
                        </div>
                      )}
                      
                      {material.storage_location && (
                        <div className="mt-2 text-sm">
                          <span className="text-slate-600">Location: </span>
                          <span className="font-medium">{material.storage_location}</span>
                        </div>
                      )}
                      
                      {material.notes && (
                        <div className="mt-3 text-sm text-slate-600 bg-gray-50 p-2 rounded">
                          {material.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-6 text-center text-slate-600">
              Materials with pending deliveries will be shown here
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delayed">
          <Card>
            <CardContent className="p-6 text-center text-slate-600">
              Delayed materials will be shown here
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-type">
          <Card>
            <CardContent className="p-6 text-center text-slate-600">
              Materials grouped by category will be shown here
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}