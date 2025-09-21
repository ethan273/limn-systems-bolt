/* eslint-disable @typescript-eslint/no-unused-vars */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient();
  
  try {
    const { stage_id, progress, notes } = await request.json();
    
    const { data: currentTracking } = await supabase
      .from('production_tracking')
      .select('*, production_stages(*)')
      .eq('order_id', id)
      .single();
    
    const updateData: Record<string, unknown> = {
      progress,
      updated_at: new Date().toISOString()
    };
    
    if (stage_id && stage_id !== currentTracking?.current_stage_id) {
      updateData.current_stage_id = stage_id;
      
      const history = currentTracking?.stage_history || [];
      history.push({
        stage: currentTracking?.production_stages?.name,
        timestamp: new Date().toISOString(),
        progress: 100
      });
      updateData.stage_history = history;
    }
    
    if (notes) {
      updateData.internal_notes = notes;
    }
    
    const { data: tracking, error } = await supabase
      .from('production_tracking')
      .update(updateData)
      .eq('order_id', id)
      .select('*, production_stages(*)')
      .single();
    
    if (error) throw error;
    
    const stageOrder = tracking.production_stages?.stage_order;
    let orderStatus = 'in_production';
    
    if (stageOrder === 1) orderStatus = 'confirmed';
    else if (stageOrder === 5 && progress === 100) orderStatus = 'shipping';
    else if (stageOrder === 4) orderStatus = 'quality_check';
    
    await supabase
      .from('orders')
      .update({ status: orderStatus })
      .eq('id', id);
    
    return NextResponse.json({ tracking });
    
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to update production tracking' },
      { status: 500 }
    );
  }
}
