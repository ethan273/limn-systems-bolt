import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['design.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    console.log('Design Team API: Fetching team dashboard data')

    // Fetch design projects
    const { data: projects, error: projectsError } = await supabase
      .from('design_projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch design briefs
    const { data: briefs, error: briefsError } = await supabase
      .from('design_briefs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch design-related tasks
    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    // Transform design projects to match frontend interface
    const transformedProjects = (projects || []).map((project: Record<string, unknown>) => ({
      id: project.id as string,
      name: project.project_name as string || '',
      status: (project.current_stage as string || 'planning') as 'planning' | 'in_progress' | 'review' | 'approved' | 'completed',
      designer_assigned: project.designer_name as string || 'Unassigned',
      client_name: 'Client Name', // Would need to join with clients table
      deadline: project.target_launch_date as string || null,
      created_at: project.created_at as string || new Date().toISOString(),
      updated_at: project.updated_at as string || new Date().toISOString(),
      priority: (project.priority as string || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
      brief_status: 'approved', // Mock data - would calculate from briefs
      deliverables_count: Math.floor(Math.random() * 8) + 1 // Mock data
    }))

    // Transform design briefs to match frontend interface
    const transformedBriefs = (briefs || []).map((brief: Record<string, unknown>) => ({
      id: brief.id as string,
      title: brief.title as string || '',
      status: (brief.approved_date ? 'approved' : 'pending') as 'pending' | 'approved' | 'rejected' | 'in_review',
      client_name: 'Client Name', // Would need to join with projects and clients
      created_at: brief.created_at as string || new Date().toISOString(),
      priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent' // Mock data
    }))

    // Filter and transform tasks for design team
    const designKeywords = ['design', 'brand', 'logo', 'mockup', 'prototype', 'ui', 'ux', 'visual', 'graphic', 'layout']
    const designTeamMembers = ['Sarah Chen', 'Mike Rodriguez', 'Emma Wilson', 'Alex Johnson']

    const designTasks = (allTasks || [])
      .filter((task: Record<string, unknown>) => {
        const title = (task.title as string || '').toLowerCase()
        const description = (task.description as string || '').toLowerCase()
        const assignedTo = task.assigned_to as string[] || []

        return designKeywords.some(keyword =>
          title.includes(keyword) || description.includes(keyword)
        ) || designTeamMembers.some(member =>
          assignedTo.includes(member)
        )
      })
      .slice(0, 10)
      .map((task: Record<string, unknown>) => ({
        id: task.id as string,
        title: task.title as string || '',
        status: (task.status as string || 'todo') as 'todo' | 'in_progress' | 'blocked' | 'review' | 'done',
        priority: (task.priority as string || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
        due_date: task.due_date as string || null,
        assigned_to: task.assigned_to as string[] || []
      }))

    console.log('Design Team API: Success, returning aggregated data', {
      projects: transformedProjects.length,
      briefs: transformedBriefs.length,
      tasks: designTasks.length
    })

    return NextResponse.json({
      success: true,
      data: {
        projects: transformedProjects,
        briefs: transformedBriefs,
        tasks: designTasks
      },
      errors: {
        projects: projectsError?.message || null,
        briefs: briefsError?.message || null,
        tasks: tasksError?.message || null
      }
    })

  } catch (error) {
    console.error('Design Team API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}