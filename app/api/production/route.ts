import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requirePermissions } from '@/lib/permissions/rbac';

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['production.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const dateRange = searchParams.get('dateRange');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = await createServerSupabaseClient();
    
    if (orderId) {
      // Get specific order production status
      const { data, error } = await supabase
        .from('production_status')
        .select('*')
        .eq('order_id', orderId);
      
      if (error) throw error;
      return NextResponse.json(data);
    }
    
    // Get all production items with filters
    let query = supabase
      .from('production_status')
      .select('*')
      .limit(limit)
      .order('started_at', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      query = query.gte('started_at', startDate.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Production data error:', error);
      // Return empty array on error to allow mock data fallback
      return NextResponse.json([]);
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Production API error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['production.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const body = await request.json();
    const { orderItemId, stageId, notes } = body;

    // TODO: Implement productionService.updateProductionStage
    console.log('Production stage update request:', { orderItemId, stageId, notes });

    return NextResponse.json({ success: true, message: 'Not yet implemented' });
  } catch (error) {
    console.error('Production POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['production.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Add fields that can be updated
    if (body.status !== undefined) updateData.status = body.status
    if (body.production_status !== undefined) updateData.status = body.production_status
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.completed_quantity !== undefined) updateData.completed_quantity = body.completed_quantity
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.actual_start_date !== undefined) updateData.actual_start_date = body.actual_start_date
    if (body.actual_completion_date !== undefined) updateData.actual_completion_date = body.actual_completion_date

    const { data: production, error } = await supabase
      .from('production_status')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Production status update error:', error)
      return NextResponse.json(
        { error: 'Failed to update production status', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: production
    })

  } catch (error) {
    console.error('Production PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}