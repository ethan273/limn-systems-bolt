import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Raw Tasks API: Trying raw SQL query for user:', user.email)

    // Try raw SQL query instead of using .from()
    const { data: tasks, error } = await supabase.rpc('exec_sql', {
      sql: 'SELECT * FROM tasks ORDER BY created_at DESC'
    })

    if (error) {
      console.log('Raw SQL query failed, trying alternative approach')
      
      // Alternative: try using SQL function if available
      const { data: altResult, error: altError } = await supabase.rpc('get_tasks')
      
      if (altError) {
        return NextResponse.json({
          error: 'Tasks table still not accessible',
          details: error.message,
          altError: altError.message,
          suggestion: 'The PostgREST cache may need more time to refresh. Try waiting 10-15 minutes after creating the table.'
        }, { status: 500 })
      }
      
      return NextResponse.json({ success: true, data: altResult || [] })
    }

    console.log('Raw Tasks API: Found', tasks?.length || 0, 'tasks')
    return NextResponse.json({ success: true, data: tasks || [] })

  } catch (error) {
    console.error('Raw Tasks API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Raw Tasks API: Creating new task via SQL:', body.title)

    // Use raw SQL for insert
    const { data: task, error } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date, project_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      params: [
        body.title || 'Untitled Task',
        body.description || null,
        body.status || 'todo',
        body.priority || 'medium',
        body.assignedTo || user.email,
        user.email,
        body.dueDate || null,
        body.projectId || null
      ]
    })

    if (error) {
      console.error('Raw task creation error:', error)
      return NextResponse.json({
        error: 'Failed to create task via raw SQL',
        details: error.message
      }, { status: 500 })
    }

    console.log('Raw Tasks API: Created task via SQL')
    return NextResponse.json({ success: true, data: task }, { status: 201 })

  } catch (error) {
    console.error('Raw Tasks POST error:', error)
    return NextResponse.json({
      error: 'Failed to create task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}