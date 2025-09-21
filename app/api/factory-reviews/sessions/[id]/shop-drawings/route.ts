import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadFile, generateFilePath } from '@/lib/storage';

/**
 * GET /api/factory-reviews/sessions/[id]/shop-drawings
 * Get all shop drawings for a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { id: sessionId } = await params;

    // Use simplified shop_drawing_files table
    const { data: drawings, error } = await supabase
      .from('shop_drawing_files')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shop drawings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shop drawings' },
        { status: 500 }
      );
    }

    // Return drawings data directly
    return NextResponse.json(drawings || []);

  } catch (error) {
    console.error('Error in shop drawings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/factory-reviews/sessions/[id]/shop-drawings
 * Upload a new shop drawing for a session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { id: sessionId } = await params;
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const notes = formData.get('notes') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Upload file to Supabase Storage
    const filePath = generateFilePath('shop-drawings', file.name, user.id);
    const { url, error: uploadError } = await uploadFile('factory-reviews', file, filePath);

    if (uploadError) {
      console.error('Shop drawing upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload drawing: ${uploadError}` },
        { status: 500 }
      );
    }

    // Create shop drawing record
    const drawingData = {
      session_id: sessionId,
      file_name: file.name,
      file_url: url,
      version: 1,
      is_current: true,
      notes: notes || 'Shop drawing upload',
      created_by_name: user.user_metadata?.full_name || user.email || 'Unknown User',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('shop_drawing_files')
      .insert([drawingData])
      .select()
      .single();

    if (error) {
      console.error('Error uploading shop drawing:', error);
      return NextResponse.json(
        { error: 'Failed to upload drawing' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Shop drawing uploaded successfully'
    });

  } catch (error) {
    console.error('Error in upload shop drawing API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
