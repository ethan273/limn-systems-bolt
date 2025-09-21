/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    // Validate user permissions
    const authResult = await requirePermissions(request, ['design.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Cannot access design data' },
        { status: authResult.statusCode || 403 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const user = authResult.user!

    console.log('Design Department API: Fetching design team data for user:', user.email)

    const departmentData = {
      projects: [] as unknown[],
      briefs: [] as unknown[],
      tasks: [] as unknown[],
      team_metrics: {
        active_projects: 0,
        pending_briefs: 0,
        completed_deliverables: 0,
        team_utilization: 0
      }
    }

    try {
      // Fetch design projects
      const { data: projects, error: projectsError } = await supabase
        .from('design_projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!projectsError) {
        departmentData.projects = projects || []
        departmentData.team_metrics.active_projects = projects?.filter((p: any) => 
          ['in_progress', 'review'].includes(p.status)
        ).length || 0
      } else {
        console.warn('Design projects table may not exist:', projectsError)
      }

      // Fetch design briefs
      const { data: briefs, error: briefsError } = await supabase
        .from('design_briefs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!briefsError) {
        departmentData.briefs = briefs || []
        departmentData.team_metrics.pending_briefs = briefs?.filter((b: any) => 
          b.status === 'pending'
        ).length || 0
      } else {
        console.warn('Design briefs table may not exist:', briefsError)
      }

      // Fetch design department tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('department', 'design')
        .order('created_at', { ascending: false })
        .limit(15)

      if (!tasksError) {
        departmentData.tasks = tasks || []
        departmentData.team_metrics.completed_deliverables = tasks?.filter((t: any) => 
          t.status === 'done'
        ).length || 0
      } else {
        console.warn('Tasks table may not exist or no design tasks found:', tasksError)
      }

      // Calculate team utilization (example calculation)
      const totalTasks = departmentData.tasks.length
       
      const completedTasks = departmentData.tasks.filter((t: any) => t?.status === 'done').length
      departmentData.team_metrics.team_utilization = totalTasks > 0 ? 
        Math.round((completedTasks / totalTasks) * 100) : 0

    } catch {
      console.log('Database connection issue. Design department will use fallback data.')
    }

    // If no real data, the frontend will use its own fallback data
    console.log('Design Department API: Returning data for', departmentData.projects.length, 'projects,', 
      departmentData.briefs.length, 'briefs,', departmentData.tasks.length, 'tasks')

    return NextResponse.json({
      success: true,
      data: departmentData,
      department: 'design',
      computed_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Design Department API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}