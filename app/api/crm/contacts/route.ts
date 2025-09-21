import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermissions(request, ['customers.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    let contacts: unknown[] = []
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          phone,
          company_name,
          type,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })

      if (error && error.code === 'PGRST205') {
        console.log('Customers table not yet created. Database empty.')
        contacts = []
      } else if (error) {
        console.error('Database error fetching contacts:', error)
        contacts = []
      } else {
        contacts = (data || []).map((contact: {
          id: string
          name: string
          email: string
          phone: string
          company_name: string
          type: string
          created_at: string
          updated_at: string
        }) => ({
          ...contact,
          company: contact.company_name || '',
          title: contact.type || '',
          industry: 'General',
          relationship_stage: 'prospect' as const,
          lifetime_value: 0,
          last_interaction: contact.updated_at || contact.created_at
        }))
      }
    } catch {
      console.log('Database connection issue. Database empty.')
      contacts = []
    }

    return NextResponse.json({
      success: true,
      data: contacts,
      count: contacts.length
    })

  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermissions(request, ['customers.write'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    const { name, email, company, title, phone, industry, relationship_stage } = body

    if (!name || !email) {
      return NextResponse.json({
        error: 'Missing required fields: name, email'
      }, { status: 400 })
    }

    const contactData = {
      name,
      email,
      phone: phone || '',
      company_name: company || '',
      type: title || 'Contact',
      address: body.address || '',
      status: 'active'
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([contactData])
        .select()

      if (error) {
        console.error('Database error creating contact:', error)
        return NextResponse.json({
          error: 'Failed to create contact',
          details: error.message
        }, { status: 500 })
      }

      const createdContact = {
        ...data[0],
        company: data[0].company_name,
        title: data[0].type,
        industry: industry || 'General',
        relationship_stage: relationship_stage || 'prospect',
        lifetime_value: 0,
        last_interaction: data[0].created_at
      }

      return NextResponse.json({
        success: true,
        data: createdContact,
        message: 'Contact created successfully'
      })
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        error: 'Database connection failed',
        details: 'Please check database configuration'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}