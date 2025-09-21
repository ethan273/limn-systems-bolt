/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Calendar, DollarSign, User, Building, BarChart3, Clock, CheckCircle, AlertTriangle, List, LayoutGrid, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { PageLoading } from '@/components/ui/enhanced-loading-states'
// Alert import removed - not used
import { ERROR_MESSAGES } from '@/lib/utils/dashboard-ui-standards'

interface PipelineProject {
  id: string
  project_name: string
  project_code: string
  stage: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  estimated_value: number
  target_date: string
  designer_name?: string
  manufacturer_name?: string
  next_action: string
  days_in_stage: number
}

export default function PipelinePage() {
  const [projects, setProjects] = useState<PipelineProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('kanban')
  const [, setError] = useState<string | null>(null)


  useEffect(() => {
    console.log('Pipeline: useEffect triggered, calling loadPipelineData')
    loadPipelineData()
  }, [])

  const loadPipelineData = async () => {
    console.log('Pipeline: loadPipelineData started')
    setLoading(true)
    setError(null)
    try {
      // Fetch real design projects from the API
      const response = await fetch('/api/design-projects', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Handle successful response with data
      if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
        // Map API response to pipeline project interface
        const mappedProjects: PipelineProject[] = data.data.map((project: unknown) => ({
          id: String(safeGet(project, ['id']) || ''),
          project_name: String(safeGet(project, ['project_name']) || ''),
          project_code: String(safeGet(project, ['project_code']) || ''),
          stage: (safeGet(project, ['current_stage']) as any) || 'design',
          priority: (safeGet(project, ['priority']) as any) || 'normal',
          estimated_value: Number(safeGet(project, ['budget']) || 0),
          target_date: String(safeGet(project, ['target_launch_date']) || new Date().toISOString()),
          designer_name: String(safeGet(project, ['designer_name']) || ''),
          manufacturer_name: String(safeGet(project, ['manufacturer_name']) || ''),
          next_action: String(safeGet(project, ['next_action']) || 'Review project details'),
          days_in_stage: Number(safeGet(project, ['days_in_stage']) || 0)
        }))

        setProjects(mappedProjects)
      } else {
        // No data available - show empty state
        setProjects([])
        setError(ERROR_MESSAGES.noData)
      }
    } catch (error) {
      console.error('Error loading pipeline data:', error)
      setError('Failed to load pipeline data. Please check your connection.')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const stages = ['design', 'prototype', 'manufacturing', 'production', 'shipping', 'invoiced']

  // Calculate stats
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => !['shipping', 'invoiced'].includes(p.stage)).length
  const completedProjects = projects.filter(p => p.stage === 'invoiced').length
  const urgentProjects = projects.filter(p => p.priority === 'urgent').length

  // Helper function to get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-green-100 text-green-800'
      case 'low': return 'bg-gray-100 text-slate-900'
      default: return 'bg-gray-100 text-slate-900'
    }
  }

  // Helper function to get stage badge color
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'design': return 'bg-blue-100 text-blue-800'
      case 'prototype': return 'bg-purple-100 text-purple-800'
      case 'manufacturing': return 'bg-yellow-100 text-yellow-800'
      case 'production': return 'bg-indigo-100 text-indigo-800'
      case 'shipping': return 'bg-orange-100 text-orange-800'
      case 'invoiced': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-slate-900'
    }
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Project Pipeline</h1>
          <p className="text-slate-600 text-lg mt-2">Track projects from design through delivery with dual view modes</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={loadPipelineData}
            variant="outline"
            className="flex items-center"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/dashboard/design-projects/new">
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-stone-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Projects</p>
                <p className="text-2xl font-bold text-slate-900">{totalProjects}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-stone-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-stone-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Projects</p>
                <p className="text-2xl font-bold text-blue-600">{activeProjects}</p>
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
                <p className="text-2xl font-bold text-green-600">{completedProjects}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-stone-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{urgentProjects}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Kanban View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        {/* Kanban View */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-6 gap-4">
            {stages.map(stage => {
              const stageProjects = projects.filter(p => p.stage === stage)
              return (
                <div key={stage} className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-medium capitalize text-slate-900">{stage}</h3>
                    <Badge variant="outline" className="bg-white text-slate-900 border-slate-300">{stageProjects.length}</Badge>
                  </div>
                  
                  <div className="space-y-3 min-h-96 bg-gray-50 p-3 rounded">
                    {stageProjects.map(project => (
                      <Card key={project.id} className="cursor-pointer hover:shadow-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{project.project_name}</CardTitle>
                          <p className="text-xs text-slate-600">{project.project_code}</p>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2 text-sm text-slate-900">
                            <div className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${(project.estimated_value || 0).toLocaleString()}
                            </div>
                            {project.designer_name && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {project.designer_name}
                              </div>
                            )}
                            {project.manufacturer_name && (
                              <div className="flex items-center">
                                <Building className="h-3 w-3 mr-1" />
                                {project.manufacturer_name}
                              </div>
                            )}
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(project.target_date).toLocaleDateString()}
                            </div>
                            <div className="pt-2 border-t">
                              <p className="font-medium text-slate-900">Next: {project.next_action}</p>
                              <p className="text-slate-900">{project.days_in_stage} days in stage</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Designer</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Target Date</TableHead>
                    <TableHead>Days in Stage</TableHead>
                    <TableHead>Next Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map(project => (
                    <TableRow key={project.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{project.project_name}</div>
                          <div className="text-sm text-slate-500">{project.project_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStageColor(project.stage)} variant="secondary">
                          {project.stage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(project.priority)} variant="secondary">
                          {project.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {(project.estimated_value || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {project.designer_name || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Building className="h-3 w-3 mr-1" />
                          {project.manufacturer_name || 'TBD'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(project.target_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {project.days_in_stage} days
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">{project.next_action}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}