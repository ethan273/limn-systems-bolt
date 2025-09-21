'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { safeFormatString } from '@/lib/utils/string-helpers'

interface DesignProject {
  id: string
  project_name: string
  designer: string
  status: 'concept' | 'in_progress' | 'review' | 'approved' | 'production'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  client: string
  deadline: string
  created_at: string
  updated_at: string
  revision_count: number
  description?: string
}

interface RevisionHistory {
  id: string
  project_id: string
  revision_number: number
  description: string
  designer: string
  status: string
  created_at: string
}

export default function DesignTrackerPage() {
  const [projects, setProjects] = useState<DesignProject[]>([])
  const [revisions, setRevisions] = useState<RevisionHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showRevisions, setShowRevisions] = useState(false)

  useEffect(() => {
    fetchDesignProjects()
  }, [])

  const fetchDesignProjects = async () => {
    try {
      setLoading(true)

      // Fetch real design tracking data from API
      const response = await fetch('/api/design-tracker', {
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
          setRevisions([]) // Revisions would come from a separate API call
          setError('')
          console.log(`Loaded ${result.data.length} design tracking projects from API`)
          return
        }
      }

      // If API fails or returns no data, set empty array with helpful error message
      console.log('Design Tracker API returned no data or failed - check if design_projects table exists')
      setProjects([])
      setRevisions([])
      setError('No design tracking data available. Check if design_projects table exists and contains data.')
    } catch (err) {
      console.error('Error fetching design tracking data:', err)
      setError(`Failed to load design projects: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setProjects([])
      setRevisions([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concept': return 'bg-stone-100 text-stone-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'review': return 'bg-amber-100 text-amber-700'
      case 'approved': return 'bg-primary/10 text-primary'
      case 'production': return 'bg-emerald-100 text-emerald-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-stone-100 text-stone-600'
      case 'medium': return 'bg-blue-100 text-blue-600'
      case 'high': return 'bg-amber-100 text-amber-600'
      case 'urgent': return 'bg-red-100 text-red-600'
      default: return 'bg-stone-100 text-stone-600'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getProjectsByStatus = () => {
    const statusCounts = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return statusCounts
  }

  const statusCounts = getProjectsByStatus()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Design Tracker</h1>
          <p className="text-slate-900 mt-1">Manage design projects, assignments, and revisions</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchDesignProjects} disabled={loading} variant="outline">
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button>
            New Project
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">Concept</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {statusCounts.concept || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statusCounts.in_progress || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">In Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {statusCounts.review || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {statusCounts.approved || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {statusCounts.production || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Design Projects ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <div className="text-slate-900">Loading design projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-900 mb-4">No design projects found</div>
              <Button>Create First Project</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Designer</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Revisions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const daysLeft = getDaysUntilDeadline(project.deadline)
                  
                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">{project.project_name}</div>
                          {project.description && (
                            <div className="text-sm text-slate-900">{project.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{project.designer}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{project.client}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs capitalize ${getStatusColor(project.status)}`}>
                          {safeFormatString(project.status, 'concept')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs capitalize ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(project.deadline)}</div>
                          <div className={`text-xs ${daysLeft < 0 ? 'text-red-600' : daysLeft < 7 ? 'text-amber-600' : 'text-slate-900'}`}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : 
                             daysLeft === 0 ? 'Due today' : 
                             `${daysLeft} days left`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{project.revision_count}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProject(project.id)
                              setShowRevisions(true)
                            }}
                            className="text-xs"
                          >
                            View History
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revision History Modal/Panel */}
      {showRevisions && selectedProject && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Revision History - {projects.find(p => p.id === selectedProject)?.project_name}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowRevisions(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revisions
                .filter(rev => rev.project_id === selectedProject)
                .sort((a, b) => b.revision_number - a.revision_number)
                .map((revision) => (
                  <div key={revision.id} className="flex items-start space-x-4 p-4 border border-stone-200 rounded-md">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {revision.revision_number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-slate-900">{revision.description}</div>
                        <div className="text-sm text-slate-900">{formatDate(revision.created_at)}</div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-slate-900">by {revision.designer}</div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getStatusColor(revision.status)}`}>
                          {revision.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}