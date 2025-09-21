import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/factory-reviews/sessions/[id]/offline-package
 * Generate and download offline package for factory review session
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

    // Fetch complete session data with all related records
    const { data: session, error: sessionError } = await supabase
      .from('factory_review_sessions')
      .select(`
        *,
        factory_review_participants(*),
        factory_review_notes(*),
        shop_drawing_files(*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching session for offline package:', sessionError);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Generate offline package data
    const offlinePackage = {
      packageInfo: {
        sessionId: session.id,
        sessionName: session.session_name,
        factoryName: session.factory_name,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email
      },
      sessionData: {
        id: session.id,
        session_name: session.session_name,
        factory_name: session.factory_name,
        status: session.status,
        scheduled_date: session.scheduled_date,
        prototype_count: session.prototype_count,
        reviewed_count: session.reviewed_count,
        approved_count: session.approved_count,
        rejected_count: session.rejected_count,
        session_notes: session.session_notes,
        created_at: session.created_at,
        updated_at: session.updated_at
      },
      participants: session.factory_review_participants || [],
      notes: session.factory_review_notes || [],
      shopDrawings: session.shop_drawing_files || [],
      instructions: {
        usage: "This offline package contains all data for the factory review session. Import this data when connection is restored.",
        lastSync: new Date().toISOString(),
        version: "1.0"
      }
    };

    // Create downloadable JSON package
    const packageJson = JSON.stringify(offlinePackage, null, 2);
    const fileName = `factory-review-offline-${session.session_name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(packageJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(packageJson, 'utf8').toString()
      }
    });

  } catch (error) {
    console.error('Error generating offline package:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}