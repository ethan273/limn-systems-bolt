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

    let clients: unknown[] = []
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
          status,
          address,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error && error.code === 'PGRST205') {
        console.log('Customers table not yet created. Database empty.')
        clients = []
      } else if (error) {
        console.error('Database error fetching clients:', error)
        clients = []
      } else {
        clients = (data || []).map((client: {
          id: string
          name: string
          email: string
          phone: string
          company_name: string
          type: string
          status: string
          address: string
          created_at: string
        }) => ({
          ...client,
          company: client.company_name
        }))
      }
    } catch {
      console.log('Database connection issue. Database empty.')
      clients = []
    }

    return NextResponse.json({
      success: true,
      data: clients,
      count: clients.length
    })

  } catch (error) {
    console.error('Error fetching clients:', error)
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

    const { name, email, phone, company, type, address } = body

    if (!name || !email) {
      return NextResponse.json({
        error: 'Missing required fields: name, email'
      }, { status: 400 })
    }

    const clientData = {
      name,
      email,
      phone: phone || '',
      company_name: company || '',
      type: type || 'Client',
      address: address || '',
      status: 'active'
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([clientData])
        .select()

      if (error) {
        console.error('Database error creating client:', error)
        return NextResponse.json({
          error: 'Failed to create client',
          details: error.message
        }, { status: 500 })
      }

      const createdClient = {
        ...data[0],
        company: data[0].company_name
      }

      return NextResponse.json({
        success: true,
        data: createdClient,
        message: 'Client created successfully'
      })
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        error: 'Database connection failed',
        details: 'Please check database configuration'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}