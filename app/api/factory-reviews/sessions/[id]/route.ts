import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/factory-reviews/sessions/[id]
 * Get a specific factory review session with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Fetch session data
    const { data: session, error } = await supabase
      .from('factory_review_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      console.error('Error fetching factory review session:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500 }
      );
    }

    return NextResponse.json(session);

  } catch (error) {
    console.error('Error in factory review session API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/factory-reviews/sessions/[id]
 * Update a factory review session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await request.json();

    const allowedFields = [
      'session_name',
      'scheduled_date',
      'status',
      'session_notes',
      'offline_package_downloaded',
      'offline_package_url',
      'prototype_count',
      'reviewed_count',
      'approved_count',
      'rejected_count'
    ];

    // Filter only allowed fields
    const updateData = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {} as Record<string, unknown>);

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // Handle status changes
    if (body.status) {
      if (body.status === 'in_progress' && !updateData.started_at) {
        updateData.started_at = new Date().toISOString();
      } else if (body.status === 'completed' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('factory_review_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating factory review session:', error);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('Error in factory review session update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/factory-reviews/sessions/[id]
 * Delete a factory review session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Check if session exists and can be deleted
    const { data: session, error: fetchError } = await supabase
      .from('factory_review_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to check session' },
        { status: 500 }
      );
    }

    // Don't allow deletion of active sessions
    if (session.status === 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot delete sessions that are in progress' },
        { status: 400 }
      );
    }

    // Delete the session (cascade will handle related records)
    const { error } = await supabase
      .from('factory_review_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting factory review session:', error);
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Error in factory review session deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
