'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Progress component not available - will create inline
// Avatar component not available - will create inline
import { 
  Calendar, 
  User, 
  DollarSign, 
  Clock, 
  FileText,
  // MessageSquare removed - not used
  Edit,
  Download,
  Upload,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Settings,
  Eye,
  Star,
  RefreshCw,
  // Send removed - not used
} from 'lucide-react'
import { 
  DesignProject, 
  DesignBrief, 
  DesignDeliverable, 
  DesignRevision, 
  Designer 
} from '@/types/designer'
import Link from 'next/link'
// toast import removed - not used
import { useParams } from 'next/navigation'
// Textarea import removed - not used
// Select imports removed - not used
import { Breadcrumb } from '@/components/ui/breadcrumb'
import ProjectTimeline from '@/components/projects/ProjectTimeline'
import ProjectMessages from '@/components/projects/ProjectMessages'
import DesignBriefEditModal from '@/components/design/DesignBriefEditModal'
import { safeFormatString } from '@/lib/utils/string-helpers'

// Note: All mock data has been removed as per project requirements.
// This system only uses real data from the database.

const stageProgress = {
  'brief_creation': 10,
  'designer_review': 20,
  'contract_negotiation': 30,
  'initial_concepts': 40,
  'revision_1': 50,
  'revision_2': 60,
  'revision_3': 70,
  'final_review': 80,
  'technical_documentation': 90,
  'approved_for_prototype': 100
}

const getDeliverableStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'pending': 'bg-slate-100 text-slate-800',
    'submitted': 'bg-blue-100 text-blue-800',
    'in_review': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-slate-100 text-slate-800'
}

const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

const formatStageName = (stage: string) => {
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function DesignProjectDetailPage() {
  const params = useParams()
  const projectId = params?.id as string
  
  const [project, setProject] = useState<DesignProject | null>(null)
  const [brief, setBrief] = useState<DesignBrief | null>(null)
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [deliverables, setDeliverables] = useState<DesignDeliverable[]>([])
  const [revisions, setRevisions] = useState<DesignRevision[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showBriefModal, setShowBriefModal] = useState(false)

  const loadProjectData = useCallback(async () => {
    setLoading(true)
    try {
      // Load design project from API
      const projectResponse = await fetch(`/api/design-projects/${projectId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (projectResponse.ok) {
        const projectData = await projectResponse.json()
        if (projectData && projectData.id) {
          setProject(projectData)

          // Load designer if designer_id is available
          if (projectData.designer_id) {
            try {
              const designerResponse = await fetch(`/api/designers/${projectData.designer_id}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
              })
              if (designerResponse.ok) {
                const designerData = await designerResponse.json()
                setDesigner(designerData)
              } else {
                setDesigner(null)
              }
            } catch {
              setDesigner(null)
            }
          } else {
            setDesigner(null)
          }

          // Load design brief if available
          if (projectData.brief_id) {
            try {
              const briefResponse = await fetch(`/api/design-briefs/${projectData.brief_id}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
              })
              if (briefResponse.ok) {
                const briefData = await briefResponse.json()
                setBrief(briefData)
              } else {
                setBrief(null)
              }
            } catch {
              setBrief(null)
            }
          } else {
            setBrief(null)
          }

          // TODO: Load deliverables and revisions when APIs are available
          setDeliverables([])
          setRevisions([])
        } else {
          // No data found, show empty state
          setProject(null)
          setBrief(null)
          setDesigner(null)
          setDeliverables([])
          setRevisions([])
        }
      } else {
        console.log('Project API not available, showing empty state')
        // API not available, show empty state
        setProject(null)
        setBrief(null)
        setDesigner(null)
        setDeliverables([])
        setRevisions([])
      }
    } catch (error) {
      console.log('Error loading project, showing empty state:', error)
      setProject(null)
      setBrief(null)
      setDesigner(null)
      setDeliverables([])
      setRevisions([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadProjectData()
  }, [projectId, loadProjectData])

  const handleSaveBrief = async (briefData: unknown) => {
    try {
      console.log('Saving brief:', briefData)
      // Here you would save to your API
      await loadProjectData() // Refresh data
    } catch (error) {
      console.error('Error saving brief:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">Project not found</h3>
          <p className="mt-1 text-sm text-slate-600">
            The design project you&apos;re looking for doesn&apos;t exist.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/design-projects">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Design Projects', href: '/dashboard/design-projects' },
          { label: project.project_name }
        ]}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/design-projects">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.project_name}</h1>
            <p className="text-slate-600">{project.project_code}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowBriefModal(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowBriefModal(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>
      </div>

      {/* Progress and Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="px-3 py-1">
              {formatStageName(project.current_stage)}
            </Badge>
            <div className="text-sm text-slate-700">
              Progress: {stageProgress[project.current_stage as keyof typeof stageProgress] || 0}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stageProgress[project.current_stage as keyof typeof stageProgress] || 0}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="brief">Brief</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="revisions">Revisions</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="communications">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-700">Project Type</div>
                      <div className="font-medium capitalize">
                        {safeFormatString(project.project_type, 'single item')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-700">Priority</div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          project.priority === 'urgent' ? 'bg-red-500' :
                          project.priority === 'high' ? 'bg-orange-500' :
                          project.priority === 'normal' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium capitalize">{project.priority}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-700">Target Launch</div>
                      <div className="font-medium flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span>
                          {project.target_launch_date ? 
                            new Date(project.target_launch_date).toLocaleDateString() : 
                            'Not set'
                          }
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-700">Budget</div>
                      <div className="font-medium flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-slate-500" />
                        <span>
                          {project.budget ? 
                            `$${project.budget.toLocaleString()}` : 
                            'Not set'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Brief Summary */}
              {brief && (
                <Card>
                  <CardHeader>
                    <CardTitle>Design Brief</CardTitle>
                    <p className="text-sm text-slate-700">{brief.title}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700 leading-relaxed">
                      {brief.description}
                    </p>
                    {brief.target_market && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-slate-900">Target Market</div>
                        <p className="text-sm text-slate-700 mt-1">{brief.target_market}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Designer Info */}
              {designer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Designer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {(designer.name || "").split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{designer.name}</div>
                        <div className="text-sm text-slate-700">{designer.company_name}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Rating</span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{designer.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Experience</span>
                        <span className="text-sm font-medium">{designer.years_experience} years</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Rate</span>
                        <span className="text-sm font-medium">
                          ${designer.hourly_rate}/{designer.currency}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <Link href={`/dashboard/designers/${designer.id}`}>
                        <Button size="sm" variant="outline" className="w-full">
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Deliverables</span>
                    <span className="font-medium">{project.deliverable_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Revisions</span>
                    <span className="font-medium">{project.revision_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Days Active</span>
                    <span className="font-medium">
                      {Math.floor(
                        (new Date().getTime() - new Date(project.created_at).getTime()) / 
                        (1000 * 60 * 60 * 24)
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brief" className="space-y-6">
          {brief ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{brief.title}</CardTitle>
                    <p className="text-sm text-slate-700">
                      Created {new Date(brief.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setShowBriefModal(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Brief
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {brief.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-slate-700 leading-relaxed">{brief.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {brief.target_market && (
                    <div>
                      <h4 className="font-medium mb-2">Target Market</h4>
                      <p className="text-slate-700">{brief.target_market}</p>
                    </div>
                  )}

                  {(brief.price_point_min || brief.price_point_max) && (
                    <div>
                      <h4 className="font-medium mb-2">Price Range</h4>
                      <p className="text-slate-700">
                        ${brief.price_point_min} - ${brief.price_point_max}
                      </p>
                    </div>
                  )}

                  {(brief.materials_preference || []).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Materials</h4>
                      <div className="flex flex-wrap gap-2">
                        {(brief.materials_preference || []).map((material, index) => (
                          <Badge key={index} variant="secondary">
                            {material}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(brief.style_references || []).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Style References</h4>
                      <div className="flex flex-wrap gap-2">
                        {(brief.style_references || []).map((ref, index) => (
                          <Badge key={index} variant="outline">
                            {ref}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {brief.functional_requirements && (
                  <div>
                    <h4 className="font-medium mb-2">Functional Requirements</h4>
                    <p className="text-slate-700">{brief.functional_requirements}</p>
                  </div>
                )}

                {brief.sustainability_requirements && (
                  <div>
                    <h4 className="font-medium mb-2">Sustainability Requirements</h4>
                    <p className="text-slate-700">{brief.sustainability_requirements}</p>
                  </div>
                )}

                {brief.dimensional_constraints && (
                  <div>
                    <h4 className="font-medium mb-2">Dimensional Constraints</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-slate-700">
                        {JSON.stringify(brief.dimensional_constraints, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-slate-500" />
                <h3 className="mt-2 text-sm font-medium text-slate-900">No brief available</h3>
                <p className="mt-1 text-sm text-slate-600">
                  A design brief hasn&apos;t been created for this project yet.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setShowBriefModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Brief
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deliverables" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Deliverables</h3>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Request Deliverable
            </Button>
          </div>

          <div className="grid gap-4">
            {deliverables.map((deliverable) => (
              <Card key={deliverable.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-slate-500" />
                      </div>
                      <div>
                        <div className="font-medium capitalize">
                          {safeFormatString(deliverable.deliverable_type, 'document')}
                        </div>
                        <div className="text-sm text-slate-700">
                          Version {deliverable.version}
                          {deliverable.file_name && ` • ${deliverable.file_name}`}
                          {deliverable.file_size && ` • ${formatFileSize(deliverable.file_size)}`}
                        </div>
                        {deliverable.submitted_date && (
                          <div className="text-xs text-slate-600">
                            Submitted {new Date(deliverable.submitted_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getDeliverableStatusColor(deliverable.status)}>
                        {deliverable.status}
                      </Badge>
                      <div className="flex space-x-1">
                        {deliverable.file_url && (
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {deliverable.file_url && (
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {deliverable.review_comments && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm text-slate-700">
                        <strong>Review Comments:</strong> {deliverable.review_comments}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {deliverables.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-slate-500" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">No deliverables yet</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Deliverables will appear here as the designer submits them.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="revisions" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Revision History</h3>
            <Button size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Request Revision
            </Button>
          </div>

          <div className="space-y-4">
            {revisions.map((revision) => (
              <Card key={revision.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium">Revision #{revision.revision_number}</h4>
                      <p className="text-sm text-slate-700">
                        Requested {new Date(revision.request_date).toLocaleDateString()}
                        {revision.revision_stage && ` • ${formatStageName(revision.revision_stage)}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {revision.approved ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                      {revision.time_spent_hours && (
                        <span className="text-xs text-slate-600">
                          {revision.time_spent_hours}h
                        </span>
                      )}
                    </div>
                  </div>

                  {revision.revision_notes && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-slate-900 mb-1">Request Notes</h5>
                      <p className="text-sm text-slate-700">{revision.revision_notes}</p>
                    </div>
                  )}

                  {(revision.changes_requested || []).length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-slate-900 mb-2">Changes Requested</h5>
                      <div className="space-y-2">
                        {(revision.changes_requested || []).map((change, index) => (
                          <div key={index} className="flex items-start space-x-2 text-sm">
                            <Badge variant="outline" className="mt-0.5 text-xs">
                              {change.type}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-slate-700">{change.description}</p>
                              <Badge 
                                className={`mt-1 text-xs ${
                                  change.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  change.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  change.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {change.priority}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {revision.designer_response && (
                    <div className="border-t pt-4">
                      <h5 className="text-sm font-medium text-slate-900 mb-1">Designer Response</h5>
                      <p className="text-sm text-slate-700">{revision.designer_response}</p>
                      {revision.response_date && (
                        <p className="text-xs text-slate-600 mt-1">
                          Responded {new Date(revision.response_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {revisions.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <RefreshCw className="mx-auto h-12 w-12 text-slate-500" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">No revisions requested</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Revision requests will appear here when changes are needed.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <ProjectTimeline projectId={projectId} />
        </TabsContent>

        <TabsContent value="communications" className="space-y-6">
          <ProjectMessages projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Design Brief Edit Modal */}
      <DesignBriefEditModal
        isOpen={showBriefModal}
        onClose={() => setShowBriefModal(false)}
        brief={brief}
        onSave={handleSaveBrief}
      />
    </div>
  )
}