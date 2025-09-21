import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/prototypes
 * Get all prototypes available for factory review
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we have a prototypes table, otherwise fall back to design projects
    let prototypes;

    // First try to get from proper prototypes table
    const { data: prototypeData, error: prototypeError } = await supabase
      .from('prototypes')
      .select(`
        id,
        name,
        prototype_code,
        status,
        manufacturer,
        collection_id,
        item_id,
        testing_phase,
        approval_stage,
        target_completion,
        created_at,
        collections (
          id,
          name,
          prefix
        ),
        items (
          id,
          name,
          base_price
        )
      `)
      .in('status', ['testing', 'review', 'approved'])
      .order('created_at', { ascending: false });

    if (!prototypeError && prototypeData) {
      // Use proper prototypes table data
      prototypes = prototypeData.map((prototype: Record<string, unknown>) => ({
        id: prototype.id,
        name: prototype.name,
        order_number: prototype.prototype_code,
        item_code: prototype.prototype_code,
        customer_name: prototype.manufacturer || 'N/A',
        production_status: prototype.status === 'approved' ? 'prototype_ready' : 'in_development',
        priority: prototype.target_completion && new Date(prototype.target_completion as string) < new Date() ? 'urgent' : 'normal',
        collection_name: (prototype.collections as Record<string, unknown>)?.name || '',
        item_name: (prototype.items as Record<string, unknown>)?.name || '',
        testing_phase: prototype.testing_phase,
        approval_stage: prototype.approval_stage
      }));
    } else {
      // Fallback to design projects if prototypes table doesn't exist or is empty
      const { data: designProjects, error } = await supabase
        .from('design_projects')
        .select('*')
        .in('current_stage', ['prototype', 'manufacturing', 'production'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching design projects:', error);
        return NextResponse.json({ error: 'Failed to fetch prototypes' }, { status: 500 });
      }

      // Convert design projects to prototype format
      prototypes = (designProjects || []).map((project: Record<string, unknown>) => ({
        id: project.id,
        name: project.project_name,
        order_number: project.project_code,
        item_code: project.project_code,
        customer_name: project.manufacturer_name || 'N/A',
        production_status: 'prototype_ready',
        priority: project.priority || 'normal'
      }));
    }

    return NextResponse.json(prototypes);

  } catch (error) {
    console.error('Error in prototypes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prototypes
 * Create a new prototype
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.collection_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, collection_id' },
        { status: 400 }
      );
    }

    // Create prototype data
    const prototypeData = {
      name: body.name,
      version: body.version || 'v1.0',
      collection_id: body.collection_id,
      item_id: body.item_id || null,
      status: body.status || 'draft',
      manufacturer: body.manufacturer_id || body.manufacturer || null,
      assigned_tester: body.assigned_tester || null,
      project_manager: body.project_manager || null,
      target_completion: body.target_completion || null,
      testing_phase: body.testing_phase || 'not_started',
      approval_stage: body.approval_stage || 'pending',
      cost_estimate: body.prototype_cost_estimate ? parseFloat(body.prototype_cost_estimate) : (body.cost_estimate ? parseFloat(body.cost_estimate) : 0),
      description: body.description || null,
      notes: body.notes || null,
      dimensions: {
        length: body.dimensions_length || null,
        width: body.dimensions_width || null,
        height: body.dimensions_height || null
      },
      specifications: {
        weight: body.weight || null,
        material: body.material || null,
        color: body.color || null,
        finish: body.finish || null
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id
    };

    // Try to insert into proper prototypes table first
    let prototype, error;

    try {
      const { data: prototypeResult, error: prototypeError } = await supabase
        .from('prototypes')
        .insert({
          // === CATALOG ITEM COMPATIBLE FIELDS ===
          name: prototypeData.name,
          description: prototypeData.description,
          category: body.category || 'Prototype',
          collection_id: prototypeData.collection_id,
          base_price: prototypeData.cost_estimate || 0,
          currency: 'USD',
          dimensions: prototypeData.dimensions,
          weight: parseFloat(prototypeData.specifications.weight) || null,
          materials: body.materials ? [prototypeData.specifications.material, prototypeData.specifications.finish].filter(Boolean) : [],
          lead_time_days: parseInt(body.lead_time_days) || 30,
          minimum_quantity: parseInt(body.minimum_quantity) || 1,
          is_active: false, // Prototypes start inactive
          is_custom: false,
          specifications: {
            ...prototypeData.specifications,
            color: prototypeData.specifications.color,
            finish: prototypeData.specifications.finish,
            prototype_version: prototypeData.version
          },
          images: body.images || [],

          // === PROTOTYPE-SPECIFIC FIELDS ===
          version: prototypeData.version,
          status: prototypeData.status,
          manufacturer: prototypeData.manufacturer,
          assigned_tester: prototypeData.assigned_tester,
          project_manager: prototypeData.project_manager,
          target_completion: prototypeData.target_completion,
          testing_phase: prototypeData.testing_phase,
          approval_stage: prototypeData.approval_stage,
          prototype_cost_estimate: prototypeData.cost_estimate,
          notes: prototypeData.notes,
          requirements: body.requirements || {},
          attachments: body.attachments || [],
          created_at: prototypeData.created_at,
          updated_at: prototypeData.updated_at,
          created_by: prototypeData.created_by
        })
        .select()
        .single();

      prototype = prototypeResult;
      error = prototypeError;
    } catch {
      // Fallback to design_projects table if prototypes table doesn't exist
      console.log('Prototypes table not found, falling back to design_projects');
      const { data: designResult, error: designError } = await supabase
        .from('design_projects')
        .insert({
          project_name: prototypeData.name,
          project_code: `PROTO-${Date.now()}`,
          current_stage: 'prototype',
          priority: 'normal',
          created_at: prototypeData.created_at,
          updated_at: prototypeData.updated_at,
          manufacturer_name: prototypeData.manufacturer,
          // Store prototype-specific data in a JSON field if available
          prototype_data: prototypeData
        })
        .select()
        .single();

      prototype = designResult;
      error = designError;
    }

    if (error) {
      console.error('Error creating prototype:', error);
      return NextResponse.json(
        { error: 'Failed to create prototype' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: prototype.id,
        name: prototype.name || prototype.project_name,
        prototype_code: prototype.prototype_code || prototype.project_code,
        status: prototype.status || 'draft',
        manufacturer: prototype.manufacturer || prototype.manufacturer_name,
        collection_id: prototype.collection_id,
        item_id: prototype.item_id,
        created_at: prototype.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in prototypes POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
