'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Project {
  id: string
  name: string
  client_name: string
}

interface OrdersFiltersProps {
  statusFilter: string
  categoryFilter: string
  projectFilter: string
  projects: Project[]
  onStatusChange: (status: string) => void
  onCategoryChange: (category: string) => void
  onProjectChange: (projectId: string) => void
}

const OrdersFilters = React.memo(({
  statusFilter,
  categoryFilter,
  projectFilter,
  projects,
  onStatusChange,
  onCategoryChange,
  onProjectChange
}: OrdersFiltersProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="block text-sm font-medium text-heading mb-1">Status</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-sm font-medium text-heading mb-1">Category</Label>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="decking">Decking</SelectItem>
                <SelectItem value="cladding">Cladding</SelectItem>
                <SelectItem value="fixtures">Fixtures</SelectItem>
                <SelectItem value="custom_millwork">Custom Millwork</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-sm font-medium text-heading mb-1">Project</Label>
            <Select value={projectFilter} onValueChange={onProjectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project, index) => (
                  <SelectItem key={`filter-proj-${index}`} value={project.id || ''}>
                    {project.name || 'Unnamed Project'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

OrdersFilters.displayName = 'OrdersFilters'

export default OrdersFilters