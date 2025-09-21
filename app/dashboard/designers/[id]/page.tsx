'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Star, 
  Globe, 
  Phone, 
  Mail, 
  Briefcase,
  FileText, 
  // BarChart3 removed - not used 
  MessageSquare, 
  // FileContract removed - not used
  Edit,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Award,
  Palette,
  // Calendar removed - not used
  ExternalLink
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { Designer, DesignProject, DesignerContract, DesignerPerformance } from '@/types/designer'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { safeFormatString } from '@/lib/utils/string-helpers'

export default function DesignerDetailPage() {
  const params = useParams()
  const designerId = params?.id as string
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [projects, setProjects] = useState<DesignProject[]>([])
  const [contracts, setContracts] = useState<DesignerContract[]>([])
  const [performance, setPerformance] = useState<DesignerPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { canEdit } = usePermissions()

  // supabase removed - not used

  const fetchDesignerData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch designer data from API
      const designerResponse = await fetch(`/api/designers/${designerId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (designerResponse.ok) {
        const designerData = await designerResponse.json()
        setDesigner(designerData)
      } else {
        console.error('Failed to fetch designer data:', designerResponse.status)
        setDesigner(null)
      }

      // Fetch designer's projects
      const projectsResponse = await fetch(`/api/design-projects?designer_id=${designerId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        if (projectsData.success && Array.isArray(projectsData.data)) {
          // Map API response to match component interface
          const mappedProjects: DesignProject[] = projectsData.data.map((project: Record<string, unknown>) => ({
            id: project.id || '',
            project_name: project.project_name || '',
            project_code: project.project_code || '',
            designer_id: project.designer_id || designerId,
            collection_id: project.collection_id || '',
            project_type: project.project_type || 'single_item',
            current_stage: project.current_stage || 'brief_creation',
            target_launch_date: project.target_launch_date || '',
            budget: project.budget || 0,
            priority: project.priority || 'normal',
            created_at: project.created_at || '',
            updated_at: project.updated_at || ''
          }))
          setProjects(mappedProjects)
        } else {
          setProjects([])
        }
      } else {
        console.error('Failed to fetch projects data:', projectsResponse.status)
        setProjects([])
      }

      // TODO: Replace with real API calls when contracts and performance endpoints are available
      // For now, use empty arrays as placeholders
      setContracts([])
      setPerformance([])
    } catch (error) {
      console.error('Error fetching designer data:', error)
      setDesigner(null)
      setProjects([])
      setContracts([])
      setPerformance([])
    } finally {
      setLoading(false)
    }
  }, [designerId])

  useEffect(() => {
    if (designerId) {
      fetchDesignerData()
    }
  }, [designerId, fetchDesignerData])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'prospect': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'active': return 'bg-green-100 text-green-800 border-green-300'
      case 'preferred': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'inactive': return 'bg-gray-100 text-slate-900 border-gray-300'
      default: return 'bg-gray-100 text-slate-900 border-gray-300'
    }
  }

  const getProjectStatusColor = (stage: string) => {
    switch (stage) {
      case 'brief_creation': return 'bg-gray-100 text-slate-900'
      case 'initial_concepts': return 'bg-blue-100 text-blue-800'
      case 'revision_1':
      case 'revision_2':
      case 'revision_3': return 'bg-yellow-100 text-yellow-800'
      case 'final_review': return 'bg-orange-100 text-orange-800'
      case 'approved_for_prototype': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-slate-900'
      default: return 'bg-gray-100 text-slate-900'
    }
  }

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-slate-900'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'negotiating': return 'bg-yellow-100 text-yellow-800'
      case 'signed': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'terminated': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-slate-900'
    }
  }

  const renderStarRating = (rating?: number) => {
    if (!rating) return <span className="text-sm text-slate-600">No rating</span>
    
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
    )
  }

  const formatCurrency = (amount?: number, currency = 'USD') => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatStage = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

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
    )
  }

  if (!designer) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">Designer not found</h3>
          <p className="mt-1 text-sm text-slate-600">
            The designer you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Designers', href: '/dashboard/designers' },
          { label: designer.name }
        ]}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">{designer.name}</h1>
          {designer.company_name && (
            <p className="text-lg text-slate-600">{designer.company_name}</p>
          )}
          <div className="flex items-center space-x-4">
            <Badge className={`${getStatusColor(designer.status)}`}>
              {designer.status}
            </Badge>
            {renderStarRating(designer.rating)}
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
          {canEdit('design_team') && (
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
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card className="border border-stone-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-600">Email</p>
                      <p className="font-medium">{designer.contact_email}</p>
                    </div>
                  </div>
                  {designer.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-600">Phone</p>
                        <p className="font-medium">{designer.phone}</p>
                      </div>
                    </div>
                  )}
                  {designer.website && (
                    <div className="flex items-center space-x-3">
                      <Globe className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-600">Website</p>
                        <a 
                          href={designer.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          {(designer.website || 'No website').replace('https://', '')}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  )}
                  {designer.portfolio_url && (
                    <div className="flex items-center space-x-3">
                      <Palette className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-600">Portfolio</p>
                        <a 
                          href={designer.portfolio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          View Portfolio
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Professional Details */}
            <Card className="border border-stone-200">
              <CardHeader>
                <CardTitle className="text-lg">Professional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Experience</p>
                    <p className="font-medium">{designer.years_experience || 'N/A'} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Hourly Rate</p>
                    <p className="font-medium">{formatCurrency(designer.hourly_rate, designer.currency)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-slate-600 mb-2">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {(designer.specialties || []).map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="bg-stone-100">
                        {safeFormatString(specialty, 'design')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-600 mb-2">Design Styles</p>
                  <div className="flex flex-wrap gap-2">
                    {(designer.design_style || []).map((style, index) => (
                      <Badge key={index} variant="outline" className="border-blue-300 text-blue-800">
                        {safeFormatString(style, 'modern')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {(designer.certifications || []).length > 0 && (
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Certifications</p>
                    <div className="space-y-1">
                      {(designer.certifications || []).map((cert, index) => (
                        <div key={index} className="flex items-center">
                          <Award className="h-4 w-4 text-green-600 mr-2" />
                          <span className="text-sm">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-stone-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Projects</p>
                    <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-stone-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-stone-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Active Projects</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {projects.filter(p => !['approved_for_prototype', 'cancelled', 'on_hold'].includes(p.current_stage)).length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-stone-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {projects.filter(p => p.current_stage === 'approved_for_prototype').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-stone-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Avg. Rating</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {performance.length ? (
                        (performance.reduce((sum, p) => sum + (p.quality_rating || 0), 0) / performance.length).toFixed(1)
                      ) : 'N/A'}
                    </p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {designer.notes && (
            <Card className="border border-stone-200">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{designer.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Design Projects</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.id} className="border border-stone-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-medium text-slate-900">{project.project_name}</h4>
                      <p className="text-sm text-slate-600">Code: {project.project_code}</p>
                      <div className="flex items-center space-x-4">
                        <Badge className={`${getProjectStatusColor(project.current_stage)}`}>
                          {formatStage(project.current_stage)}
                        </Badge>
                        <span className={`text-sm px-2 py-1 rounded ${
                          project.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          project.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          project.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-slate-900'
                        }`}>
                          {project.priority}
                        </span>
                        <span className="text-sm text-slate-600">
                          Budget: {formatCurrency(project.budget)}
                        </span>
                        <span className="text-sm text-slate-600">
                          Target: {formatDate(project.target_launch_date)}
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

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Contracts</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          </div>
          <div className="space-y-4">
            {contracts.map((contract) => (
              <Card key={contract.id} className="border border-stone-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-medium text-slate-900">{contract.contract_number}</h4>
                      <div className="flex items-center space-x-4">
                        <Badge className={`${getContractStatusColor(contract.status)}`}>
                          {contract.status}
                        </Badge>
                        <span className="text-sm text-slate-600 capitalize">
                          {safeFormatString(contract.contract_type, 'agreement')}
                        </span>
                        <span className="text-sm text-slate-600">
                          {formatCurrency(contract.total_value)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        <span>Period: {formatDate(contract.start_date)} - {formatDate(contract.end_date)}</span>
                        {contract.signed_date && (
                          <span className="ml-4">Signed: {formatDate(contract.signed_date)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {contract.document_url && (
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <h3 className="text-lg font-medium">Performance History</h3>
          <div className="space-y-4">
            {performance.map((perf) => (
              <Card key={perf.id} className="border border-stone-200">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-900">
                        Project Performance Review
                      </h4>
                      <span className="text-sm text-slate-600">
                        {formatDate(perf.created_at)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-600">Quality</p>
                        <p className="text-2xl font-bold text-blue-600">{perf.quality_rating || 'N/A'}/5</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600">Creativity</p>
                        <p className="text-2xl font-bold text-purple-600">{perf.creativity_rating || 'N/A'}/5</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600">Communication</p>
                        <p className="text-2xl font-bold text-green-600">{perf.communication_rating || 'N/A'}/5</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600">Revisions</p>
                        <p className="text-2xl font-bold text-orange-600">{perf.revision_count || 0}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                      <div className={`flex items-center space-x-2 ${
                        perf.on_time_delivery ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {perf.on_time_delivery ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        <span>On-time delivery: {perf.on_time_delivery ? 'Yes' : 'No'}</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${
                        perf.would_rehire ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <span>Would rehire: {perf.would_rehire ? 'Yes' : 'No'}</span>
                      </div>
                    </div>

                    {perf.notes && (
                      <div className="pt-2 border-t border-stone-100">
                        <p className="text-sm text-slate-600">{perf.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables" className="space-y-4">
          <h3 className="text-lg font-medium">All Deliverables</h3>
          <div className="text-center py-12 text-slate-600">
            <FileText className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">No deliverables yet</h3>
            <p className="mt-1 text-sm text-slate-600">
              Deliverables will appear here once projects begin
            </p>
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
          <div className="text-center py-12 text-slate-600">
            <MessageSquare className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">No communications logged</h3>
            <p className="mt-1 text-sm text-slate-600">
              Communication history will be tracked here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}