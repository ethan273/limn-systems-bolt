import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/factory-reviews/sessions/[id]/participants
 * Get all participants for a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { id: sessionId } = await params;

    // Fetch participants for the session
    const { data: participants, error } = await supabase
      .from('factory_review_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      );
    }

    // Return participants data directly
    return NextResponse.json(participants || []);

  } catch (error) {
    console.error('Error in participants API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/factory-reviews/sessions/[id]/participants
 * Add a new participant to a session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { id: sessionId } = await params;
    const body = await request.json();

    const { name, email, role, company, can_approve, user_id } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if participant already exists by email
    const { data: existingParticipant } = await supabase
      .from('factory_review_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('email', email)
      .single();

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'Participant with this email is already in this session' },
        { status: 400 }
      );
    }

    // Add the participant
    const participantData = {
      session_id: sessionId,
      user_id: user_id || null,
      name,
      email,
      role: role || 'Participant',
      company: company || '',
      can_approve: can_approve || false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('factory_review_participants')
      .insert([participantData])
      .select()
      .single();

    if (error) {
      console.error('Error adding participant:', error);
      return NextResponse.json(
        { error: 'Failed to add participant' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Participant added successfully'
    });

  } catch (error) {
    console.error('Error in add participant API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
