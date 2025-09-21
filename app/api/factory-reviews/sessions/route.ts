import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/factory-reviews/sessions
 * Get all factory review sessions
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all sessions
    const { data: sessions, error } = await supabase
      .from('factory_review_sessions')
      .select(`
        *,
        factory_review_participants(
          name,
          role,
          company
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching factory review sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    // Format the response to match frontend expectations
    const formattedSessions = sessions?.map((session: Record<string, unknown>) => ({
      ...session,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      participants: (session.factory_review_participants as any)?.map((p: any) =>
        `${p.name} (${p.role})`
      ) || []
    })) || [];

    return NextResponse.json(formattedSessions);

  } catch (error) {
    console.error('Error in factory review sessions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/factory-reviews/sessions
 * Create a new factory review session
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      session_name,
      factory_name,
      scheduled_date,
      prototype_count,
      session_notes
    } = body;

    if (!session_name || !factory_name || !scheduled_date) {
      return NextResponse.json(
        { error: 'session_name, factory_name, and scheduled_date are required' },
        { status: 400 }
      );
    }

    // Create the session
    const sessionData = {
      session_name,
      factory_name,
      scheduled_date,
      prototype_count: prototype_count || 0,
      session_notes: session_notes || null,
      status: 'scheduled',
      reviewed_count: 0,
      approved_count: 0,
      rejected_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('factory_review_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('Error creating factory review session:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Session created successfully'
    });

  } catch (error) {
    console.error('Error in create factory review session API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}