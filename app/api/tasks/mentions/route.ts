import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { task_id, mentioned_users, message } = body

    if (!task_id || !mentioned_users || !Array.isArray(mentioned_users)) {
      return NextResponse.json({ 
        error: 'Missing required fields: task_id, mentioned_users' 
      }, { status: 400 })
    }


    // Get task details for notification context
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('title, description, created_by')
      .eq('id', task_id)
      .single()

    if (taskError) {
      console.error('Error fetching task for mentions:', taskError)
      return NextResponse.json({ 
        error: 'Task not found',
        details: taskError.message 
      }, { status: 404 })
    }

    // Create notifications for each mentioned user
    const notifications = mentioned_users.map(userId => ({
      user_id: userId,
      type: 'task_mention',
      title: `You were mentioned in "${task.title}"`,
      message: message || `${user.email} mentioned you in a task`,
      data: {
        task_id,
        task_title: task.title,
        mentioned_by: user.email,
        mentioned_by_id: user.id
      },
      read: false,
      created_at: new Date().toISOString()
    }))

    // Insert notifications (if notifications table exists)
    try {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)
        .select('*')

      if (notificationError) {
        console.warn('Notifications table may not exist:', notificationError)
        // Continue without failing - notifications are optional
      } else {
      }
    } catch (notifError) {
      console.warn('Could not create notifications:', notifError)
      // Continue without failing
    }

    // Update the task with mentioned users
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ 
        mentioned_users,
        updated_at: new Date().toISOString()
      })
      .eq('id', task_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating task with mentions:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update task with mentions',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        task: updatedTask,
        mentions_created: mentioned_users.length,
        notifications_sent: notifications.length
      },
      message: `Successfully mentioned ${mentioned_users.length} users`
    })

  } catch (error) {
    console.error('Task Mentions API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const taskId = url.searchParams.get('task_id')

    if (!taskId) {
      return NextResponse.json({ 
        error: 'Missing task_id parameter' 
      }, { status: 400 })
    }


    // Get task with mentioned users
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('mentioned_users, title')
      .eq('id', taskId)
      .single()

    if (taskError) {
      console.error('Error fetching task mentions:', taskError)
      return NextResponse.json({ 
        error: 'Task not found',
        details: taskError.message 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        task_id: taskId,
        task_title: task.title,
        mentioned_users: task.mentioned_users || [],
        mention_count: (task.mentioned_users || []).length
      }
    })

  } catch (error) {
    console.error('Task Mentions GET error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}