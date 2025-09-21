import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

interface Context {
  params: Promise<{ taskId: string }>
}

export async function GET(request: NextRequest, context: Context) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['projects.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    const { taskId } = await context.params

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch task', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: task })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['projects.update'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    const { taskId } = await context.params
    const body = await request.json()

    console.log('Tasks API: Updating task:', taskId, body)

    // Prepare update data, handling both camelCase and snake_case field names
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Map fields from request body
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) updateData.status = body.status
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to
    if (body.assignedTo !== undefined) updateData.assigned_to = body.assignedTo
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.dueDate !== undefined) updateData.due_date = body.dueDate
    if (body.project_id !== undefined) updateData.project_id = body.project_id
    if (body.projectId !== undefined) updateData.project_id = body.projectId
    if (body.department !== undefined) updateData.department = body.department
    if (body.visibility !== undefined) updateData.visibility = body.visibility
    if (body.mentioned_users !== undefined) updateData.mentioned_users = body.mentioned_users
    if (body.task_type !== undefined) updateData.task_type = body.task_type
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.completed_at !== undefined) updateData.completed_at = body.completed_at
    if (body.start_date !== undefined) updateData.start_date = body.start_date
    if (body.estimated_hours !== undefined) updateData.estimated_hours = body.estimated_hours
    if (body.actual_hours !== undefined) updateData.actual_hours = body.actual_hours
    if (body.position !== undefined) updateData.position = body.position
    if (body.is_archived !== undefined) updateData.is_archived = body.is_archived
    if (body.watchers !== undefined) updateData.watchers = body.watchers
    if (body.depends_on !== undefined) updateData.depends_on = body.depends_on
    if (body.blocks !== undefined) updateData.blocks = body.blocks

    // Update task
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update task', details: error.message },
        { status: 500 }
      )
    }

    console.log('Tasks API: Updated task:', task.id)
    return NextResponse.json({ success: true, data: task })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['projects.delete'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    const { taskId } = await context.params

    console.log('Tasks API: Deleting task:', taskId)

    // First check if task exists
    const { data: existingTask, error: checkError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .single()

    if (checkError || !existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Delete task
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete task', details: error.message },
        { status: 500 }
      )
    }

    console.log('Tasks API: Deleted task:', taskId)
    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
