/* eslint-disable @typescript-eslint/no-unused-vars */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['projects.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }
    const { user } = authResult
    if (!user) {
      return NextResponse.json(
        { error: 'User context required' },
        { status: 401 }
      )
    }
    
    const supabase = await createServerSupabaseClient()

    // Get URL parameters for filtering
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const assignedTo = url.searchParams.get('assignedTo')
    const priority = url.searchParams.get('priority')

    console.log('Tasks API: Fetching tasks for user:', user.email, {
      status, assignedTo, priority
    })

    // Build query
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (assignedTo && assignedTo !== 'all') {
      query = query.eq('assigned_to', assignedTo)
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    const { data: tasks, error } = await query

    if (error) {
      
      // If table doesn't exist, return empty array with helpful message
      if (error.code === '42P01' || error.code === 'PGRST205') { // Table doesn't exist
        console.log('Tasks table does not exist, returning empty array')
        return NextResponse.json({
          success: true,
          data: [],
          message: 'Tasks table not found. Please create the tasks table first.',
          tableExists: false
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch tasks', details: error.message },
        { status: 500 }
      )
    }

    console.log('Tasks API: Found', tasks?.length || 0, 'tasks')
    return NextResponse.json({ success: true, data: tasks || [] })

  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['projects.create'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }
    const { user } = authResult
    if (!user) {
      return NextResponse.json(
        { error: 'User context required' },
        { status: 401 }
      )
    }
    
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    console.log('Tasks API: Creating new task:', body.title)

    // Prepare task data
    const taskData = {
      title: body.title,
      description: body.description || null,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      assigned_to: body.assignedTo || user.email,
      created_by: user.email,
      due_date: body.dueDate || null,
      project_id: body.projectId || null,
      department: body.department || 'admin',
      visibility: body.visibility || 'company',
      mentioned_users: body.mentioned_users || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select('*')
      .single()

    if (error) {
      
      // If table doesn't exist, return helpful message
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json(
          { error: 'Tasks table not found. Please create the tasks table first.', tableExists: false },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create task', details: error.message },
        { status: 500 }
      )
    }

    console.log('Tasks API: Created task:', task.id)
    return NextResponse.json({ success: true, data: task }, { status: 201 })

  } catch {
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['projects.update'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }
    const { user } = authResult
    
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing task ID' },
        { status: 400 }
      )
    }

    console.log('Tasks API: Updating task:', body.id)

    // Prepare update data
    const updateData = {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assigned_to: body.assignedTo,
      due_date: body.dueDate,
      project_id: body.projectId,
      department: body.department,
      visibility: body.visibility,
      mentioned_users: body.mentioned_users,
      updated_at: new Date().toISOString()
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if ((updateData as Record<string, unknown>)[key] === undefined) {
        delete (updateData as Record<string, unknown>)[key]
      }
    })

    // Update task
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', body.id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update task', details: error.message },
        { status: 500 }
      )
    }

    console.log('Tasks API: Updated task:', task.id)
    return NextResponse.json({ success: true, data: task })

  } catch {
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['projects.delete'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }
    const { user } = authResult
    
    const supabase = await createServerSupabaseClient()

    const url = new URL(request.url)
    const taskId = url.searchParams.get('id')
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing task ID' },
        { status: 400 }
      )
    }

    console.log('Tasks API: Deleting task:', taskId)

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

  } catch {
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}