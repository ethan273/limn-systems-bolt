import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/factory-reviews/sessions/[id]/notes/[noteId]
 * Update status of a specific review note
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId, noteId } = await params;
    const body = await request.json();
    const { status, status_reason } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Update the note
    const { data, error } = await supabase
      .from('factory_review_notes')
      .update({
        status,
        status_reason: status_reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('session_id', sessionId) // Ensure note belongs to session
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Note status updated successfully'
    });

  } catch (error) {
    console.error('Error in update note API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}