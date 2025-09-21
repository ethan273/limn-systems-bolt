import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/manufacturers/[id]
 * Get a specific manufacturer by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get specific manufacturer
    const { data: manufacturer, error } = await supabase
      .from('manufacturers')
      .select(`
        id,
        name,
        contact_person,
        email,
        phone,
        specialties,
        lead_time_days,
        quality_rating,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 });
      }
      throw error;
    }

    // Format manufacturer for frontend
    const formattedManufacturer = {
      id: manufacturer.id,
      name: manufacturer.name,
      contact_person: manufacturer.contact_person || '',
      contact_email: manufacturer.email || '',
      contact_phone: manufacturer.phone || '',
      specialties: manufacturer.specialties || [],
      lead_time_days: manufacturer.lead_time_days || 30,
      quality_rating: manufacturer.quality_rating || 5.0,
      is_active: manufacturer.is_active,
      created_at: manufacturer.created_at,
      updated_at: manufacturer.updated_at
    };

    return NextResponse.json({ success: true, data: formattedManufacturer });

  } catch (error) {
    console.error('Error fetching manufacturer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manufacturer' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/manufacturers/[id]
 * Update a specific manufacturer
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Update manufacturer
    const updateData = {
      name: body.name,
      contact_person: body.contact_person,
      email: body.contact_email || body.email,
      phone: body.contact_phone || body.phone,
      specialties: body.specialties || [],
      lead_time_days: body.lead_time_days || 30,
      quality_rating: body.quality_rating || 5.0,
      is_active: body.is_active !== false,
      updated_at: new Date().toISOString()
    };

    const { data: manufacturer, error } = await supabase
      .from('manufacturers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: manufacturer });

  } catch (error) {
    console.error('Error updating manufacturer:', error);
    return NextResponse.json(
      { error: 'Failed to update manufacturer' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/manufacturers/[id]
 * Alias for PATCH
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params });
}

/**
 * DELETE /api/manufacturers/[id]
 * Delete a specific manufacturer (soft delete by setting is_active to false)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete by setting is_active to false
    const { data: manufacturer, error } = await supabase
      .from('manufacturers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Manufacturer deactivated successfully',
      data: manufacturer
    });

  } catch (error) {
    console.error('Error deleting manufacturer:', error);
    return NextResponse.json(
      { error: 'Failed to delete manufacturer' },
      { status: 500 }
    );
  }
}