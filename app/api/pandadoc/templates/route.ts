/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    // Check user permissions
    const authResult = await requirePermissions(request, ['contracts.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const templateType = searchParams.get('template_type')
    const isActive = searchParams.get('is_active')

    // Check if pandadoc_templates table exists, if not return mock data
    let templates = []
    try {
      // Build query
      let query = supabase
        .from('pandadoc_templates')
        .select('*')
        .order('name', { ascending: true })

      // Add filters
      if (templateType) {
        query = query.eq('template_type', templateType)
      }
      
      if (isActive !== null) {
        query = query.eq('is_active', isActive === 'true')
      }

      const { data, error } = await query

      if (error && error.code === 'PGRST205') {
        // Table doesn't exist yet - return mock templates for development
        console.log('PandaDoc templates table not found. Returning mock data.')
        templates = getMockTemplates()
      } else if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      } else {
        templates = data || []
        
        // If no templates in database, return mock data
        if (templates.length === 0) {
          templates = getMockTemplates()
        }
      }
    } catch {
      console.log('PandaDoc templates integration not yet set up. Returning mock data.')
      templates = getMockTemplates()
    }

    // Apply filters to mock data if needed
    if (templateType && templates.length > 0) {
      templates = templates.filter((t: any) => t.template_type === templateType)
    }
    
    if (isActive !== null && templates.length > 0) {
      const activeFilter = isActive === 'true'
      templates = templates.filter((t: any) => t.is_active === activeFilter)
    }

    return NextResponse.json({
      success: true,
      templates: templates,
      data: templates // Support both formats
    })

  } catch (error) {
    console.error('Error fetching PandaDoc templates:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}

function getMockTemplates() {
  return [
    {
      id: '1',
      pandadoc_template_id: 'template_nda_standard',
      name: 'Standard NDA Template',
      template_type: 'nda',
      description: 'Standard Non-Disclosure Agreement for client projects',
      tags: ['standard', 'nda', 'confidentiality'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      pandadoc_template_id: 'template_msa_standard',
      name: 'Master Service Agreement',
      template_type: 'msa',
      description: 'Standard Master Service Agreement template',
      tags: ['msa', 'service', 'agreement'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      pandadoc_template_id: 'template_sow_design',
      name: 'Design Services SOW',
      template_type: 'sow',
      description: 'Statement of Work for design services',
      tags: ['sow', 'design', 'services'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '4',
      pandadoc_template_id: 'template_contract_standard',
      name: 'Standard Contract Template',
      template_type: 'contract',
      description: 'General contract template for services',
      tags: ['contract', 'standard', 'services'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '5',
      pandadoc_template_id: 'template_proposal_custom',
      name: 'Custom Proposal Template',
      template_type: 'proposal',
      description: 'Custom proposal template for new projects',
      tags: ['proposal', 'custom', 'projects'],
      is_active: false, // Inactive template for testing filters
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}