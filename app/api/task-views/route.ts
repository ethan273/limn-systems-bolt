import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch task views for the user
    const { data: taskViews, error } = await supabase
      .from('task_views')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching task views:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch task views',
        data: [],
        tableExists: false
      }, { status: 500 });
    }

    return NextResponse.json({ 
      data: taskViews || [],
      tableExists: true
    });

  } catch (error) {
    console.error('Task views API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      data: [],
      tableExists: false
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { view_type, filters, sort_config, column_visibility, is_default } = body;

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('task_views')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    // Create the task view
    const { data: newTaskView, error } = await supabase
      .from('task_views')
      .insert([{
        user_id: user.id,
        view_type,
        filters: filters || {},
        sort_config: sort_config || {},
        column_visibility: column_visibility || {},
        is_default: is_default || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating task view:', error);
      return NextResponse.json({ error: 'Failed to create task view' }, { status: 500 });
    }

    return NextResponse.json({ data: newTaskView });

  } catch (error) {
    console.error('Task views POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, view_type, filters, sort_config, column_visibility, is_default } = body;

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('task_views')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', id);
    }

    // Update the task view
    const { data: updatedTaskView, error } = await supabase
      .from('task_views')
      .update({
        view_type,
        filters: filters || {},
        sort_config: sort_config || {},
        column_visibility: column_visibility || {},
        is_default: is_default || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task view:', error);
      return NextResponse.json({ error: 'Failed to update task view' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedTaskView });

  } catch (error) {
    console.error('Task views PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}