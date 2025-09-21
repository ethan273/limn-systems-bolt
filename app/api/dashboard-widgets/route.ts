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

    // Fetch dashboard widgets for the user
    const { data: widgets, error } = await supabase
      .from('personal_dashboard_widgets')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching dashboard widgets:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch dashboard widgets',
        data: [],
        tableExists: false
      }, { status: 500 });
    }

    return NextResponse.json({ 
      data: widgets || [],
      tableExists: true
    });

  } catch (error) {
    console.error('Dashboard widgets API error:', error);
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
    const { widget_type, position, size, config, is_visible } = body;

    // Create the dashboard widget
    const { data: newWidget, error } = await supabase
      .from('personal_dashboard_widgets')
      .insert([{
        user_id: user.id,
        widget_type,
        position: position || 0,
        size: size || 'medium',
        config: config || {},
        is_visible: is_visible !== undefined ? is_visible : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating dashboard widget:', error);
      return NextResponse.json({ error: 'Failed to create dashboard widget' }, { status: 500 });
    }

    return NextResponse.json({ data: newWidget });

  } catch (error) {
    console.error('Dashboard widgets POST error:', error);
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
    const { id, widget_type, position, size, config, is_visible } = body;

    // Update the dashboard widget
    const { data: updatedWidget, error } = await supabase
      .from('personal_dashboard_widgets')
      .update({
        widget_type,
        position,
        size: size || 'medium',
        config: config || {},
        is_visible: is_visible !== undefined ? is_visible : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating dashboard widget:', error);
      return NextResponse.json({ error: 'Failed to update dashboard widget' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedWidget });

  } catch (error) {
    console.error('Dashboard widgets PUT error:', error);
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
      return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 });
    }

    // Delete the dashboard widget
    const { error } = await supabase
      .from('personal_dashboard_widgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting dashboard widget:', error);
      return NextResponse.json({ error: 'Failed to delete dashboard widget' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Dashboard widgets DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}