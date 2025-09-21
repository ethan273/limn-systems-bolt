/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    // Validate user permissions
    const authResult = await requirePermissions(request, ['production.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden - Cannot access production data' },
        { status: authResult.statusCode || 403 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const user = authResult.user!

    console.log('Production Department API: Fetching production team data for user:', user.email)

    const departmentData = {
      production_queue: [] as unknown[],
      qc_results: [] as unknown[],
      milestones: [] as unknown[],
      tasks: [] as unknown[],
      production_metrics: {
        items_in_progress: 0,
        items_queued: 0,
        qc_pass_rate: 0,
        capacity_utilization: 0,
        on_time_delivery: 0
      }
    }

    try {
      // Fetch production tracking data
      const { data: production, error: productionError } = await supabase
        .from('production_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!productionError) {
        departmentData.production_queue = production || []
        departmentData.production_metrics.items_in_progress = production?.filter((p: any) => 
          p.status === 'in_progress'
        ).length || 0
        departmentData.production_metrics.items_queued = production?.filter((p: any) => 
          p.status === 'queued'
        ).length || 0
      } else {
        console.warn('Production tracking table may not exist:', productionError)
      }

      // Fetch QC tracking data
      const { data: qcResults, error: qcError } = await supabase
        .from('qc_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15)

      if (!qcError) {
        departmentData.qc_results = qcResults || []
        const totalQC = qcResults?.length || 0
        const passedQC = qcResults?.filter((q: any) => q.result === 'pass').length || 0
        departmentData.production_metrics.qc_pass_rate = totalQC > 0 ? 
          Math.round((passedQC / totalQC) * 100) : 0
      } else {
        console.warn('QC tracking table may not exist:', qcError)
      }

      // Fetch production milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from('production_milestones')
        .select('*')
        .order('target_date', { ascending: true })
        .limit(10)

      if (!milestonesError) {
        departmentData.milestones = milestones || []
      } else {
        console.warn('Production milestones table may not exist:', milestonesError)
      }

      // Fetch production department tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('department', 'production')
        .order('created_at', { ascending: false })
        .limit(15)

      if (!tasksError) {
        departmentData.tasks = tasks || []
      } else {
        console.warn('Tasks table may not exist or no production tasks found:', tasksError)
      }

      // Calculate capacity utilization (example calculation)
      const totalCapacity = 100 // Assume 100 item capacity
      const currentLoad = departmentData.production_metrics.items_in_progress + 
                         departmentData.production_metrics.items_queued
      departmentData.production_metrics.capacity_utilization = Math.min(
        Math.round((currentLoad / totalCapacity) * 100), 100
      )

      // Calculate on-time delivery (example - items completed vs overdue)
       
      const completedItems = departmentData.production_queue.filter((p: any) => 
        p?.status === 'completed'
      ).length
       
      const overdueItems = departmentData.production_queue.filter((p: any) => 
        p?.estimated_completion && 
        new Date(p.estimated_completion) < new Date() && 
        p?.status !== 'completed'
      ).length
      departmentData.production_metrics.on_time_delivery = completedItems > 0 ? 
        Math.round(((completedItems - overdueItems) / completedItems) * 100) : 100

    } catch {
      console.log('Database connection issue. Production department will use fallback data.')
    }

    console.log('Production Department API: Returning data for', 
      departmentData.production_queue.length, 'production items,', 
      departmentData.qc_results.length, 'QC results,', 
      departmentData.tasks.length, 'tasks')

    return NextResponse.json({
      success: true,
      data: departmentData,
      department: 'production',
      computed_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Production Department API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}