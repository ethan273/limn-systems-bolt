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

    // Fetch deal stages
    const { data: stages, error } = await supabase
      .from('deal_stages')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching deal stages:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch deal stages',
        data: [],
        tableExists: false
      }, { status: 500 });
    }

    return NextResponse.json({ 
      data: stages || [],
      tableExists: true
    });

  } catch (error) {
    console.error('Deal stages API error:', error);
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
    const { name, position, color, probability, is_active } = body;

    if (!name) {
      return NextResponse.json({ error: 'Stage name is required' }, { status: 400 });
    }

    // Create the deal stage
    const { data: newStage, error } = await supabase
      .from('deal_stages')
      .insert([{
        name,
        position: position || 0,
        color: color || '#3b82f6',
        probability: probability || 0,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating deal stage:', error);
      return NextResponse.json({ error: 'Failed to create deal stage' }, { status: 500 });
    }

    return NextResponse.json({ data: newStage });

  } catch (error) {
    console.error('Deal stages POST error:', error);
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
    const { id, name, position, color, probability, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Stage ID is required' }, { status: 400 });
    }

    // Update the deal stage
    const { data: updatedStage, error } = await supabase
      .from('deal_stages')
      .update({
        name,
        position,
        color,
        probability,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating deal stage:', error);
      return NextResponse.json({ error: 'Failed to update deal stage' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedStage });

  } catch (error) {
    console.error('Deal stages PUT error:', error);
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
      return NextResponse.json({ error: 'Stage ID is required' }, { status: 400 });
    }

    // Soft delete by setting is_active to false
    const { data: deletedStage, error } = await supabase
      .from('deal_stages')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting deal stage:', error);
      return NextResponse.json({ error: 'Failed to delete deal stage' }, { status: 500 });
    }

    return NextResponse.json({ data: deletedStage });

  } catch (error) {
    console.error('Deal stages DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}