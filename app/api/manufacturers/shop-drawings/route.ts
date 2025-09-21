import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const manufacturerId = searchParams.get('manufacturerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = await createServerSupabaseClient();
    
    let query = supabase
      .from('shop_drawings')
      .select(`
        *,
        manufacturer:manufacturers (
          id,
          company_name,
          contact_name
        ),
        project:manufacturer_projects (
          id,
          project_name,
          customer_name,
          total_value
        ),
        revisions:shop_drawing_revisions (
          id,
          revision_number,
          created_at,
          notes
        )
      `)
      .limit(limit)
      .order('created_at', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    
    if (manufacturerId) {
      query = query.eq('manufacturer_id', manufacturerId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Shop drawings query error:', error);
      return NextResponse.json([]);
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Shop drawings API error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('shop_drawings')
      .insert([body])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating shop drawing:', error);
      return NextResponse.json({ error: 'Failed to create shop drawing' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Shop drawing creation error:', error);
    return NextResponse.json({ error: 'Failed to create shop drawing' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes, reviewer_id } = body;
    const supabase = await createServerSupabaseClient();
    
    // Update shop drawing status
    const { data: updatedDrawing, error: updateError } = await supabase
      .from('shop_drawings')
      .update({
        status,
        reviewed_at: status !== 'pending' ? new Date().toISOString() : null,
        reviewer_id: status !== 'pending' ? reviewer_id : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating shop drawing:', updateError);
      return NextResponse.json({ error: 'Failed to update shop drawing' }, { status: 500 });
    }
    
    // If status is revision_requested or approved, create a revision record
    if ((status === 'revision_requested' || status === 'approved') && notes) {
      const { error: revisionError } = await supabase
        .from('shop_drawing_revisions')
        .insert([{
          shop_drawing_id: id,
          revision_number: updatedDrawing.revision_count + 1,
          status,
          notes,
          created_by: reviewer_id,
          created_at: new Date().toISOString()
        }]);
      
      if (revisionError) {
        console.error('Error creating revision:', revisionError);
      }
      
      // Update revision count
      await supabase
        .from('shop_drawings')
        .update({ revision_count: updatedDrawing.revision_count + 1 })
        .eq('id', id);
    }
    
    return NextResponse.json(updatedDrawing);
  } catch (error) {
    console.error('Shop drawing update error:', error);
    return NextResponse.json({ error: 'Failed to update shop drawing' }, { status: 500 });
  }
}