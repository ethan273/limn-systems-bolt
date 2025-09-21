import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadFile, generateFilePath } from '@/lib/storage';

/**
 * GET /api/factory-reviews/sessions/[id]/notes
 * Get all review notes for a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { id: sessionId } = await params;

    // Fetch notes for the session
    const { data: notes, error } = await supabase
      .from('factory_review_notes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching review notes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    // Format the response
    const formattedNotes = notes?.map((note: Record<string, unknown>) => ({
      ...note,
      created_by_name: note.created_by_name || 'Unknown User',
      photos: note.photos || [] // JSON array of photo URLs
    })) || [];

    return NextResponse.json(formattedNotes);

  } catch (error) {
    console.error('Error in review notes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/factory-reviews/sessions/[id]/notes
 * Add a new review note for a session
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

    // Parse form data (including potential file uploads)
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const status = formData.get('status') as string;
    const statusReason = formData.get('status_reason') as string;

    if (!content || !status) {
      return NextResponse.json(
        { error: 'Content and status are required' },
        { status: 400 }
      );
    }

    // Handle photo uploads
    const photos = formData.getAll('photos') as File[];
    const uploadedPhotoUrls: string[] = [];

    // Upload photos to Supabase Storage
    for (const photo of photos) {
      if (photo instanceof File && photo.size > 0) {
        const filePath = generateFilePath('review-photos', photo.name, user.id);
        const { url, error: uploadError } = await uploadFile('factory-reviews', photo, filePath);

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          return NextResponse.json(
            { error: `Failed to upload photo: ${uploadError}` },
            { status: 500 }
          );
        }

        uploadedPhotoUrls.push(url);
      }
    }

    // Insert the note
    const noteData = {
      session_id: sessionId,
      content,
      status,
      status_reason: statusReason || null,
      created_by: user.id,
      created_by_name: user.user_metadata?.full_name || user.email || 'Unknown User',
      photos: uploadedPhotoUrls,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('factory_review_notes')
      .insert([noteData])
      .select()
      .single();

    if (error) {
      console.error('Error creating review note:', error);
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Note created successfully'
    });

  } catch (error) {
    console.error('Error in create review note API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
