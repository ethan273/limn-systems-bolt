import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let query = supabase
      .from('project_timelines')
      .select('*')
      .order('start_date', { ascending: true });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: timelines, error } = await query;

    if (error) {
      console.error('Error fetching project timelines:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch project timelines',
        data: [],
        tableExists: false
      }, { status: 500 });
    }

    return NextResponse.json({ 
      data: timelines || [],
      tableExists: true
    });

  } catch (error) {
    console.error('Project timelines API error:', error);
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
    const { 
      project_id, 
      milestone_name, 
      milestone_type, 
      start_date, 
      end_date, 
      progress, 
      status, 
      dependencies, 
      assigned_to, 
      color, 
      notes 
    } = body;

    if (!project_id || !milestone_name || !start_date || !end_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id, milestone_name, start_date, end_date' 
      }, { status: 400 });
    }

    // Create the timeline milestone
    const { data: newMilestone, error } = await supabase
      .from('project_timelines')
      .insert([{
        project_id,
        milestone_name,
        milestone_type: milestone_type || 'milestone',
        start_date,
        end_date,
        progress: progress || 0,
        status: status || 'not_started',
        dependencies: dependencies || [],
        assigned_to: assigned_to || [],
        color: color || '#3b82f6',
        notes: notes || '',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating timeline milestone:', error);
      return NextResponse.json({ error: 'Failed to create timeline milestone' }, { status: 500 });
    }

    return NextResponse.json({ data: newMilestone });

  } catch (error) {
    console.error('Project timelines POST error:', error);
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
    const { 
      id,
      milestone_name, 
      milestone_type, 
      start_date, 
      end_date, 
      progress, 
      status, 
      dependencies, 
      assigned_to, 
      color, 
      notes 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Milestone ID is required' }, { status: 400 });
    }

    // Update the timeline milestone
    const { data: updatedMilestone, error } = await supabase
      .from('project_timelines')
      .update({
        milestone_name,
        milestone_type,
        start_date,
        end_date,
        progress: progress !== undefined ? progress : 0,
        status,
        dependencies: dependencies || [],
        assigned_to: assigned_to || [],
        color,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating timeline milestone:', error);
      return NextResponse.json({ error: 'Failed to update timeline milestone' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedMilestone });

  } catch (error) {
    console.error('Project timelines PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Milestone ID is required' }, { status: 400 });
    }

    // Delete the timeline milestone
    const { error } = await supabase
      .from('project_timelines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting timeline milestone:', error);
      return NextResponse.json({ error: 'Failed to delete timeline milestone' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Project timelines DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}