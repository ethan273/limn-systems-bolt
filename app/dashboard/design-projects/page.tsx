'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Calendar, User, AlertCircle, CheckCircle2, Clock, Pause } from 'lucide-react'
import { DesignProjectOverview } from '@/types/designer'
import Link from 'next/link'
// toast import removed - not used


const stageOrder = [
  'brief_creation',
  'designer_review', 
  'contract_negotiation',
  'initial_concepts',
  'revision_1',
  'revision_2',
  'revision_3',
  'final_review',
  'technical_documentation',
  'approved_for_prototype',
  'on_hold',
  'cancelled'
]

const getStageColor = (stage: string) => {
  const colors: Record<string, string> = {
    'brief_creation': 'bg-slate-100 text-slate-800',
    'designer_review': 'bg-blue-100 text-blue-800',
    'contract_negotiation': 'bg-orange-100 text-orange-800',
    'initial_concepts': 'bg-purple-100 text-purple-800',
    'revision_1': 'bg-yellow-100 text-yellow-800',
    'revision_2': 'bg-yellow-100 text-yellow-800',
    'revision_3': 'bg-yellow-100 text-yellow-800',
    'final_review': 'bg-indigo-100 text-indigo-800',
    'technical_documentation': 'bg-cyan-100 text-cyan-800',
    'approved_for_prototype': 'bg-green-100 text-green-800',
    'on_hold': 'bg-gray-100 text-slate-900',
    'cancelled': 'bg-red-100 text-red-800'
  }
  return colors[stage] || 'bg-gray-100 text-slate-900'
}

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    'urgent': 'bg-red-500',
    'high': 'bg-orange-500',
    'normal': 'bg-blue-500', 
    'low': 'bg-gray-400'
  }
  return colors[priority] || 'bg-gray-400'
}

const getProjectStatusIcon = (status: string) => {
  switch (status) {
    case 'ready':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'stopped':
      return <Pause className="h-4 w-4 text-slate-600" />
    case 'in_progress':
    default:
      return <Clock className="h-4 w-4 text-blue-600" />
  }
}

const formatStageName = (stage: string) => {
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function DesignProjectsPage() {
  const [projects, setProjects] = useState<DesignProjectOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch real design projects data from API
      const response = await fetch('/api/design-projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setProjects(result.data)
          setError('')
          console.log(`Loaded ${result.data.length} design projects from API`)
          return
        }
      }

      // If API fails or returns no data, set empty array with helpful error message
      console.log('Design Projects API returned no data or failed - check if design_projects table exists')
      setProjects([])
      setError('No design projects data available. Check if design_projects table exists and contains data.')
    } catch (error) {
      console.error('Error fetching design projects:', error)
      setError(`Failed to load design projects: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const filteredProjects = projects.filter(project => {
    const matchesSearch = (project.project_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.project_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.designer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || project.project_status === statusFilter
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter
    const matchesStage = stageFilter === 'all' || project.current_stage === stageFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesStage
  })

  const projectsByStage = stageOrder.reduce((acc, stage) => {
    acc[stage] = filteredProjects.filter(project => project.current_stage === stage)
    return acc
  }, {} as Record<string, DesignProjectOverview[]>)

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.project_status === 'in_progress').length,
    ready: projects.filter(p => p.project_status === 'ready').length,
    stopped: projects.filter(p => p.project_status === 'stopped').length,
    urgent: projects.filter(p => p.priority === 'urgent').length
  }

  const ProjectCard = ({ project }: { project: DesignProjectOverview }) => (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <Link href={`/dashboard/design-projects/${project.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium line-clamp-2">
                {project.project_name}
              </CardTitle>
              <p className="text-xs text-slate-600">
                {project.project_code}
              </p>
            </div>
            <div className="flex items-center space-x-1 ml-2">
              <div className={`w-2 h-2 rounded-full ${getPriorityColor(project.priority)}`} />
              {getProjectStatusIcon(project.project_status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {project.designer_name && (
              <div className="flex items-center space-x-1 text-xs text-slate-600">
                <User className="h-3 w-3" />
                <span className="truncate">{project.designer_name}</span>
              </div>
            )}
            
            {project.target_launch_date && (
              <div className="flex items-center space-x-1 text-xs text-slate-600">
                <Calendar className="h-3 w-3" />
                <span>{new Date(project.target_launch_date).toLocaleDateString()}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">
                {project.deliverable_count} deliverables
              </span>
              {project.revision_count > 0 && (
                <span className="text-slate-600">
                  Rev {project.latest_revision}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Design Projects</h1>
          <p className="text-slate-600">
            Manage design projects and track progress through workflow stages
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={loadProjects}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Link href="/dashboard/design-projects/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="text-amber-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-slate-600">Total Projects</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
              <div className="text-xs text-slate-600">In Progress</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
              <div className="text-xs text-slate-600">Ready</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600">{stats.stopped}</div>
              <div className="text-xs text-slate-600">Stopped</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
              <div className="text-xs text-slate-600">Urgent</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-8 px-6 pb-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search projects, codes, or designers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-stone-300"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stageOrder.map(stage => (
                  <SelectItem key={stage} value={stage}>
                    {formatStageName(stage)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'kanban' | 'list')}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stageOrder.map(stage => {
              const stageProjects = projectsByStage[stage] || []
              
              return (
                <div key={stage} className="space-y-3">
                  <div className="sticky top-0 bg-white border border-gray-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStageColor(stage)}`}>
                        {formatStageName(stage)}
                      </div>
                      <span className="text-sm text-slate-600 font-medium">
                        {stageProjects.length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 min-h-[200px]">
                    {stageProjects.map(project => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                    {stageProjects.length === 0 && (
                      <div className="text-center text-slate-500 text-sm py-8">
                        No projects in this stage
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {filteredProjects.map((project, index) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/design-projects/${project.id}`}
                    className={`flex items-center p-4 hover:bg-gray-50 ${
                      index !== filteredProjects.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div className="md:col-span-2">
                        <div className="font-medium">{project.project_name}</div>
                        <div className="text-sm text-slate-600">{project.project_code}</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getStageColor(project.current_stage)}>
                          {formatStageName(project.current_stage)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(project.priority)}`} />
                        <span className="text-sm capitalize">{project.priority}</span>
                      </div>
                      
                      <div className="text-sm text-slate-600">
                        {project.designer_name || 'Unassigned'}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          {project.deliverable_count} deliverables
                        </div>
                        {getProjectStatusIcon(project.project_status)}
                      </div>
                    </div>
                  </Link>
                ))}
                
                {filteredProjects.length === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto h-12 w-12 text-slate-500" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No projects found</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Try adjusting your search or filter criteria.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}