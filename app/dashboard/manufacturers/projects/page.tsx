'use client'

import { useState, useEffect, useCallback } from 'react';
// import { createClient } from '@/lib/supabase/client'; - removed unused
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Package, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { safeFormatString } from '@/lib/utils/string-helpers';

interface ManufacturerProject {
  id: string;
  manufacturer_id: string;
  manufacturer_name: string;
  order_id: string;
  customer_order_number: string;
  customer_name: string;
  project_name: string;
  status: 'quoted' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  quoted_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_completion: string;
  actual_completion?: string;
  total_value: number;
  phases: {
    shop_drawings: {
      status: 'pending' | 'in_progress' | 'approved' | 'revision_required';
      start_date?: string;
      end_date?: string;
      estimated_days: number;
      revision_count: number;
    };
    production: {
      status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
      start_date?: string;
      end_date?: string;
      estimated_days: number;
      current_stage: string;
    };
    qc: {
      status: 'pending' | 'in_progress' | 'passed' | 'failed';
      start_date?: string;
      end_date?: string;
      estimated_days: number;
      checkpoints_completed: number;
      total_checkpoints: number;
    };
  };
  timeline_variance_days: number;
  cost_variance_percentage: number;
}

export default function ManufacturerProjectsPage() {
  const [projects, setProjects] = useState<ManufacturerProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ManufacturerProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [manufacturerFilter, setManufacturerFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline'>('kanban');
  const [loading, setLoading] = useState(true);

  // const supabase = createClient(); - removed unused

  const filterProjects = useCallback(() => {
    let filtered = Array.isArray(projects) ? [...projects] : [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        (project.project_name || "").toLowerCase().includes(term) ||
        (project.customer_name || "").toLowerCase().includes(term) ||
        (project.manufacturer_name || "").toLowerCase().includes(term) ||
        (project.customer_order_number || "").toLowerCase().includes(term)
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    if (priorityFilter && priorityFilter !== 'all') {
      filtered = filtered.filter(project => project.priority === priorityFilter);
    }

    if (manufacturerFilter && manufacturerFilter !== 'all') {
      filtered = filtered.filter(project => project.manufacturer_id === manufacturerFilter);
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter, priorityFilter, manufacturerFilter]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter, priorityFilter, manufacturerFilter, filterProjects]);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      // Fetch manufacturer projects from API
      const response = await fetch('/api/manufacturers/projects', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success && Array.isArray(data.data)) {
          // Transform API response to match component interface
          const transformedProjects: ManufacturerProject[] = data.data.map((project: Record<string, unknown>) => ({
            id: String(project.id || ''),
            manufacturer_id: String(project.manufacturer_id || ''),
            manufacturer_name: String((project.manufacturer as Record<string, unknown>)?.company_name || 'Unknown Manufacturer'),
            order_id: String(project.order_id || ''),
            customer_order_number: String((project.order as Record<string, unknown>)?.customer_order_number || project.project_code || ''),
            customer_name: String(((project.order as Record<string, unknown>)?.customer as Record<string, unknown>)?.name || 'Unknown Customer'),
            project_name: String(project.project_name || 'Unnamed Project'),
            status: (project.status === 'quoted' || project.status === 'in_progress' || project.status === 'completed' || project.status === 'on_hold' || project.status === 'cancelled') ? project.status : 'quoted',
            priority: (project.priority === 'low' || project.priority === 'medium' || project.priority === 'high' || project.priority === 'urgent') ? project.priority : 'medium',
            quoted_at: String(project.quote_date || project.created_at || new Date().toISOString()),
            started_at: (project.production_tracking as Record<string, unknown>[])?.[0]?.started_at ? String((project.production_tracking as Record<string, unknown>[])[0].started_at) : undefined,
            completed_at: project.completion_date ? String(project.completion_date) : undefined,
            estimated_completion: String((project.production_tracking as Record<string, unknown>[])?.[0]?.estimated_completion || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
            actual_completion: project.completion_date ? String(project.completion_date) : undefined,
            total_value: Number(project.quoted_price || 0),
            phases: {
              shop_drawings: {
                status: String((project.shop_drawings as Record<string, unknown>[])?.[0]?.status || 'pending'),
                start_date: (project.shop_drawings as Record<string, unknown>[])?.[0]?.created_at ? String((project.shop_drawings as Record<string, unknown>[])[0].created_at) : undefined,
                end_date: (project.shop_drawings as Record<string, unknown>[])?.[0]?.status === 'approved' && (project.shop_drawings as Record<string, unknown>[])?.[0]?.updated_at ? String((project.shop_drawings as Record<string, unknown>[])[0].updated_at) : undefined,
                estimated_days: 5,
                revision_count: Number((project.shop_drawings as Record<string, unknown>[])?.[0]?.revision_count || 0)
              },
              production: {
                status: String((project.production_tracking as Record<string, unknown>[])?.[0]?.status || 'pending'),
                start_date: (project.production_tracking as Record<string, unknown>[])?.[0]?.started_at ? String((project.production_tracking as Record<string, unknown>[])[0].started_at) : undefined,
                end_date: (project.production_tracking as Record<string, unknown>[])?.[0]?.status === 'completed' && (project.production_tracking as Record<string, unknown>[])?.[0]?.completed_at ? String((project.production_tracking as Record<string, unknown>[])[0].completed_at) : undefined,
                estimated_days: 15,
                current_stage: String((project.production_tracking as Record<string, unknown>[])?.[0]?.current_stage || 'Initial')
              },
              qc: {
                status: (project.qc_checkpoints as { status: string }[])?.every((qc) => qc.status === 'completed') ? 'passed' :
                       (project.qc_checkpoints as { status: string }[])?.some((qc) => qc.status === 'in_progress') ? 'in_progress' : 'pending',
                start_date: (project.qc_checkpoints as { created_at?: string }[])?.[0]?.created_at || undefined,
                end_date: (project.qc_checkpoints as { status: string; completed_at?: string }[])?.every((qc) => qc.status === 'completed') ?
                         (project.qc_checkpoints as { completed_at?: string }[])?.slice(-1)[0]?.completed_at : undefined,
                estimated_days: 3,
                checkpoints_completed: (project.qc_checkpoints as { status: string }[])?.filter((qc) => qc.status === 'completed').length || 0,
                total_checkpoints: (project.qc_checkpoints as unknown[])?.length || 5
              }
            },
            timeline_variance_days: 0, // TODO: Calculate based on actual vs estimated dates
            cost_variance_percentage: 0 // TODO: Calculate based on actual vs quoted costs
          }));
          setProjects(transformedProjects);
        } else {
          setProjects([]);
        }
      } else {
        console.error('Failed to fetch manufacturer projects:', response.status);
        // Fallback to empty array if API fails
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching manufacturer projects:', error);
      // Fallback to empty array if fetch fails
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Mock data removed - function now uses real API calls

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quoted': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'on_hold': return 'bg-red-100 text-red-800 border-red-300';
      case 'cancelled': return 'bg-gray-100 text-slate-900 border-gray-300';
      default: return 'bg-gray-100 text-slate-900 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-slate-900';
    }
  };

  const getPhaseStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
      case 'under_review':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'revision_required':
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateDaysRemaining = (estimatedCompletion: string) => {
    const now = new Date();
    const completion = new Date(estimatedCompletion);
    const diffTime = completion.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderKanbanView = () => {
    const statuses = ['quoted', 'in_progress', 'completed', 'on_hold'];
    const statusLabels = {
      quoted: 'Quoted',
      in_progress: 'In Progress',
      completed: 'Completed',
      on_hold: 'On Hold'
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statuses.map(status => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-900">{statusLabels[status as keyof typeof statusLabels]}</h3>
              <Badge variant="secondary" className="bg-stone-100">
                {filteredProjects.filter(p => p.status === status).length}
              </Badge>
            </div>
            <div className="space-y-3">
              {filteredProjects
                .filter(project => project.status === status)
                .map(project => (
                  <Card key={project.id} className="border border-stone-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm text-slate-900">{project.project_name}</h4>
                          <p className="text-xs text-slate-600">{project.customer_name}</p>
                          <p className="text-xs text-slate-600">{project.manufacturer_name}</p>
                        </div>
                        <Badge className={`text-xs ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Shop Drawings</span>
                          <div className="flex items-center space-x-1">
                            {getPhaseStatusIcon(project.phases.shop_drawings.status)}
                            <span className="capitalize">{safeFormatString(project.phases.shop_drawings.status, 'pending')}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Production</span>
                          <div className="flex items-center space-x-1">
                            {getPhaseStatusIcon(project.phases.production.status)}
                            <span className="capitalize">{project.phases.production.current_stage}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">QC</span>
                          <div className="flex items-center space-x-1">
                            {getPhaseStatusIcon(project.phases.qc.status)}
                            <span>
                              {project.phases.qc.checkpoints_completed}/{project.phases.qc.total_checkpoints}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <div className="text-xs text-slate-600">
                          <span className="font-medium">{formatCurrency(project.total_value)}</span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {project.status !== 'completed' && (
                            <span>
                              {calculateDaysRemaining(project.estimated_completion)} days left
                            </span>
                          )}
                          {project.status === 'completed' && (
                            <span className={project.timeline_variance_days > 0 ? 'text-red-600' : 'text-green-600'}>
                              {project.timeline_variance_days > 0 ? '+' : ''}{project.timeline_variance_days} days
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTimelineView = () => {
    return (
      <div className="space-y-4">
        {filteredProjects.map(project => (
          <Card key={project.id} className="border border-stone-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <h3 className="font-medium text-slate-900">{project.project_name}</h3>
                  <p className="text-sm text-slate-600">{project.customer_name} • {project.manufacturer_name}</p>
                  <p className="text-xs text-slate-600">{project.customer_order_number}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </Badge>
                  <Badge className={`${getStatusColor(project.status)}`}>
                    {safeFormatString(project.status, 'unknown')}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getPhaseStatusIcon(project.phases.shop_drawings.status)}
                    <h4 className="font-medium text-sm">Shop Drawings</h4>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Status: <span className="capitalize">{safeFormatString(project.phases.shop_drawings.status, 'pending')}</span></p>
                    <p>Estimated: {project.phases.shop_drawings.estimated_days} days</p>
                    <p>Revisions: {project.phases.shop_drawings.revision_count}</p>
                    {project.phases.shop_drawings.start_date && (
                      <p>Started: {formatDate(project.phases.shop_drawings.start_date)}</p>
                    )}
                    {project.phases.shop_drawings.end_date && (
                      <p>Completed: {formatDate(project.phases.shop_drawings.end_date)}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getPhaseStatusIcon(project.phases.production.status)}
                    <h4 className="font-medium text-sm">Production</h4>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Status: {project.phases.production.current_stage}</p>
                    <p>Estimated: {project.phases.production.estimated_days} days</p>
                    {project.phases.production.start_date && (
                      <p>Started: {formatDate(project.phases.production.start_date)}</p>
                    )}
                    {project.phases.production.end_date && (
                      <p>Completed: {formatDate(project.phases.production.end_date)}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getPhaseStatusIcon(project.phases.qc.status)}
                    <h4 className="font-medium text-sm">Quality Control</h4>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Status: <span className="capitalize">{project.phases.qc.status}</span></p>
                    <p>Estimated: {project.phases.qc.estimated_days} days</p>
                    <p>Checkpoints: {project.phases.qc.checkpoints_completed}/{project.phases.qc.total_checkpoints}</p>
                    {project.phases.qc.start_date && (
                      <p>Started: {formatDate(project.phases.qc.start_date)}</p>
                    )}
                    {project.phases.qc.end_date && (
                      <p>Completed: {formatDate(project.phases.qc.end_date)}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-100">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="font-medium">{formatCurrency(project.total_value)}</span>
                  <span className="text-slate-600">Quoted: {formatDate(project.quoted_at)}</span>
                  {project.started_at && (
                    <span className="text-slate-600">Started: {formatDate(project.started_at)}</span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  {project.status !== 'completed' ? (
                    <span className="text-slate-600">
                      Est. completion: {formatDate(project.estimated_completion)}
                    </span>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-600">
                        Completed: {project.completed_at ? formatDate(project.completed_at) : 'N/A'}
                      </span>
                      <span className={`font-medium ${project.timeline_variance_days > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ({project.timeline_variance_days > 0 ? '+' : ''}{project.timeline_variance_days} days)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const uniqueManufacturers = Array.from(new Set(projects.map(p => p.manufacturer_id)))
    .map(id => projects.find(p => p.manufacturer_id === id))
    .filter(Boolean);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-stone-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Manufacturer Projects</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-stone-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Total Projects</p>
                <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
              </div>
              <Package className="h-8 w-8 text-stone-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-stone-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {projects.filter(p => p.status === 'in_progress').length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-stone-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {projects.filter(p => p.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-stone-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(projects.reduce((sum, p) => sum + p.total_value, 0))}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-stone-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-stone-300"
            />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-stone-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="border-stone-300">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
              <SelectTrigger className="border-stone-300">
                <SelectValue placeholder="Manufacturer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {uniqueManufacturers.map(manufacturer => (
                  <SelectItem key={manufacturer?.manufacturer_id} value={manufacturer?.manufacturer_id || ''}>
                    {manufacturer?.manufacturer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setManufacturerFilter('all');
              }}
              className="border-stone-300"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {viewMode === 'kanban' ? renderKanbanView() : renderTimelineView()}
      </div>

      {filteredProjects.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">No projects found</h3>
          <p className="mt-1 text-sm text-slate-600">
            Try adjusting your filters or search criteria
          </p>
        </div>
      )}
    </div>
  );
}