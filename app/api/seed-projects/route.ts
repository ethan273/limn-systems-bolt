import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Use service role for admin operations by creating a new client with service role key
    const { createClient } = await import('@supabase/supabase-js')
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Sample design projects data with proper pipeline stages
    const sampleProjects = [
      {
        project_name: 'Modern Dining Chair',
        project_code: 'MDC-2024-01',
        current_stage: 'design',
        priority: 'high',
        budget: 25000,
        target_launch_date: '2024-12-01',
        designer_name: 'Sarah Chen',
        manufacturer_name: 'Furniture Co',
        next_action: 'Finalize initial sketches',
        days_in_stage: 12,
        user_id: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        project_name: 'Executive Desk Series',
        project_code: 'EDS-2024-02', 
        current_stage: 'design',
        priority: 'normal',
        budget: 45000,
        target_launch_date: '2024-11-15',
        designer_name: 'Mike Rodriguez',
        manufacturer_name: 'Premium Wood',
        next_action: 'Review material specifications',
        days_in_stage: 8,
        user_id: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        project_name: 'Ergonomic Office Chair',
        project_code: 'EOC-2024-03',
        current_stage: 'prototype',
        priority: 'urgent',
        budget: 35000,
        target_launch_date: '2024-10-30',
        designer_name: 'Lisa Park',
        manufacturer_name: 'Comfort Solutions',
        next_action: 'Test prototype durability',
        days_in_stage: 18,
        user_id: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        project_name: 'Modular Shelving Unit',
        project_code: 'MSU-2024-04',
        current_stage: 'prototype',
        priority: 'normal',
        budget: 20000,
        target_launch_date: '2024-12-15',
        designer_name: 'David Kim',
        manufacturer_name: 'Storage Plus',
        next_action: 'Refine joint mechanisms',
        days_in_stage: 25,
        user_id: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        project_name: 'Conference Table',
        project_code: 'CT-2024-05',
        current_stage: 'manufacturing',
        priority: 'high',
        budget: 55000,
        target_launch_date: '2024-11-01',
        designer_name: 'Emma Thompson',
        manufacturer_name: 'Corporate Furniture',
        next_action: 'Quality control inspection',
        days_in_stage: 35,
        user_id: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        project_name: 'Lounge Seating Set',
        project_code: 'LSS-2024-06',
        current_stage: 'production',
        priority: 'normal',
        budget: 40000,
        target_launch_date: '2024-10-20',
        designer_name: 'Alex Johnson',
        manufacturer_name: 'Comfort Designs',
        next_action: 'Production line setup',
        days_in_stage: 45,
        user_id: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        project_name: 'Standing Desk',
        project_code: 'SD-2024-07',
        current_stage: 'shipping',
        priority: 'low',
        budget: 30000,
        target_launch_date: '2024-09-30',
        designer_name: 'Rachel Green',
        manufacturer_name: 'Modern Office',
        next_action: 'Coordinate delivery logistics',
        days_in_stage: 5,
        user_id: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        project_name: 'Reception Furniture',
        project_code: 'RF-2024-08',
        current_stage: 'invoiced',
        priority: 'normal',
        budget: 38000,
        target_launch_date: '2024-09-15',
        designer_name: 'Tom Wilson',
        manufacturer_name: 'Business Interiors',
        next_action: 'Process final payment',
        days_in_stage: 2,
        user_id: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    // Clear existing data first
    await adminSupabase.from('design_projects').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert sample projects
    const { data, error } = await adminSupabase
      .from('design_projects')
      .insert(sampleProjects)
      .select()

    if (error) {
      console.error('Error seeding design projects:', error)
      return NextResponse.json({ 
        error: 'Failed to seed projects', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`Successfully seeded ${data?.length || 0} design projects`)
    return NextResponse.json({ 
      message: `Successfully seeded ${data?.length || 0} design projects`,
      projects: data 
    })

  } catch (error) {
    console.error('Seed projects error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}