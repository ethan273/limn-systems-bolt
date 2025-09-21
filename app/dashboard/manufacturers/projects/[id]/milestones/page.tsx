'use client'

import { useState, useEffect } from 'react'
// import { createClient } from '@/lib/supabase/client' - removed unused
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Edit,
  Plus,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface ProductionMilestone {
  id: string
  milestone_name: string
  milestone_type: string
  planned_date: string
  actual_date?: string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'skipped'
  completion_percentage: number
  notes?: string
  photos: string[]
}

export default function ProductionMilestonesPage() {
  const params = useParams()
  const projectId = params?.id as string
  
  const [milestones, setMilestones] = useState<ProductionMilestone[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)

  // const supabase = createClient() - removed unused

  useEffect(() => {
    loadMilestones()
  }, [projectId])

  const loadMilestones = async () => {
    setLoading(true)
    try {
      // Mock data - will connect to production_milestones table
      const mockMilestones: ProductionMilestone[] = [
        {
          id: '1',
          milestone_name: 'Materials Ordered',
          milestone_type: 'material_ordered',
          planned_date: '2024-03-01',
          actual_date: '2024-02-28',
          status: 'completed',
          completion_percentage: 100,
          notes: 'Oak lumber and hardware ordered from suppliers',
          photos: []
        },
        {
          id: '2',
          milestone_name: 'Production Started',
          milestone_type: 'production_started',
          planned_date: '2024-03-15',
          actual_date: '2024-03-14',
          status: 'completed',
          completion_percentage: 100,
          notes: 'Initial cutting and preparation began',
          photos: []
        },
        {
          id: '3',
          milestone_name: 'First Article Inspection',
          milestone_type: 'first_article',
          planned_date: '2024-03-20',
          status: 'in_progress',
          completion_percentage: 75,
          notes: 'Quality team reviewing first finished piece',
          photos: []
        },
        {
          id: '4',
          milestone_name: 'Halfway Complete',
          milestone_type: 'halfway_complete',
          planned_date: '2024-03-28',
          status: 'pending',
          completion_percentage: 0,
          photos: []
        },
        {
          id: '5',
          milestone_name: 'Quality Inspection',
          milestone_type: 'quality_inspection',
          planned_date: '2024-04-05',
          status: 'pending',
          completion_percentage: 0,
          photos: []
        },
        {
          id: '6',
          milestone_name: 'Production Complete',
          milestone_type: 'finished_production',
          planned_date: '2024-04-10',
          status: 'pending',
          completion_percentage: 0,
          photos: []
        },
        {
          id: '7',
          milestone_name: 'Packaged',
          milestone_type: 'packaged',
          planned_date: '2024-04-12',
          status: 'pending',
          completion_percentage: 0,
          photos: []
        },
        {
          id: '8',
          milestone_name: 'Shipped',
          milestone_type: 'shipped',
          planned_date: '2024-04-15',
          status: 'pending',
          completion_percentage: 0,
          photos: []
        }
      ]

      setMilestones(mockMilestones)
      setProjectName('Scandinavian Dining Chair - Prototype')
    } catch (error) {
      console.log('Error loading milestones:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      delayed: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-slate-900',
      skipped: 'bg-orange-100 text-orange-800'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'delayed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-slate-500" />
    }
  }

  const overallProgress = Math.round(
    milestones.reduce((sum, m) => sum + m.completion_percentage, 0) / milestones.length
  )

  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const delayedMilestones = milestones.filter(m => m.status === 'delayed').length

  if (loading) {
    return <div className="p-6">Loading production milestones...</div>
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
            <h1 className="text-2xl font-bold">Production Milestones</h1>
            <p className="text-slate-600">{projectName}</p>
          </div>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{overallProgress}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${overallProgress}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedMilestones}</div>
            <div className="text-sm text-slate-600">of {milestones.length} milestones</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {milestones.filter(m => m.status === 'in_progress').length}
            </div>
            <div className="text-sm text-slate-600">active milestones</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{delayedMilestones}</div>
            <div className="text-sm text-slate-600">behind schedule</div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Production Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="relative">
                {/* Timeline Line */}
                {index < milestones.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
                )}
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(milestone.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{milestone.milestone_name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Planned: {new Date(milestone.planned_date).toLocaleDateString()}</span>
                          </div>
                          {milestone.actual_date && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Actual: {new Date(milestone.actual_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(milestone.status)}>
                          {(milestone.status || 'pending').replace('_', ' ')}
                        </Badge>
                        {milestone.completion_percentage > 0 && milestone.status !== 'completed' && (
                          <div className="text-sm font-medium">
                            {milestone.completion_percentage}%
                          </div>
                        )}
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {milestone.status === 'in_progress' && milestone.completion_percentage > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div className="bg-blue-600 h-1 rounded-full transition-all duration-300" style={{ width: `${milestone.completion_percentage}%` }}></div>
                        </div>
                      </div>
                    )}
                    
                    {milestone.notes && (
                      <div className="mt-2 text-sm text-slate-600 bg-gray-50 p-2 rounded">
                        {milestone.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}