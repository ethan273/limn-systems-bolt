/* eslint-disable @typescript-eslint/no-unused-vars */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        collection:collections(*),
        order_items(
          *,
          item:items(*)
        ),
        production_tracking(
          *,
          production_stage:production_stages(*)
        ),
        shipments(
          *,
          carrier:shipping_carriers(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (orderError) throw orderError;
    
    return NextResponse.json({ order });
    
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient();
  
  try {
    const updates = await request.json();
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    if (updates.status === 'shipping') {
      const { data: existingShipment } = await supabase
        .from('shipments')
        .select('id')
        .eq('order_id', id)
        .single();
      
      if (!existingShipment) {
        await supabase
          .from('shipments')
          .insert({
            order_id: id,
            status: 'processing'
          });
      }
    }
    
    return NextResponse.json({ order });
    
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
