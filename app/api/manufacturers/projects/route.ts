import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const manufacturerId = searchParams.get('manufacturerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = await createServerSupabaseClient();
    
    let query = supabase
      .from('manufacturer_projects')
      .select(`
        *,
        manufacturer:manufacturers (
          id,
          company_name,
          contact_name,
          performance_rating
        ),
        order:orders (
          id,
          customer_order_number,
          customer:customers (
            id,
            name
          )
        ),
        shop_drawings (
          id,
          status,
          created_at,
          deadline,
          revision_count
        ),
        production_tracking (
          id,
          status,
          current_stage,
          started_at,
          estimated_completion
        ),
        qc_checkpoints (
          id,
          status,
          completed_at,
          checkpoint_name
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
      console.error('Manufacturer projects query error:', error);
      return NextResponse.json([]);
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Manufacturer projects API error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('manufacturer_projects')
      .insert([{
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating manufacturer project:', error);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Manufacturer project creation error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('manufacturer_projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating manufacturer project:', error);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Manufacturer project update error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}