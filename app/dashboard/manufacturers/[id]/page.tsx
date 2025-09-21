'use client'

import { useState, useEffect, useCallback } from 'react';
import { formatAddress } from '@/lib/utils/safe-render';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  FileText, 
  BarChart3, 
  MessageSquare, 
  FileCheck,
  Edit,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { safeFormatString } from '@/lib/utils/string-helpers';

interface Manufacturer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  status: 'prospect' | 'approved' | 'preferred' | 'suspended' | 'inactive';
  rating: number;
  capabilities: string[];
  certifications: string[];
  specialties: string[];
  performance_metrics: {
    on_time_delivery: number;
    quality_rating: number;
    communication_rating: number;
    cost_competitiveness: number;
    total_projects: number;
    total_value: number;
  };
  created_at: string;
  updated_at: string;
}

interface ManufacturerProject {
  id: string;
  project_name: string;
  customer_name: string;
  status: 'quoted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  total_value: number;
  quoted_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_completion: string;
}

interface ShopDrawing {
  id: string;
  project_name: string;
  version: number;
  status: 'pending' | 'in_review' | 'approved' | 'revision_required';
  submitted_at: string;
  deadline: string;
  revision_count: number;
}

interface Communication {
  id: string;
  type: 'email' | 'phone' | 'meeting' | 'note';
  subject: string;
  content: string;
  created_at: string;
  created_by: string;
  priority: 'low' | 'medium' | 'high';
}

export default function ManufacturerDetailPage() {
  const params = useParams();
  const manufacturerId = params?.id as string;
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [projects, setProjects] = useState<ManufacturerProject[]>([]);
  const [shopDrawings, setShopDrawings] = useState<ShopDrawing[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { canEdit } = usePermissions();

  const fetchManufacturerData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch manufacturer data from API
      const manufacturerResponse = await fetch(`/api/manufacturers/${manufacturerId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (manufacturerResponse.ok) {
        const manufacturerData = await manufacturerResponse.json();
        if (manufacturerData.success) {
          // Map API response to component interface
          const mappedManufacturer: Manufacturer = {
            id: manufacturerData.data.id,
            company_name: manufacturerData.data.name || '',
            contact_name: manufacturerData.data.contact_person || '',
            email: manufacturerData.data.contact_email || '',
            phone: manufacturerData.data.contact_phone || '',
            address: {
              street: '',
              city: '',
              state: '',
              zip: '',
              country: 'US'
            },
            status: manufacturerData.data.is_active ? 'approved' : 'inactive',
            rating: manufacturerData.data.quality_rating || 0,
            capabilities: [],
            certifications: [],
            specialties: manufacturerData.data.specialties || [],
            performance_metrics: {
              on_time_delivery: 0,
              quality_rating: manufacturerData.data.quality_rating || 0,
              communication_rating: 0,
              cost_competitiveness: 0,
              total_projects: 0,
              total_value: 0
            },
            created_at: manufacturerData.data.created_at || '',
            updated_at: manufacturerData.data.updated_at || ''
          };
          setManufacturer(mappedManufacturer);
        }
      } else {
        console.error('Failed to fetch manufacturer data:', manufacturerResponse.status);
        setManufacturer(null);
      }

      // Fetch manufacturer's projects
      const projectsResponse = await fetch(`/api/manufacturers/projects?manufacturerId=${manufacturerId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        if (Array.isArray(projectsData)) {
          // Map API response to component interface
          const mappedProjects: ManufacturerProject[] = projectsData.map((project: Record<string, unknown>) => ({
            id: String(project.id || ''),
            project_name: String(project.project_name || ''),
            customer_name: String(((project.order as Record<string, unknown>)?.customer as Record<string, unknown>)?.name || 'Unknown Customer'),
            status: (project.status === 'quoted' || project.status === 'in_progress' || project.status === 'completed' || project.status === 'cancelled') ? project.status : 'quoted',
            priority: (project.priority === 'low' || project.priority === 'medium' || project.priority === 'high' || project.priority === 'urgent') ? project.priority : 'medium',
            total_value: Number(project.quoted_price || 0),
            quoted_at: String(project.quote_date || project.created_at || ''),
            started_at: (project.production_tracking as Record<string, unknown>[])?.[0]?.started_at ? String((project.production_tracking as Record<string, unknown>[])[0].started_at) : undefined,
            completed_at: project.completion_date ? String(project.completion_date) : undefined,
            estimated_completion: String((project.production_tracking as Record<string, unknown>[])?.[0]?.estimated_completion || '')
          }));
          setProjects(mappedProjects);
        } else {
          setProjects([]);
        }
      } else {
        console.error('Failed to fetch projects data:', projectsResponse.status);
        setProjects([]);
      }

      // TODO: Replace with real API calls when shop drawings and communications endpoints are available
      // For now, use empty arrays as placeholders
      setShopDrawings([]);
      setCommunications([]);
    } catch (error) {
      console.error('Error fetching manufacturer data:', error);
      setManufacturer(null);
      setProjects([]);
      setShopDrawings([]);
      setCommunications([]);
    } finally {
      setLoading(false);
    }
  }, [manufacturerId]);

  useEffect(() => {
    if (manufacturerId) {
      fetchManufacturerData();
    }
  }, [manufacturerId, fetchManufacturerData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'prospect': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'preferred': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-300';
      case 'inactive': return 'bg-gray-100 text-slate-900 border-gray-300';
      default: return 'bg-gray-100 text-slate-900 border-gray-300';
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'quoted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-slate-900';
    }
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-slate-600">({rating}/5)</span>
      </div>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-stone-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">Manufacturer not found</h3>
          <p className="mt-1 text-sm text-slate-600">
            The manufacturer you are looking for does not exist or you do not have permission to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Manufacturers', href: '/dashboard/manufacturers' },
          { label: manufacturer.company_name }
        ]}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">{manufacturer.company_name}</h1>
          <div className="flex items-center space-x-4">
            <Badge className={`${getStatusColor(manufacturer.status)}`}>
              {manufacturer.status}
            </Badge>
            {renderStarRating(manufacturer.rating)}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Log Communication
          </Button>
          {canEdit('manufacturers') && (
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {editMode ? 'Save Changes' : 'Edit'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="shop-drawings">Shop Drawings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card className="border border-stone-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-600">Primary Contact</p>
                      <p className="font-medium">{manufacturer.contact_name}</p>
                      <p className="text-sm text-slate-600">{manufacturer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-600">Phone</p>
                      <p className="font-medium">{manufacturer.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-600">Address</p>
                      <p className="font-medium">{formatAddress(manufacturer.address)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Capabilities & Certifications */}
            <Card className="border border-stone-200">
              <CardHeader>
                <CardTitle className="text-lg">Capabilities & Certifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-2">
                    {(manufacturer.capabilities || []).map((capability, index) => (
                      <Badge key={index} variant="secondary" className="bg-stone-100">
                        {safeFormatString(capability, 'capability')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {(manufacturer.certifications || []).map((cert, index) => (
                      <Badge key={index} variant="outline" className="border-green-300 text-green-800">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Specialties</p>
                  <div className="space-y-1">
                    {(manufacturer.specialties || []).map((specialty, index) => (
                      <p key={index} className="text-sm">{specialty}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-stone-200">
              <CardContent className="pt-8 px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Projects</p>
                    <p className="text-2xl font-bold text-slate-900">{manufacturer.performance_metrics.total_projects}</p>
                  </div>
                  <Package className="h-8 w-8 text-stone-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-stone-200">
              <CardContent className="pt-8 px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Value</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(manufacturer.performance_metrics.total_value)}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-stone-200">
              <CardContent className="pt-8 px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">On-Time Delivery</p>
                    <p className="text-2xl font-bold text-green-600">
                      {manufacturer.performance_metrics.on_time_delivery}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-stone-200">
              <CardContent className="pt-8 px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Quality Rating</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {manufacturer.performance_metrics.quality_rating}/5
                    </p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Projects</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.id} className="border border-stone-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between pt-2">
                    <div className="space-y-2">
                      <h4 className="font-medium text-slate-900">{project.project_name}</h4>
                      <p className="text-sm text-slate-600">Customer: {project.customer_name}</p>
                      <div className="flex items-center space-x-4">
                        <Badge className={`${getProjectStatusColor(project.status)}`}>
                          {safeFormatString(project.status, 'pending')}
                        </Badge>
                        <span className="text-sm text-slate-600">
                          {formatCurrency(project.total_value)}
                        </span>
                        <span className="text-sm text-slate-600">
                          Quoted: {formatDate(project.quoted_at)}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Shop Drawings Tab */}
        <TabsContent value="shop-drawings" className="space-y-4">
          <h3 className="text-lg font-medium">Shop Drawings</h3>
          <div className="space-y-4">
            {shopDrawings.map((drawing) => (
              <Card key={drawing.id} className="border border-stone-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between pt-2">
                    <div className="space-y-2">
                      <h4 className="font-medium text-slate-900">{drawing.project_name}</h4>
                      <div className="flex items-center space-x-4">
                        <Badge className={`${getProjectStatusColor(drawing.status)}`}>
                          {safeFormatString(drawing.status, 'pending')}
                        </Badge>
                        <span className="text-sm text-slate-600">
                          Version {drawing.version}
                        </span>
                        <span className="text-sm text-slate-600">
                          Revisions: {drawing.revision_count}
                        </span>
                        <span className="text-sm text-slate-600">
                          Deadline: {formatDate(drawing.deadline)}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Drawing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <h3 className="text-lg font-medium">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-stone-200">
              <CardHeader>
                <CardTitle className="text-lg">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">On-Time Delivery</span>
                    <span className="font-medium">{manufacturer.performance_metrics.on_time_delivery}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Quality Rating</span>
                    <span className="font-medium">{manufacturer.performance_metrics.quality_rating}/5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Communication</span>
                    <span className="font-medium">{manufacturer.performance_metrics.communication_rating}/5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Cost Competitiveness</span>
                    <span className="font-medium">{manufacturer.performance_metrics.cost_competitiveness}/5</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-stone-200">
              <CardHeader>
                <CardTitle className="text-lg">Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-600">
                  <BarChart3 className="mx-auto h-12 w-12 text-slate-500" />
                  <p className="mt-2 text-sm">Performance charts would be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Communications Log</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Log Communication
            </Button>
          </div>
          <div className="space-y-4">
            {communications.map((comm) => (
              <Card key={comm.id} className="border border-stone-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between pt-2">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">{comm.subject}</span>
                        <Badge variant="secondary" className="bg-stone-100">
                          {comm.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{comm.content}</p>
                      <div className="flex items-center space-x-4 text-xs text-slate-600">
                        <span>{formatDate(comm.created_at)}</span>
                        <span>By: {comm.created_by}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Contracts & Agreements</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Contract
            </Button>
          </div>
          <div className="text-center py-12 text-slate-600">
            <FileCheck className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">No contracts found</h3>
            <p className="mt-1 text-sm text-slate-600">
              Contract management functionality will be implemented here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}