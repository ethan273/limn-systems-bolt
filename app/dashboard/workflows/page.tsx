'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { WorkflowCard } from '@/components/workflow-card'
import { WorkflowTemplateCard } from '@/components/workflow-template-card'
import { 
  Plus, 
  Search, 
  Activity,
  Clock,
  CheckCircle,
  Play,
  Zap
} from 'lucide-react'
import { safeFormatString } from '@/lib/utils/string-helpers'
import { Workflow } from '@/app/api/workflows/route'
import { WorkflowTemplate } from '@/app/api/workflows/templates/route'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadWorkflows()
    loadTemplates()
  }, [])

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows')
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data)
      }
    } catch (error) {
      console.error('Failed to load workflows:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/workflows/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWorkflow = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, enabled }),
      })

      if (response.ok) {
        setWorkflows(workflows.map(w => 
          w.id === id ? { ...w, enabled } : w
        ))
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error)
    }
  }

  const handleExecuteWorkflow = async (id: string) => {
    try {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: id,
          trigger_data: { test: true },
          test_mode: true
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Test execution result:', result)
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error)
    }
  }

  const handleInstallTemplate = async (template: WorkflowTemplate) => {
    try {
      const response = await fetch('/api/workflows/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: template.id,
          name: template.name,
          description: template.description
        }),
      })

      if (response.ok) {
        loadWorkflows() // Refresh workflows list
      }
    } catch (error) {
      console.error('Failed to install template:', error)
    }
  }

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      const response = await fetch(`/api/workflows?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setWorkflows(workflows.filter(w => w.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error)
    }
  }

  const filteredWorkflows = workflows.filter(workflow =>
    (workflow.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workflow.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTemplates = templates.filter(template =>
    (selectedCategory === 'all' || template.category === selectedCategory) &&
    ((template.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
     (template.description || "").toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))]

  // Calculate summary statistics
  const totalWorkflows = workflows.length
  const activeWorkflows = workflows.filter(w => w.enabled).length
  const totalRunsToday = workflows.reduce((sum, w) => sum + w.statistics.runs_today, 0)
  const avgSuccessRate = workflows.length > 0 
    ? Math.round(workflows.reduce((sum, w) => sum + w.statistics.success_rate, 0) / workflows.length)
    : 0
  const timeSavedHours = Math.round((totalRunsToday * 0.5) * 10) / 10 // Estimate 30 minutes saved per execution

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Workflow Automation</h1>
            <p className="text-slate-600">Automate your business processes</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading workflows...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="text-slate-600">Automate your business processes and save time</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Workflows</p>
                <p className="text-2xl font-bold text-blue-600">{activeWorkflows}</p>
                <p className="text-xs text-slate-500">of {totalWorkflows} total</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Executions Today</p>
                <p className="text-2xl font-bold text-green-600">{totalRunsToday}</p>
                <p className="text-xs text-slate-500">automated tasks</p>
              </div>
              <Play className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">{avgSuccessRate}%</p>
                <p className="text-xs text-slate-500">average</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Time Saved</p>
                <p className="text-2xl font-bold text-orange-600">{timeSavedHours}h</p>
                <p className="text-xs text-slate-500">today</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
          <Input
            placeholder="Search workflows and templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {safeFormatString(category, 'workflow')}
            </Button>
          ))}
        </div>
      </div>

      {/* Active Workflows */}
      {filteredWorkflows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Active Workflows</h2>
            <Badge variant="outline">
              {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onToggleEnabled={handleToggleWorkflow}
                onEdit={(id) => console.log('Edit workflow:', id)}
                onDuplicate={(id) => console.log('Duplicate workflow:', id)}
                onDelete={handleDeleteWorkflow}
                onViewLogs={(id) => window.open(`/dashboard/workflows/${id}/logs`, '_blank')}
                onExecute={handleExecuteWorkflow}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Start Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Quick Start Templates</h2>
            <p className="text-slate-600">Ready-to-use workflows for common processes</p>
          </div>
          <Badge variant="outline">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <WorkflowTemplateCard
              key={template.id}
              template={template}
              onInstall={handleInstallTemplate}
              onPreview={(template) => console.log('Preview template:', template)}
            />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredWorkflows.length === 0 && workflows.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Zap className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No workflows yet</h3>
            <p className="text-slate-600 mb-6">
              Get started by creating your first workflow or using a template
            </p>
            <div className="flex justify-center space-x-4">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}