'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Badge import removed - not used
import { PageHeader } from '@/components/ui/page-header'
import { PageLoading } from '@/components/ui/enhanced-loading-states'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/ui/status-badge'
import { StatsGrid } from '@/components/ui/responsive-grid'
import { InteractiveCard, AnimatedBadge, ProgressiveLoad } from '@/components/ui/enhanced-interactions'
import {
  Palette,
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  // TrendingUp removed - not used
  Briefcase,
  Calendar,
  Target,
  RefreshCw
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface DesignProject {
  id: string
  name: string
  status: 'planning' | 'in_progress' | 'review' | 'approved' | 'completed'
  designer_assigned?: string
  client_name?: string
  deadline?: string
  created_at: string
  updated_at: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  brief_status?: string
  deliverables_count?: number
}

interface DesignBrief {
  id: string
  title: string
  status: 'pending' | 'approved' | 'rejected' | 'in_review'
  client_name?: string
  created_at: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

interface TaskData {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  assigned_to?: string[]
}

export default function DesignTeamPage() {
  const [designProjects, setDesignProjects] = useState<DesignProject[]>([])
  const [designBriefs, setDesignBriefs] = useState<DesignBrief[]>([])
  const [designTasks, setDesignTasks] = useState<TaskData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDepartmentData()
  }, [])

  const fetchDepartmentData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch real design team data from API
      const response = await fetch('/api/design-team', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setDesignProjects(result.data.projects || [])
          setDesignBriefs(result.data.briefs || [])
          setDesignTasks(result.data.tasks || [])
          setError(null)
          console.log(`Loaded design team data from API:`, {
            projects: result.data.projects?.length || 0,
            briefs: result.data.briefs?.length || 0,
            tasks: result.data.tasks?.length || 0
          })
          return
        }
      }

      // If API fails or returns no data, set empty arrays with helpful error message
      console.log('Design Team API returned no data or failed - check if design tables exist')
      setDesignProjects([])
      setDesignBriefs([])
      setDesignTasks([])
      setError('No design team data available. Check if design_projects, design_briefs, and tasks tables exist.')
    } catch (err) {
      console.error('Error fetching design team data:', err)
      setError(`Failed to load design team data: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setDesignProjects([])
      setDesignBriefs([])
      setDesignTasks([])
    } finally {
      setLoading(false)
    }
  }


  // getStatusColor function removed - not used

  // getPriorityColor function removed - not used

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Design Team Dashboard" 
        description="Design projects, briefs, and team workload"
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchDepartmentData}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <StatusBadge variant="info" size="sm">
              {designProjects.filter(p => p.status === 'in_progress').length} Active Projects
            </StatusBadge>
            <StatusBadge variant="warning" size="sm">
              {designBriefs.filter(b => b.status === 'pending').length} Pending Briefs
            </StatusBadge>
          </div>
        }
      />

      {error && (
        <Alert variant="error">
          <span>{error}</span>
        </Alert>
      )}

      {/* Quick Stats */}
      <StatsGrid statsCount={4}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Projects</p>
                <p className="text-2xl font-bold text-slate-900">
                  {designProjects.filter(p => ['in_progress', 'review'].includes(p.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending Briefs</p>
                <p className="text-2xl font-bold text-slate-900">
                  {designBriefs.filter(b => b.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Tasks Done</p>
                <p className="text-2xl font-bold text-slate-900">
                  {designTasks.filter(t => t.status === 'done').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Overdue</p>
                <p className="text-2xl font-bold text-slate-900">
                  {designTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </StatsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Design Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>Active Design Projects</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {designProjects.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">No active design projects</p>
              ) : (
                designProjects.slice(0, 5).map((project, index) => (
                  <ProgressiveLoad key={project.id} index={index}>
                    <InteractiveCard
                      className="p-3 bg-slate-50 rounded-lg"
                      hover={true}
                      scale={true}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 truncate">{project.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {project.client_name} • {project.designer_assigned}
                          </p>
                          {project.deadline && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              Due {formatDate(project.deadline)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1 ml-3">
                          <AnimatedBadge
                            variant={project.status === 'completed' || project.status === 'approved' ? 'success' :
                                    project.status === 'in_progress' ? 'info' :
                                    project.status === 'review' ? 'warning' : 'default'}
                          >
                            {safeFormatString(project.status, 'Unknown')}
                          </AnimatedBadge>
                          {project.priority && (
                            <AnimatedBadge
                              variant={project.priority === 'urgent' ? 'error' :
                                      project.priority === 'high' ? 'warning' :
                                      project.priority === 'medium' ? 'info' : 'default'}
                            >
                              {project.priority}
                            </AnimatedBadge>
                          )}
                        </div>
                      </div>
                    </InteractiveCard>
                  </ProgressiveLoad>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Design Briefs Awaiting Approval */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Design Briefs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {designBriefs.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">No design briefs</p>
              ) : (
                designBriefs.slice(0, 5).map((brief, index) => (
                  <ProgressiveLoad key={brief.id} index={index}>
                    <InteractiveCard
                      className="p-3 bg-slate-50 rounded-lg"
                      hover={true}
                      scale={true}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 truncate">{brief.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{brief.client_name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Created {formatDate(brief.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1 ml-3">
                          <AnimatedBadge
                            variant={brief.status === 'approved' ? 'success' :
                                    brief.status === 'in_review' ? 'warning' :
                                    brief.status === 'rejected' ? 'error' : 'default'}
                          >
                            {safeFormatString(brief.status, 'Unknown')}
                          </AnimatedBadge>
                          {brief.priority && (
                            <AnimatedBadge
                              variant={brief.priority === 'urgent' ? 'error' :
                                      brief.priority === 'high' ? 'warning' :
                                      brief.priority === 'medium' ? 'info' : 'default'}
                            >
                              {brief.priority}
                            </AnimatedBadge>
                          )}
                        </div>
                      </div>
                    </InteractiveCard>
                  </ProgressiveLoad>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Design Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Design Team Tasks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {designTasks.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">No design tasks</p>
            ) : (
              designTasks.map((task, index) => (
                <ProgressiveLoad key={task.id} index={index}>
                  <InteractiveCard
                    className="p-3 bg-slate-50 rounded-lg"
                    hover={true}
                    scale={true}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">{task.title}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          {task.assigned_to && (task.assigned_to || []).length > 0 && (
                            <p className="text-sm text-slate-600">
                              <Users className="w-3 h-3 inline mr-1" />
                              {task.assigned_to.join(', ')}
                            </p>
                          )}
                          {task.due_date && (
                            <p className="text-sm text-slate-600">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatDate(task.due_date)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        {task.priority && (
                          <AnimatedBadge
                            variant={task.priority === 'urgent' ? 'error' :
                                    task.priority === 'high' ? 'warning' :
                                    task.priority === 'medium' ? 'info' : 'default'}
                          >
                            {task.priority}
                          </AnimatedBadge>
                        )}
                        <AnimatedBadge
                          variant={task.status === 'done' ? 'success' :
                                  task.status === 'in_progress' ? 'info' :
                                  task.status === 'blocked' ? 'error' :
                                  task.status === 'review' ? 'warning' : 'default'}
                        >
                          {safeFormatString(task.status, 'Unknown')}
                        </AnimatedBadge>
                      </div>
                    </div>
                  </InteractiveCard>
                </ProgressiveLoad>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}