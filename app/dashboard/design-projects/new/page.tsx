'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface FormData {
  project_name: string
  project_code: string
  current_stage: string
  priority: string
  budget: number
  target_launch_date: string
  designer_name: string
  manufacturer_name: string
  next_action: string
}

export default function NewDesignProjectPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    project_name: '',
    project_code: '',
    current_stage: 'brief_creation',
    priority: 'normal',
    budget: 0,
    target_launch_date: '',
    designer_name: '',
    manufacturer_name: '',
    next_action: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.project_name) {
      setError('Project name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/design-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create project')
      } else {
        // Redirect to the new project page
        router.push(`/dashboard/design-projects/${data.data.id}`)
      }
    } catch (err) {
      setError('Failed to create project')
      console.error('Create project error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New Design Project"
        description="Set up a new design project with timeline and requirements"
        actions={
          <Link href="/dashboard/design-projects">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="project_name">Project Name *</Label>
                <Input
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="project_code">Project Code</Label>
                <Input
                  id="project_code"
                  value={formData.project_code}
                  onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                  placeholder="e.g., PJ-2024-001"
                />
              </div>

              <div>
                <Label htmlFor="current_stage">Current Stage</Label>
                <Select
                  value={formData.current_stage}
                  onValueChange={(value) => setFormData({ ...formData, current_stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief_creation">Brief Creation</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="prototype">Prototype</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="target_launch_date">Target Launch Date</Label>
                <Input
                  id="target_launch_date"
                  type="date"
                  value={formData.target_launch_date}
                  onChange={(e) => setFormData({ ...formData, target_launch_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="designer_name">Designer Name</Label>
                <Input
                  id="designer_name"
                  value={formData.designer_name}
                  onChange={(e) => setFormData({ ...formData, designer_name: e.target.value })}
                  placeholder="Enter designer name"
                />
              </div>

              <div>
                <Label htmlFor="manufacturer_name">Manufacturer Name</Label>
                <Input
                  id="manufacturer_name"
                  value={formData.manufacturer_name}
                  onChange={(e) => setFormData({ ...formData, manufacturer_name: e.target.value })}
                  placeholder="Enter manufacturer name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="next_action">Next Action</Label>
              <Input
                id="next_action"
                value={formData.next_action}
                onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                placeholder="Describe the next action needed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Link href="/dashboard/design-projects">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="min-w-[120px]">
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Project'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}