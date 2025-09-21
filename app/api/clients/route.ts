/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')


    // Build query
    let query = supabase
      .from('clients')
      .select('*')
      .range(offset, offset + limit - 1)

    // Search filter if provided
    if (search) {
      query = query.or(`client_name.ilike.%${search}%,email.ilike.%${search}%,contact_name.ilike.%${search}%`)
    }

    const { data: clients, error: clientsError } = await query

    if (clientsError) {
      console.error('Clients query error:', clientsError)
      return NextResponse.json(
        { error: 'Failed to fetch clients', details: clientsError.message },
        { status: 500 }
      )
    }

    // Map database columns to frontend interface
    const mappedClients = clients?.map((client: any) => ({
      // Map database columns to frontend interface
      id: client.client_id,
      name: client.client_name,
      contactName: client.contact_name,
      email: client.email,
      phone: client.phone,
      status: client.status,
      creditTerms: client.credit_terms,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      // Keep original for debugging
      _original: client
    })) || []

    
    return NextResponse.json({ 
      success: true, 
      data: mappedClients
    })

  } catch (error) {
    console.error('Clients API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email' },
        { status: 400 }
      )
    }

    // Map frontend fields to database columns
    const clientData = {
      client_name: body.name,
      contact_name: body.contactName,
      email: body.email,
      phone: body.phone,
      status: body.status || 'active',
      credit_terms: body.creditTerms,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert the client
    const { data: client, error: insertError } = await supabase
      .from('clients')
      .insert([clientData])
      .select('*')
      .single()

    if (insertError) {
      console.error('Client creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create client', details: insertError.message },
        { status: 500 }
      )
    }

    // Map response back to frontend format
    const mappedClient = {
      id: client.client_id,
      name: client.client_name,
      contactName: client.contact_name,
      email: client.email,
      phone: client.phone,
      status: client.status,
      creditTerms: client.credit_terms,
      createdAt: client.created_at,
      updatedAt: client.updated_at
    }

    return NextResponse.json({ success: true, data: mappedClient }, { status: 201 })

  } catch (error) {
    console.error('Clients POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing client ID' },
        { status: 400 }
      )
    }


    // Map frontend fields to database columns
    const updateData = {
      client_name: body.name,
      contact_name: body.contactName,
      email: body.email,
      phone: body.phone,
      status: body.status,
      credit_terms: body.creditTerms,
      updated_at: new Date().toISOString()
    }

    // Update the client
    const { data: client, error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('client_id', body.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Client update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update client', details: updateError.message },
        { status: 500 }
      )
    }

    // Map response back to frontend format
    const mappedClient = {
      id: client.client_id,
      name: client.client_name,
      contactName: client.contact_name,
      email: client.email,
      phone: client.phone,
      status: client.status,
      creditTerms: client.credit_terms,
      createdAt: client.created_at,
      updatedAt: client.updated_at
    }

    return NextResponse.json({ success: true, data: mappedClient })

  } catch (error) {
    console.error('Clients PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const clientId = url.searchParams.get('id')
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing client ID' },
        { status: 400 }
      )
    }


    // Delete the client
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('client_id', clientId)

    if (deleteError) {
      console.error('Client deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete client', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Clients DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}