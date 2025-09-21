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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Fetch project messages
    const { data: messages, error } = await supabase
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching project messages:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch project messages',
        data: [],
        tableExists: false
      }, { status: 500 });
    }

    return NextResponse.json({ 
      data: messages || [],
      tableExists: true
    });

  } catch (error) {
    console.error('Project messages API error:', error);
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
      message, 
      attachments, 
      parent_message_id, 
      mentions 
    } = body;

    if (!project_id || !message?.trim()) {
      return NextResponse.json({ 
        error: 'Project ID and message are required' 
      }, { status: 400 });
    }

    // Create the project message
    const { data: newMessage, error } = await supabase
      .from('project_messages')
      .insert([{
        project_id,
        sender_id: user.id,
        message: message.trim(),
        attachments: attachments || [],
        is_edited: false,
        is_deleted: false,
        parent_message_id: parent_message_id || null,
        mentions: mentions || [],
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating project message:', error);
      return NextResponse.json({ error: 'Failed to create project message' }, { status: 500 });
    }

    return NextResponse.json({ data: newMessage });

  } catch (error) {
    console.error('Project messages POST error:', error);
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
    const { id, message } = body;

    if (!id || !message?.trim()) {
      return NextResponse.json({ 
        error: 'Message ID and message content are required' 
      }, { status: 400 });
    }

    // Update the project message (only sender can edit)
    const { data: updatedMessage, error } = await supabase
      .from('project_messages')
      .update({
        message: message.trim(),
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('sender_id', user.id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) {
      console.error('Error updating project message:', error);
      return NextResponse.json({ error: 'Failed to update project message' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedMessage });

  } catch (error) {
    console.error('Project messages PUT error:', error);
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
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Soft delete the project message (only sender can delete)
    const { data: deletedMessage, error } = await supabase
      .from('project_messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('sender_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting project message:', error);
      return NextResponse.json({ error: 'Failed to delete project message' }, { status: 500 });
    }

    return NextResponse.json({ data: deletedMessage });

  } catch (error) {
    console.error('Project messages DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}