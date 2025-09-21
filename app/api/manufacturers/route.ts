import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requirePermissions } from '@/lib/permissions/rbac';

/**
 * GET /api/manufacturers
 * Get all manufacturers
 */
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

    const supabase = await createServerSupabaseClient();

    // Parse query parameters for filtering
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log('Manufacturers API: Query params', { status, limit, offset })

    // Get manufacturers from manufacturers table
    let query = supabase
      .from('manufacturers')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Apply filters if specified
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: manufacturers, error } = await query

    if (error) {
      console.error('Manufacturers query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch manufacturers', details: error.message },
        { status: 500 }
      )
    }

    // Transform data to match the frontend interface
    const transformedManufacturers = (manufacturers || []).map((manufacturer: Record<string, unknown>) => {
      return {
        id: manufacturer.id as string,
        name: manufacturer.name as string || '',
        contact_name: manufacturer.contact_person as string || '',
        email: manufacturer.email as string || '',
        phone: manufacturer.phone as string || '',
        status: (manufacturer.status as string || 'approved') as 'prospect' | 'approved' | 'preferred' | 'suspended',
        capabilities: Array.isArray(manufacturer.specialties) ? manufacturer.specialties : [],
        rating: manufacturer.quality_rating as number || null,
        total_projects: Math.floor(Math.random() * 20) + 1, // Mock data - would query related projects
        active_projects: Math.floor(Math.random() * 5) + 1, // Mock data - would query active projects
        on_time_delivery: 85 + Math.floor(Math.random() * 15), // Mock data - would calculate from actual delivery data
        average_lead_time: manufacturer.lead_time_days as number || 30,
        last_project_date: new Date().toISOString(), // Mock data - would calculate from actual project dates
        created_at: manufacturer.created_at as string || new Date().toISOString()
      }
    })

    console.log('Manufacturers API: Success, returning', transformedManufacturers.length, 'manufacturers')

    return NextResponse.json({
      success: true,
      data: transformedManufacturers,
      total: transformedManufacturers.length
    })

  } catch (error) {
    console.error('Error in manufacturers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manufacturers
 * Create a new manufacturer
 */
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

    const supabase = await createServerSupabaseClient();

    const body = await request.json();

    // Create manufacturer
    const { data: manufacturer, error } = await supabase
      .from('manufacturers')
      .insert({
        name: body.name,
        contact_person: body.contact_person,
        email: body.contact_email || body.email,
        phone: body.contact_phone || body.phone,
        specialties: body.specialties || [],
        lead_time_days: body.lead_time_days || 30,
        quality_rating: body.quality_rating || 5.0,
        is_active: body.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating manufacturer:', error);
      return NextResponse.json({ error: 'Failed to create manufacturer' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: manufacturer }, { status: 201 });

  } catch (error) {
    console.error('Error in manufacturers POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
